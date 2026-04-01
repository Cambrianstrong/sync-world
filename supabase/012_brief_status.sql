-- Add status column to music_requests table
-- Allowed values: Open, In Review, Filled, Closed
ALTER TABLE music_requests
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Open'
  CHECK (status IN ('Open', 'In Review', 'Filled', 'Closed'));

-- Update existing rows to have 'Open' status
UPDATE music_requests SET status = 'Open' WHERE status IS NULL;
