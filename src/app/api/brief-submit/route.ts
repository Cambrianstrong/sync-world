import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .limit(1)
    .maybeSingle();

  const body = await request.json();
  const { brief_id, track_ids, notes } = body;

  if (!brief_id || !track_ids || track_ids.length === 0) {
    return NextResponse.json({ error: 'Brief ID and at least one track required' }, { status: 400 });
  }

  const submissions = track_ids.map((trackId: string) => ({
    brief_id,
    track_id: trackId,
    submitted_by: user.id,
    submitted_by_name: profile?.full_name || user.email?.split('@')[0] || 'Unknown',
    notes: notes || null,
  }));

  const { data, error } = await supabase
    .from('brief_submissions')
    .upsert(submissions, { onConflict: 'brief_id,track_id' })
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log activity
  await supabase.from('activity_log').insert({
    type: 'submission',
    text: `${profile?.full_name || user.email} submitted ${track_ids.length} track(s) to a brief`,
    user_id: user.id,
  });

  return NextResponse.json({ success: true, count: data?.length || 0 });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const briefId = request.nextUrl.searchParams.get('briefId');
  if (!briefId) {
    return NextResponse.json({ error: 'briefId required' }, { status: 400 });
  }

  const { data: submissions } = await supabase
    .from('brief_submissions')
    .select('*, tracks:track_id(id, title, artist, writers, producers, genre, vocal, energy, bpm)')
    .eq('brief_id', briefId)
    .order('created_at', { ascending: false });

  return NextResponse.json({ submissions: submissions || [] });
}
