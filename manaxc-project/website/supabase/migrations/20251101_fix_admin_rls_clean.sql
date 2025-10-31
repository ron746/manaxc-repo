-- Clean fix for admin_users RLS policies
-- Drop ALL existing policies first to ensure clean state
DROP POLICY IF EXISTS "Admins can read admin_users" ON admin_users;
DROP POLICY IF EXISTS "Admins can insert admin_users" ON admin_users;
DROP POLICY IF EXISTS "Users can check their own admin status" ON admin_users;
DROP POLICY IF EXISTS "Admins can read all admin_users" ON admin_users;

-- Policy 1: Allow users to check if THEY are an admin (read their own record)
-- This is critical - users must be able to read their own record to verify admin status
CREATE POLICY "Users can check their own admin status"
  ON admin_users FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Allow existing admins to read all admin users
-- This allows admins to see the full list of admins
CREATE POLICY "Admins can read all admin_users"
  ON admin_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );

-- Policy 3: Only allow existing admins to insert new admins
CREATE POLICY "Admins can insert admin_users"
  ON admin_users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );

-- Verify RLS is enabled
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Show current policies
SELECT
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'admin_users'
ORDER BY policyname;
