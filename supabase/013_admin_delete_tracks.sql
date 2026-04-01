-- Allow admins to delete tracks
CREATE POLICY "Admins can delete tracks"
  ON tracks FOR DELETE
  USING (get_user_role() = 'admin');

-- Allow admins to delete track files (cleanup)
CREATE POLICY "Admins can delete track files"
  ON track_files FOR DELETE
  USING (get_user_role() = 'admin');
