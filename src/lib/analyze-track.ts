import type { SupabaseClient } from '@supabase/supabase-js';
import { analyzeTrackFromUrl } from './reccobeats';

/**
 * Run Reccobeats analysis for one track and write the results to the
 * tracks row. Shared between POST /api/tracks/analyze (on-demand) and
 * /api/cron/process-analysis-queue (background worker).
 *
 * Throws on any failure (signed URL, Reccobeats, DB write). Callers are
 * responsible for queue bookkeeping.
 */
export async function analyzeOneTrack(
  admin: SupabaseClient,
  trackId: string
): Promise<{ tags: any }> {
  // Find a main/full file for this track
  const { data: files, error: filesErr } = await admin
    .from('track_files')
    .select('file_name, storage_path, version_type')
    .eq('track_id', trackId);

  if (filesErr) throw new Error(`track_files query failed: ${filesErr.message}`);
  if (!files?.length) throw new Error(`No files found for track ${trackId}`);

  const main =
    files.find((f: any) => /main|full|master/i.test(f.version_type)) || files[0];

  const { data: signed, error: signErr } = await admin.storage
    .from('tracks')
    .createSignedUrl(main.storage_path, 3600);

  if (signErr || !signed?.signedUrl) {
    throw new Error(`Signed URL error: ${signErr?.message || 'unknown'}`);
  }

  const tags = await analyzeTrackFromUrl(main.file_name, signed.signedUrl);

  // Existing schema constrains energy to ('Very High','High','Medium','Low')
  const energyBucket = (e: number | null): string | null => {
    if (e == null) return null;
    if (e >= 0.8) return 'Very High';
    if (e >= 0.6) return 'High';
    if (e >= 0.35) return 'Medium';
    return 'Low';
  };

  const update: Record<string, unknown> = {
    ai_tags: tags,
    ai_analyzed_at: new Date().toISOString(),
  };
  if (tags.mood) update.mood = tags.mood;
  const bucket = energyBucket(tags.energy);
  if (bucket) update.energy = bucket;
  if (tags.bpm != null) update.bpm = tags.bpm;
  if (tags.key) update.key = tags.key;

  const { error: updErr } = await admin.from('tracks').update(update).eq('id', trackId);
  if (updErr) throw new Error(`DB update failed: ${updErr.message}`);

  return { tags };
}

/**
 * Insert a track into the analysis queue. Safe to call multiple times —
 * the unique index on (track_id) where status in ('pending','processing')
 * prevents duplicate work. Returns true if inserted, false if a row was
 * already pending/processing.
 */
export async function enqueueTrackForAnalysis(
  admin: SupabaseClient,
  trackId: string
): Promise<boolean> {
  const { error } = await admin
    .from('analysis_queue')
    .insert({ track_id: trackId, status: 'pending' });
  if (!error) return true;
  // 23505 = unique_violation — already queued, which is fine
  if ((error as any).code === '23505') return false;
  throw new Error(`enqueue failed: ${error.message}`);
}
