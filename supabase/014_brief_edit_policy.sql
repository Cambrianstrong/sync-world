-- Allow viewers to update their own briefs
CREATE POLICY "Users can update own briefs"
  ON music_requests FOR UPDATE
  USING (user_id = auth.uid());
