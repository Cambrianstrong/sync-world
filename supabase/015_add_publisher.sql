-- Add publisher column to tracks
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS publisher TEXT;
