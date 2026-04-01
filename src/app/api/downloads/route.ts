import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Get download activity for this user from activity_log
  const { data: downloads, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('user_id', user.id)
    .eq('type', 'download')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get unique track IDs from downloads
  const trackIds = [...new Set((downloads || []).map(d => d.track_id).filter(Boolean))];

  // Fetch track details for all downloaded tracks
  let tracks: any[] = [];
  if (trackIds.length > 0) {
    const { data: trackData } = await supabase
      .from('tracks')
      .select('id, title, artist, writers, producers, genre, subgenre, bpm, energy, mood, vocal, key')
      .in('id', trackIds);
    tracks = trackData || [];
  }

  // Build a map of track details
  const trackMap: Record<string, any> = {};
  tracks.forEach(t => { trackMap[t.id] = t; });

  // Combine download events with track details
  const result = (downloads || []).map(d => ({
    id: d.id,
    track_id: d.track_id,
    downloaded_at: d.created_at,
    track: d.track_id ? trackMap[d.track_id] || null : null,
  }));

  return NextResponse.json({ downloads: result });
}
