import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { analyzeTrackFromUrl } from '@/lib/reccobeats';

/**
 * POST /api/tracks/analyze
 * Body: { trackId: string }
 *
 * Pulls a signed URL for the track's main audio file, sends it to Cyanite,
 * waits for the analysis, and writes results back to the tracks row.
 *
 * Stores everything in tracks.ai_tags (JSONB) and also populates top-level
 * columns (mood, energy, genre, bpm, key) when they exist. Run the SQL
 * migration in supabase/migrations/ai_tags.sql before using this.
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

  // Find a main/full file for this track
  const { data: files, error: filesErr } = await admin
    .from('track_files')
    .select('file_name, storage_path, version_type')
    .eq('track_id', trackId);

  if (filesErr || !files?.length) {
    return NextResponse.json({ error: 'No files found for track' }, { status: 404 });
  }

  // Prefer "main" version, otherwise fall back to the first file
  const main = files.find((f) => /main|full|master/i.test(f.version_type)) || files[0];

  // Create a signed URL Cyanite can fetch (valid 1 hour)
  const { data: signed, error: signErr } = await admin.storage
    .from('tracks')
    .createSignedUrl(main.storage_path, 3600);

  if (signErr || !signed?.signedUrl) {
    return NextResponse.json({ error: `Signed URL error: ${signErr?.message}` }, { status: 500 });
  }

  try {
    const tags = await analyzeTrackFromUrl(main.file_name, signed.signedUrl);

    // Write back. ai_tags is the source of truth; the rest are convenience columns.
    const update: Record<string, unknown> = {
      ai_tags: tags,
      ai_analyzed_at: new Date().toISOString(),
    };
    if (tags.mood) update.mood = tags.mood;
    if (tags.energy != null) update.energy = tags.energy;
    if (tags.genre) update.genre = tags.genre;
    if (tags.bpm != null) update.bpm = tags.bpm;
    if (tags.key) update.key = tags.key;

    const { error: updErr } = await admin.from('tracks').update(update).eq('id', trackId);
    if (updErr) {
      // If columns don't exist, still return the tags so the caller can surface them
      console.warn('tracks update failed (missing columns?):', updErr.message);
      return NextResponse.json({ success: true, tags, warning: updErr.message });
    }

    return NextResponse.json({ success: true, tags });
  } catch (err) {
    console.error('Cyanite analysis error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
