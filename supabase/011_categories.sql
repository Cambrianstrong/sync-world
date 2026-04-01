-- Admin-managed genre categories for browse page
CREATE TABLE IF NOT EXISTS categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  color text DEFAULT 'linear-gradient(135deg, #4b5563 0%, #9ca3af 100%)',
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Everyone can read categories
CREATE POLICY "Anyone can read categories" ON categories FOR SELECT USING (true);

-- Only admins can manage categories
CREATE POLICY "Admins can insert categories" ON categories FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "Admins can update categories" ON categories FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "Admins can delete categories" ON categories FOR DELETE USING (get_user_role() = 'admin');

-- Seed with the standard genres
INSERT INTO categories (name, color, sort_order) VALUES
  ('Hip-Hop', 'linear-gradient(135deg, #1a1a2e 0%, #3a3a5c 100%)', 1),
  ('R&B', 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)', 2),
  ('Pop', 'linear-gradient(135deg, #ec4899 0%, #f9a8d4 100%)', 3),
  ('Country', 'linear-gradient(135deg, #b45309 0%, #d97706 100%)', 4),
  ('Latin', 'linear-gradient(135deg, #dc2626 0%, #f87171 100%)', 5),
  ('Brazilian', 'linear-gradient(135deg, #059669 0%, #34d399 100%)', 6),
  ('Electronic', 'linear-gradient(135deg, #0891b2 0%, #22d3ee 100%)', 7),
  ('Afrobeats', 'linear-gradient(135deg, #d97706 0%, #fbbf24 100%)', 8),
  ('Rock', 'linear-gradient(135deg, #374151 0%, #6b7280 100%)', 9),
  ('Gospel', 'linear-gradient(135deg, #7c2d12 0%, #c2410c 100%)', 10),
  ('Jazz', 'linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%)', 11),
  ('Orchestral', 'linear-gradient(135deg, #581c87 0%, #9333ea 100%)', 12)
ON CONFLICT (name) DO NOTHING;
