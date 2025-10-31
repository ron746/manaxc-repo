-- Fix RLS policies for admin_users to allow self-lookup
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can read admin_users" ON admin_users;
DROP POLICY IF EXISTS "Admins can insert admin_users" ON admin_users;

-- Allow users to check if THEY are an admin (read their own record)
CREATE POLICY "Users can check their own admin status"
  ON admin_users FOR SELECT
  USING (auth.uid() = user_id);

-- Allow existing admins to read all admin users
CREATE POLICY "Admins can read all admin_users"
  ON admin_users FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM admin_users
    )
  );

-- Only allow existing admins to insert new admins
CREATE POLICY "Admins can insert admin_users"
  ON admin_users FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM admin_users
    )
  );
