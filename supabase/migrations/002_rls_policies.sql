-- Row Level Security Policies
-- ============================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Helper: check user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT USING (get_user_role() = 'admin');
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (id = auth.uid());

-- TRACKS
CREATE POLICY "Viewers and admins can browse all tracks"
  ON tracks FOR SELECT USING (get_user_role() IN ('viewer', 'admin'));
CREATE POLICY "Producers can see own tracks"
  ON tracks FOR SELECT USING (get_user_role() = 'producer' AND submitted_by = auth.uid());
CREATE POLICY "Producers can insert tracks"
  ON tracks FOR INSERT WITH CHECK (get_user_role() IN ('producer', 'admin'));
CREATE POLICY "Admins can update tracks"
  ON tracks FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "Producers can update own tracks"
  ON tracks FOR UPDATE USING (get_user_role() = 'producer' AND submitted_by = auth.uid());

-- TRACK FILES
CREATE POLICY "Anyone authenticated can read track files"
  ON track_files FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Producers and admins can upload files"
  ON track_files FOR INSERT WITH CHECK (get_user_role() IN ('producer', 'admin'));

-- SUBMISSIONS (admin only)
CREATE POLICY "Admins can manage submissions"
  ON submissions FOR ALL USING (get_user_role() = 'admin');

-- CONTACTS (admin only)
CREATE POLICY "Admins can manage contacts"
  ON contacts FOR ALL USING (get_user_role() = 'admin');

-- ACTIVITY LOG
CREATE POLICY "Admins can read all activity"
  ON activity_log FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Anyone can insert activity"
  ON activity_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Producers can see own activity"
  ON activity_log FOR SELECT USING (get_user_role() = 'producer' AND user_id = auth.uid());
