import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const body = await request.json();
  const trackIds: string[] = Array.isArray(body.trackIds) ? body.trackIds : [body.trackId].filter(Boolean);

  if (trackIds.length === 0) {
    return NextResponse.json({ error: 'No track IDs provided' }, { status: 400 });
  }

  const errors: string[] = [];

  for (const trackId of trackIds) {
    // Get storage paths
    const { data: files } = await supabase
      .from('track_files')
      .select('storage_path')
      .eq('track_id', trackId);

    // Delete files from storage
    if (files && files.length > 0) {
      const paths = files.map(f => f.storage_path).filter(Boolean);
      if (paths.length > 0) {
        await supabase.storage.from('tracks').remove(paths);
      }
    }

    // Delete related records
    await supabase.from('track_files').delete().eq('track_id', trackId);
    await supabase.from('activity_log').delete().eq('track_id', trackId);

    // Delete the track
    const { error } = await supabase.from('tracks').delete().eq('id', trackId);
    if (error) errors.push(`${trackId}: ${error.message}`);
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join('; '), deleted: trackIds.length - errors.length }, { status: 500 });
  }

  return NextResponse.json({ success: true, deleted: trackIds.length });
}
