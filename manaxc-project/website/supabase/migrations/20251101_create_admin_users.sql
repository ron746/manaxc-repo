-- Create admin_users table to track who has admin access
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id),
  UNIQUE(email)
);

-- Add RLS policies
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Allow admins to read all admin users
CREATE POLICY "Admins can read admin_users"
  ON admin_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );

-- Only allow system/existing admins to insert new admins
CREATE POLICY "Admins can insert admin_users"
  ON admin_users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- Add your email as the first admin (replace with your actual email)
-- You'll need to sign up first, then run this with your user_id
-- Example: INSERT INTO admin_users (user_id, email) VALUES ('your-user-id-here', 'your-email@example.com');
