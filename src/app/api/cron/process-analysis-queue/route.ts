import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { analyzeOneTrack } from '@/lib/analyze-track';

// Vercel cron triggers this endpoint every minute (see vercel.json).
// Each invocation drains up to BATCH_SIZE pending rows, processes them
// sequentially with a small delay between Reccobeats calls for rate limiting,
// and updates each queue row with success/failure state.

const BATCH_SIZE = 8; // tracks per cron tick
const MAX_ATTEMPTS = 3; // retries before giving up
const RECCOBEATS_DELAY_MS = 1500; // spacing between calls to avoid 429s

export const maxDuration = 60; // allow up to 60s on Vercel Pro

async function isAuthorized(request: NextRequest): Promise<boolean> {
  // 1. Vercel Cron / external cron services with secret
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization') || '';
    const querySecret = request.nextUrl.searchParams.get('secret') || '';
    if (authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret) {
      return true;
    }
  } else {
    // No secret configured — allow cron-style invocations
    if (request.headers.get('user-agent')?.includes('vercel-cron')) return true;
  }

  // 2. Admin user clicking "Process Queue" from the dashboard
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    return profile?.role === 'admin';
  } catch {
    return false;
  }
}

async function processQueue(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  // 1. Claim up to BATCH_SIZE pending rows by flipping them to 'processing'.
  //    Do this in two steps because Supabase JS doesn't support SKIP LOCKED.
  const { data: pending, error: pendErr } = await admin
    .from('analysis_queue')
    .select('id, track_id, attempts')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (pendErr) {
    return NextResponse.json({ error: pendErr.message }, { status: 500 });
  }
  if (!pending?.length) {
    return NextResponse.json({ drained: 0, ok: 0, failed: 0 });
  }

  const ids = pending.map((r) => r.id);
  await admin
    .from('analysis_queue')
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .in('id', ids);

  let ok = 0;
  let failed = 0;
  const errors: Array<{ trackId: string; error: string }> = [];

  for (const row of pending) {
    try {
      await analyzeOneTrack(admin, row.track_id);
      await admin
        .from('analysis_queue')
        .update({
          status: 'done',
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          attempts: row.attempts + 1,
        })
        .eq('id', row.id);
      ok++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const nextAttempts = row.attempts + 1;
      const finalStatus = nextAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending';
      await admin
        .from('analysis_queue')
        .update({
          status: finalStatus,
          attempts: nextAttempts,
          last_error: msg,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);
      failed++;
      errors.push({ trackId: row.track_id, error: msg });
    }

    // Rate limit between Reccobeats calls
    if (pending.indexOf(row) < pending.length - 1) {
      await new Promise((r) => setTimeout(r, RECCOBEATS_DELAY_MS));
    }
  }

  return NextResponse.json({ drained: pending.length, ok, failed, errors });
}

export async function GET(request: NextRequest) {
  return processQueue(request);
}

export async function POST(request: NextRequest) {
  return processQueue(request);
}
