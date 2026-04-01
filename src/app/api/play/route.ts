import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const trackId = request.nextUrl.searchParams.get('trackId');

  if (!trackId) {
    return NextResponse.json({ error: 'Missing trackId' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Get the track itself to verify
  const { data: track } = await supabase
    .from('tracks')
    .select('id, title, artist, genre')
    .eq('id', trackId)
    .maybeSingle();

  if (!track) {
    return NextResponse.json({ error: 'Track not found', trackId }, { status: 404 });
  }

  // Get track files — only files that belong to THIS exact track
  const { data: files, error: filesError } = await supabase
    .from('track_files')
    .select('id, storage_path, version_type, file_name, track_id')
    .eq('track_id', trackId);

  if (filesError || !files || files.length === 0) {
    return NextResponse.json({
      error: 'No audio files found for this track',
      track: { id: track.id, title: track.title, artist: track.artist },
    }, { status: 404 });
  }

  // Prefer main version, then fall back to first file
  const mainFile = files.find(f => f.version_type === 'main') || files[0];

  // Verify this file actually belongs to the requested track
  if (mainFile.track_id !== trackId) {
    return NextResponse.json({
      error: 'File/track mismatch',
      expected: trackId,
      got: mainFile.track_id,
    }, { status: 500 });
  }

  // Generate signed URL
  const { data: urlData, error: urlError } = await supabase.storage
    .from('tracks')
    .createSignedUrl(mainFile.storage_path, 3600);

  if (urlError || !urlData?.signedUrl) {
    return NextResponse.json({
      error: 'Could not generate audio URL',
      debug: { urlError: urlError?.message, path: mainFile.storage_path },
    }, { status: 500 });
  }

  return NextResponse.json({
    signedUrl: urlData.signedUrl,
    track: { id: track.id, title: track.title, artist: track.artist, genre: track.genre },
    file: { name: mainFile.file_name, version: mainFile.version_type, path: mainFile.storage_path },
  });
}
