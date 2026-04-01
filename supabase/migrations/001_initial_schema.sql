-- Sync World Database Schema
-- ===========================

-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'producer', 'viewer')),
  company TEXT,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tracks (Catalog Master)
CREATE TABLE tracks (
  id TEXT PRIMARY KEY, -- e.g. 'SW-001'
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  writers TEXT,
  producers TEXT,
  status TEXT NOT NULL CHECK (status IN ('Released', 'Unreleased (Complete)', 'Demo (WIP)')),
  genre TEXT NOT NULL,
  subgenre TEXT,
  bpm INT,
  energy TEXT CHECK (energy IN ('Very High', 'High', 'Medium', 'Low')),
  mood TEXT,
  theme TEXT,
  vocal TEXT CHECK (vocal IN ('Male Vox', 'Female Vox', 'Duet', 'Group', 'Instrumental')),
  key TEXT,
  has_main BOOLEAN DEFAULT TRUE,
  has_clean BOOLEAN DEFAULT FALSE,
  has_inst BOOLEAN DEFAULT FALSE,
  has_acap BOOLEAN DEFAULT FALSE,
  label TEXT,
  splits TEXT,
  priority TEXT DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
  seasonal TEXT,
  download_url TEXT,
  lyrics TEXT,
  notes TEXT,
  sync_status TEXT DEFAULT 'none' CHECK (sync_status IN ('none', 'liked', 'chosen', 'placed')),
  download_count INT DEFAULT 0,
  submitted_by UUID REFERENCES profiles(id),
  date_added DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track audio files
CREATE TABLE track_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  version_type TEXT NOT NULL CHECK (version_type IN ('main', 'clean', 'instrumental', 'acapella')),
  file_name TEXT NOT NULL,
  file_size BIGINT,
  storage_path TEXT NOT NULL,
  format TEXT CHECK (format IN ('WAV', 'AIFF', 'MP3')),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Submissions (pitching batches to sync partners)
CREATE TABLE submissions (
  id TEXT PRIMARY KEY, -- e.g. 'SUB-001'
  date_sent DATE,
  recipient TEXT,
  email TEXT,
  platform TEXT CHECK (platform IN ('DISCO', 'Google Drive', 'Box', 'Other')),
  track_ids TEXT[],
  category TEXT,
  download_link TEXT,
  downloaded BOOLEAN DEFAULT FALSE,
  date_downloaded DATE,
  interest BOOLEAN DEFAULT FALSE,
  placement_offer BOOLEAN DEFAULT FALSE,
  placement_details TEXT,
  fee_offered TEXT,
  status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Followed Up', 'Placed', 'Passed')),
  follow_up_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts (sync partner relationships)
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT,
  company TEXT,
  email TEXT,
  phone TEXT,
  relationship TEXT CHECK (relationship IN ('Primary', 'Submission Contact', 'Decision Maker', 'Other')),
  last_contact DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity log
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('upload', 'download', 'interest', 'placed', 'submission')),
  text TEXT NOT NULL,
  track_id TEXT REFERENCES tracks(id),
  user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tracks_genre ON tracks(genre);
CREATE INDEX idx_tracks_status ON tracks(status);
CREATE INDEX idx_tracks_sync_status ON tracks(sync_status);
CREATE INDEX idx_tracks_submitted_by ON tracks(submitted_by);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX idx_track_files_track ON track_files(track_id);

-- Auto-generate track IDs
CREATE SEQUENCE track_id_seq START 5; -- start after seed data

CREATE OR REPLACE FUNCTION generate_track_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id IS NULL OR NEW.id = '' THEN
    NEW.id := 'SW-' || LPAD(nextval('track_id_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_track_id
BEFORE INSERT ON tracks
FOR EACH ROW EXECUTE FUNCTION generate_track_id();

-- Auto-generate submission IDs
CREATE SEQUENCE submission_id_seq START 2;

CREATE OR REPLACE FUNCTION generate_submission_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id IS NULL OR NEW.id = '' THEN
    NEW.id := 'SUB-' || LPAD(nextval('submission_id_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_submission_id
BEFORE INSERT ON submissions
FOR EACH ROW EXECUTE FUNCTION generate_submission_id();
