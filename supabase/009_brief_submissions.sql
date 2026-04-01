-- Track submissions to specific briefs
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS brief_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  brief_id uuid NOT NULL REFERENCES music_requests(id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  submitted_by uuid REFERENCES auth.users(id),
  submitted_by_name text,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(brief_id, track_id)
);

ALTER TABLE brief_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can insert submissions
CREATE POLICY "Authenticated users can submit to briefs"
  ON brief_submissions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Anyone authenticated can read submissions
CREATE POLICY "Authenticated users can read brief submissions"
  ON brief_submissions FOR SELECT USING (auth.uid() IS NOT NULL);
