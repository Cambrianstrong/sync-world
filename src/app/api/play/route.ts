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

  // Get track files
  const { data: files, error: filesError } = await supabase
    .from('track_files')
    .select('storage_path, version_type')
    .eq('track_id', trackId);

  if (filesError || !files || files.length === 0) {
    return NextResponse.json({
      error: 'No audio files found',
      debug: { filesError: filesError?.message, trackId },
    }, { status: 404 });
  }

  // Prefer main version
  const mainFile = files.find(f => f.version_type === 'main') || files[0];

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

  return NextResponse.json({ signedUrl: urlData.signedUrl });
}
