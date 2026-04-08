-- AI tagging (Cyanite) results
-- Adds a JSONB blob with the full analysis and a timestamp. Top-level
-- mood/energy/genre/bpm/key columns are optional — only added if missing.

alter table public.tracks
  add column if not exists ai_tags jsonb,
  add column if not exists ai_analyzed_at timestamptz;

alter table public.tracks
  add column if not exists mood text,
  add column if not exists energy numeric,
  add column if not exists bpm integer,
  add column if not exists key text;

-- Useful index for querying by mood/genre inside ai_tags
create index if not exists tracks_ai_tags_moods_idx
  on public.tracks using gin ((ai_tags -> 'moods'));
create index if not exists tracks_ai_tags_genres_idx
  on public.tracks using gin ((ai_tags -> 'genres'));
