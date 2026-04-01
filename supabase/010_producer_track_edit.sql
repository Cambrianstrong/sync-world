-- Allow producers to update only their own tracks
CREATE POLICY "Producers can update own tracks"
  ON tracks FOR UPDATE
  USING (submitted_by = auth.uid() AND get_user_role() = 'producer')
  WITH CHECK (submitted_by = auth.uid() AND get_user_role() = 'producer');

-- Admins can update any track (if not already covered)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tracks' AND policyname = 'Admins can update all tracks'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can update all tracks" ON tracks FOR UPDATE USING (get_user_role() = ''admin'') WITH CHECK (get_user_role() = ''admin'')';
  END IF;
END $$;
