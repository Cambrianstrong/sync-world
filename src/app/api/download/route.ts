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

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();

  // Get track
  const { data: track } = await supabase
    .from('tracks')
    .select('id, title, artist, download_count')
    .eq('id', trackId)
    .maybeSingle();

  if (!track) {
    return NextResponse.json({ error: 'Track not found' }, { status: 404 });
  }

  // Get track files
  const { data: files } = await supabase
    .from('track_files')
    .select('storage_path, version_type, file_name')
    .eq('track_id', trackId);

  if (!files || files.length === 0) {
    return NextResponse.json({ error: 'No files for this track' }, { status: 404 });
  }

  // Prefer main version
  const file = files.find(f => f.version_type === 'main') || files[0];

  // Create a signed URL (valid for 1 hour)
  const { data: urlData, error: urlError } = await supabase.storage
    .from('tracks')
    .createSignedUrl(file.storage_path, 3600);

  if (urlError || !urlData?.signedUrl) {
    return NextResponse.json({ error: 'Could not generate download URL' }, { status: 500 });
  }

  const fileName = file.file_name || `${track.title} - ${track.artist}.mp3`;

  // Log activity and update count in background (don't block the response)
  supabase.from('activity_log').insert({
    type: 'download',
    text: `'${track.title}' downloaded by ${profile?.full_name || user.email}`,
    track_id: track.id,
    user_id: user.id,
  }).then(() => {});

  supabase.from('tracks')
    .update({ download_count: (track.download_count || 0) + 1 })
    .eq('id', track.id)
    .then(() => {});

  // Return the signed URL and filename so the client can fetch the blob directly
  return NextResponse.json({
    signedUrl: urlData.signedUrl,
    fileName,
  });
}
