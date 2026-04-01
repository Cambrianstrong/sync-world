-- Seed Data — Initial Catalog
-- ============================

INSERT INTO tracks (id, title, artist, writers, producers, status, genre, subgenre, bpm, energy, mood, theme, vocal, key, has_main, has_clean, has_inst, has_acap, label, splits, priority, seasonal, notes, sync_status, download_count, date_added)
VALUES
  ('SW-001', 'Rise Up', 'Felipe Hess', 'F. Hess / J. Santos', 'Cambrian', 'Unreleased (Complete)', 'Hip-Hop', 'Hip-Hop / Orchestral', 128, 'Very High', 'Determination, Grit', 'Confidence, Journey', 'Male Vox', 'Am', true, true, true, false, NULL, 'Pending', 'High', 'Summer', 'Strong sports energy, orchestral strings — FIFA / Nike target', 'none', 0, '2026-03-31'),
  ('SW-002', 'Golden Hour', 'Shayla', 'S. Williams', 'Cambrian', 'Unreleased (Complete)', 'R&B', 'R&B / Pop', 96, 'Medium', 'Warm, Uplifting', 'Self-love, Empowerment', 'Female Vox', 'Eb', true, true, true, true, NULL, 'Pending', 'High', 'Summer', 'Perfect for lifestyle / beauty brand summer campaigns', 'none', 0, '2026-03-31'),
  ('SW-003', 'Concrete Dreams', 'Cambrian', 'C. McElrath', 'Cambrian', 'Released', 'Hip-Hop', 'Boom Bap / Cinematic', 90, 'High', 'Cinematic, Intense', 'Hustle, Legacy', 'Male Vox', 'Dm', true, false, true, false, 'Sync World', '100%', 'Medium', 'Year-Round', 'Documentary / docu-series vibes, journey narrative', 'liked', 2, '2026-03-28'),
  ('SW-004', 'Saudade', 'Felipe Hess', 'F. Hess', 'F. Hess / Cambrian', 'Demo (WIP)', 'Brazilian', 'Brazilian / Hip-Hop fusion', 105, 'Medium', 'Nostalgic, Warm', 'Home, Memory', 'Male Vox', 'G', true, false, false, false, NULL, 'TBD', 'High', 'Summer', 'Brazilian fusion — exactly what Warner Chappell flagged as trending', 'none', 0, '2026-03-31');

-- Seed Contacts
INSERT INTO contacts (name, role, company, email, phone, relationship, last_contact, notes)
VALUES
  ('Kate Kresser', 'Coordinator, Creative Sync', 'Warner Chappell', 'kate.kresser@warnerchappell.com', '+1 (310) 480-2663', 'Primary', '2026-03-31', 'Met in person. Shared submission instructions.'),
  ('Kailey Tenn', 'Audio Assets', 'Warner Chappell', 'kailey.tenn@warnerchappell.com', NULL, 'Submission Contact', NULL, 'Send music to audioassets@ with sync team cc''d'),
  ('Danny Velez', 'Audio Assets', 'Warner Chappell', 'danny.velez@warnerchappell.com', NULL, 'Submission Contact', NULL, 'Send music to audioassets@ with sync team cc''d');

-- Seed Submissions
INSERT INTO submissions (id, date_sent, recipient, email, platform, track_ids, category, download_link, status, follow_up_date, notes)
VALUES
  ('SUB-001', '2026-03-31', 'Kailey Tenn / Danny Velez', 'audioassets@warnerchappell.com', 'Google Drive', ARRAY['SW-001','SW-002','SW-003'], 'Unreleased (Complete)', 'https://drive.google.com/...', 'Sent', '2026-04-07', 'Initial batch — summer sports energy, Brazilian tracks');
