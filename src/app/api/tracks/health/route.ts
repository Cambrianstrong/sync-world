import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

// Health check + auto-repair for the track pipeline.
// Catches problems the upload pipeline can't — like network drops mid-upload.
//
// What it checks:
// 1. Ghost tracks — track record exists but NO files in storage (delete the record)
// 2. Orphan records — track_files record exists but file missing from storage (delete the record)
// 3. Unlinked files — file exists in storage but no track_files record (create the record)
//
// Called automatically on admin page load, or manually via Repair button.

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

  const report = {
    ghostTracksDeleted: [] as { id: string; title: string }[],
    orphanRecordsDeleted: [] as { id: string; trackId: string; path: string }[],
    unlinkedFilesLinked: [] as { trackId: string; path: string }[],
    errors: [] as string[],
  };

  // Get all tracks and track_files
  const { data: tracks } = await admin
    .from('tracks')
    .select('id, title, artist')
    .order('created_at', { ascending: false });

  const { data: trackFiles } = await admin
    .from('track_files')
    .select('id, track_id, storage_path, version_type, file_name, format');

  if (!tracks) {
    return NextResponse.json({ error: 'Could not fetch tracks' }, { status: 500 });
  }

  const trackFilesByTrack = new Map<string, typeof trackFiles>();
  for (const tf of trackFiles || []) {
    const list = trackFilesByTrack.get(tf.track_id) || [];
    list.push(tf);
    trackFilesByTrack.set(tf.track_id, list);
  }

  // ── CHECK 1: Ghost tracks (no files in storage at all) ──
  for (const track of tracks) {
    const files = trackFilesByTrack.get(track.id);

    if (files && files.length > 0) continue; // has track_files records, check later

    // No track_files records — scan storage to see if files exist
    const versionTypes = ['main', 'clean', 'instrumental', 'acapella'];
    let anyFileFound = false;

    for (const vt of versionTypes) {
      const { data: storageFiles } = await admin.storage
        .from('tracks')
        .list(`${track.id}/${vt}`);

      const realFiles = (storageFiles || []).filter(f => f.name && f.name !== '.emptyFolderPlaceholder');

      if (realFiles.length > 0) {
        // Files exist but no track_files record — link them (Check 3)
        for (const sf of realFiles) {
          const storagePath = `${track.id}/${vt}/${sf.name}`;
          const ext = sf.name.split('.').pop()?.toUpperCase() || 'MP3';
          const format = ['WAV', 'AIFF', 'MP3', 'M4A', 'AAC', 'FLAC', 'OGG'].includes(ext) ? ext : 'MP3';

          const { error } = await admin.from('track_files').insert({
            track_id: track.id,
            version_type: vt,
            file_name: sf.name,
            file_size: sf.metadata?.size || 0,
            storage_path: storagePath,
            format,
          });

          if (error) {
            report.errors.push(`Link ${storagePath}: ${error.message}`);
          } else {
            report.unlinkedFilesLinked.push({ trackId: track.id, path: storagePath });
          }
        }
        anyFileFound = true;
      }
    }

    if (!anyFileFound) {
      // No files anywhere — this is a ghost track. Delete it.
      // Delete activity_log first (foreign key)
      await admin.from('activity_log').delete().eq('track_id', track.id);
      const { error } = await admin.from('tracks').delete().eq('id', track.id);

      if (error) {
        report.errors.push(`Delete ghost ${track.id}: ${error.message}`);
      } else {
        report.ghostTracksDeleted.push({ id: track.id, title: track.title });
      }
    }
  }

  // ── CHECK 2: Orphan track_files records (file missing from storage) ──
  for (const tf of trackFiles || []) {
    const folderPath = tf.storage_path.substring(0, tf.storage_path.lastIndexOf('/'));
    const fileName = tf.storage_path.split('/').pop();

    const { data: storageFiles } = await admin.storage
      .from('tracks')
      .list(folderPath);

    const exists = (storageFiles || []).some(f => f.name === fileName);

    if (!exists) {
      // track_files record points to a file that doesn't exist — delete the record
      const { error } = await admin.from('track_files').delete().eq('id', tf.id);

      if (error) {
        report.errors.push(`Delete orphan record ${tf.id}: ${error.message}`);
      } else {
        report.orphanRecordsDeleted.push({ id: tf.id, trackId: tf.track_id, path: tf.storage_path });
      }
    }
  }

  const totalFixed = report.ghostTracksDeleted.length
    + report.orphanRecordsDeleted.length
    + report.unlinkedFilesLinked.length;

  return NextResponse.json({
    healthy: totalFixed === 0 && report.errors.length === 0,
    fixed: totalFixed,
    ...report,
  });
}
