-- Add new music brief fields to music_requests table
-- Run this in the Supabase SQL Editor

ALTER TABLE music_requests ADD COLUMN IF NOT EXISTS brand text;
ALTER TABLE music_requests ADD COLUMN IF NOT EXISTS campaign_type text;
ALTER TABLE music_requests ADD COLUMN IF NOT EXISTS creative_themes text;
ALTER TABLE music_requests ADD COLUMN IF NOT EXISTS emotions text;
ALTER TABLE music_requests ADD COLUMN IF NOT EXISTS story_context text;
ALTER TABLE music_requests ADD COLUMN IF NOT EXISTS genre_blends text;
ALTER TABLE music_requests ADD COLUMN IF NOT EXISTS instrumentation text;
ALTER TABLE music_requests ADD COLUMN IF NOT EXISTS reference_artists text;
ALTER TABLE music_requests ADD COLUMN IF NOT EXISTS contact_name text;
ALTER TABLE music_requests ADD COLUMN IF NOT EXISTS contact_email text;
