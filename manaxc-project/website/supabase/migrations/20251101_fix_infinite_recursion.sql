-- Fix infinite recursion in admin_users RLS policies
-- The "Admins can read all admin_users" policy causes recursion because it queries
-- admin_users to check if someone is an admin, which triggers the same policy.

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Admins can read all admin_users" ON admin_users;

-- Keep only the essential policies:

-- 1. Users can check their own admin status (essential for login)
--    This policy already exists and works fine
-- DROP POLICY IF EXISTS "Users can check their own admin status" ON admin_users;
-- CREATE POLICY "Users can check their own admin status"
--   ON admin_users FOR SELECT
--   USING (auth.uid() = user_id);

-- 2. Admins can insert new admins
--    This also has recursion, but we'll fix it with a security definer function later
--    For now, let's simplify it
DROP POLICY IF EXISTS "Admins can insert admin_users" ON admin_users;

-- Verify current policies
SELECT
  policyname,
  cmd,
  permissive,
  qual
FROM pg_policies
WHERE tablename = 'admin_users'
ORDER BY policyname;
