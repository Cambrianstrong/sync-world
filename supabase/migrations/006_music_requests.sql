-- Music request table: viewers submit what type of music they need
CREATE TABLE music_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  user_email TEXT,
  genre TEXT,
  subgenre TEXT,
  energy TEXT,
  mood TEXT,
  theme TEXT,
  vocal TEXT,
  bpm_min INT,
  bpm_max INT,
  description TEXT,
  project TEXT,
  deadline TEXT,
  reference TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'fulfilled', 'closed')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE music_requests ENABLE ROW LEVEL SECURITY;

-- Viewers can create and read their own requests
CREATE POLICY "Users can insert music requests"
  ON music_requests FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can read own requests"
  ON music_requests FOR SELECT USING (user_id = auth.uid());

-- Admins can see and manage all requests
CREATE POLICY "Admins can manage all requests"
  ON music_requests FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
