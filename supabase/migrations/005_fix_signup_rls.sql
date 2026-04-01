-- Allow newly signed-up users to create their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- Allow newly signed-up users to mark their invite as used
CREATE POLICY "Authenticated users can update invites they used"
  ON invites FOR UPDATE USING (TRUE) WITH CHECK (used_by = auth.uid());
