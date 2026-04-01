import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Debug endpoint: shows track-to-file mappings so we can find mismatches
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Check if admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  // Get all tracks with their files
  const { data: tracks } = await supabase
    .from('tracks')
    .select('id, title, artist, genre')
    .order('date_added', { ascending: false })
    .limit(100);

  const { data: files } = await supabase
    .from('track_files')
    .select('id, track_id, version_type, file_name, storage_path');

  // Build mapping
  const filesByTrack: Record<string, typeof files> = {};
  const orphanFiles: typeof files = [];

  if (files) {
    const trackIds = new Set((tracks || []).map(t => t.id));
    for (const f of files) {
      if (!trackIds.has(f.track_id)) {
        orphanFiles.push(f);
      }
      if (!filesByTrack[f.track_id]) filesByTrack[f.track_id] = [];
      filesByTrack[f.track_id]!.push(f);
    }
  }

  // Find tracks with no files
  const tracksNoFiles = (tracks || []).filter(t => !filesByTrack[t.id] || filesByTrack[t.id]!.length === 0);

  // Find potential mismatches: file_name doesn't seem related to track title
  const suspectMismatches: { track: string; trackTitle: string; fileName: string; storagePath: string }[] = [];
  for (const track of (tracks || [])) {
    const trackFiles = filesByTrack[track.id] || [];
    for (const f of trackFiles) {
      // Check if file is stored under a DIFFERENT track's folder
      const pathTrackId = f.storage_path.split('/')[0];
      if (pathTrackId !== track.id) {
        suspectMismatches.push({
          track: track.id,
          trackTitle: track.title,
          fileName: f.file_name,
          storagePath: f.storage_path,
        });
      }
    }
  }

  return NextResponse.json({
    totalTracks: (tracks || []).length,
    totalFiles: (files || []).length,
    tracksWithNoFiles: tracksNoFiles.map(t => ({ id: t.id, title: t.title, artist: t.artist })),
    orphanFiles: orphanFiles?.map(f => ({ id: f.id, trackId: f.track_id, fileName: f.file_name })),
    suspectMismatches,
    trackFileMap: (tracks || []).map(t => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      genre: t.genre,
      files: (filesByTrack[t.id] || []).map(f => ({
        version: f.version_type,
        fileName: f.file_name,
        path: f.storage_path,
      })),
    })),
  });
}
