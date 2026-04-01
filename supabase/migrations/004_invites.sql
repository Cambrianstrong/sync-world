-- Invite-only signup system
-- Admins generate invite links with a role pre-assigned

CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  role TEXT NOT NULL CHECK (role IN ('producer', 'viewer')),
  email TEXT,  -- optional: lock to specific email
  label TEXT,  -- optional: description like "Warner Chappell team"
  used BOOLEAN DEFAULT FALSE,
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Admins can do everything with invites
CREATE POLICY "Admins manage invites" ON invites
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Anyone can read a specific invite by token (for signup page validation)
CREATE POLICY "Anyone can validate invite token" ON invites
  FOR SELECT USING (TRUE);
