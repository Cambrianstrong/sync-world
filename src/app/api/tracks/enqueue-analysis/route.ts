import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { enqueueTrackForAnalysis } from '@/lib/analyze-track';

/**
 * POST /api/tracks/enqueue-analysis
 * Body: { trackId: string }
 *
 * Inserts a row into analysis_queue. The Vercel cron worker
 * (/api/cron/process-analysis-queue) drains it every minute.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || !['admin', 'producer/songwriter'].includes(profile.role)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const { trackId } = await request.json();
  if (!trackId) return NextResponse.json({ error: 'Missing trackId' }, { status: 400 });

  try {
    const inserted = await enqueueTrackForAnalysis(admin, trackId);
    return NextResponse.json({ success: true, inserted });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
