import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

// Repair endpoint: finds tracks with no track_files records and
// scans storage to re-create the missing records
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  // Get all tracks
  const { data: tracks } = await admin
    .from('tracks')
    .select('id, title, artist')
    .order('date_added', { ascending: false });

  // Get all existing track_files
  const { data: existingFiles } = await admin
    .from('track_files')
    .select('track_id');

  const tracksWithFiles = new Set((existingFiles || []).map(f => f.track_id));
  const tracksNoFiles = (tracks || []).filter(t => !tracksWithFiles.has(t.id));

  if (tracksNoFiles.length === 0) {
    return NextResponse.json({ message: 'All tracks have files', repaired: 0, totalRepaired: 0 });
  }

  const repaired: { trackId: string; title: string; filesFound: number }[] = [];
  const failed: { trackId: string; title: string; error: string }[] = [];

  for (const track of tracksNoFiles) {
    const versionTypes = ['main', 'clean', 'instrumental', 'acapella'];
    let filesFound = 0;

    for (const versionType of versionTypes) {
      const folderPath = `${track.id}/${versionType}`;
      const { data: storageFiles, error: listError } = await admin.storage
        .from('tracks')
        .list(folderPath);

      if (listError || !storageFiles || storageFiles.length === 0) continue;

      for (const sf of storageFiles) {
        if (sf.name === '.emptyFolderPlaceholder' || !sf.name) continue;

        const storagePath = `${folderPath}/${sf.name}`;
        const ext = sf.name.split('.').pop()?.toUpperCase() || 'MP3';
        const format = ['WAV', 'AIFF', 'MP3', 'M4A', 'AAC', 'FLAC', 'OGG'].includes(ext) ? ext : 'MP3';

        const { error: insertError } = await admin.from('track_files').insert({
          track_id: track.id,
          version_type: versionType,
          file_name: sf.name,
          file_size: sf.metadata?.size || 0,
          storage_path: storagePath,
          format,
        });

        if (insertError) {
          failed.push({ trackId: track.id, title: track.title, error: insertError.message });
        } else {
          filesFound++;
        }
      }
    }

    if (filesFound > 0) {
      repaired.push({ trackId: track.id, title: track.title, filesFound });
    }
  }

  return NextResponse.json({
    tracksChecked: tracksNoFiles.length,
    repaired,
    failed,
    totalRepaired: repaired.length,
  });
}
