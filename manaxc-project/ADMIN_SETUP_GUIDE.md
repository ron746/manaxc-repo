# Admin Authentication Setup Guide

## Overview

Admin pages are now protected with Supabase authentication. Only users listed in the `admin_users` table can access `/admin/*` routes.

## Setup Steps

### 1. Run the Database Migration

Execute the migration in your Supabase SQL Editor:

```bash
# Run this SQL file in Supabase dashboard
manaxc-project/website/supabase/migrations/20251101_create_admin_users.sql
```

Or copy-paste the SQL directly into the SQL Editor at: https://supabase.com/dashboard/project/mdspteohgwkpttlmdayn/sql

### 2. Create Your Admin Account

#### Option A: Sign Up Through Supabase Auth (Recommended)

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/mdspteohgwkpttlmdayn/auth/users
2. Click "Add user" → "Create new user"
3. Enter your email and a strong password
4. Click "Create user"
5. Copy the user's UUID (it will be displayed after creation)

#### Option B: Sign Up Through the Application

1. Temporarily modify `/website/app/admin/login/page.tsx` to add a sign-up form
2. Sign up with your email and password
3. Remove the sign-up form after creating your account

### 3. Add Yourself to admin_users Table

In Supabase SQL Editor, run:

```sql
-- Replace 'your-user-id-here' with the UUID from step 2
-- Replace 'your-email@example.com' with your actual email

INSERT INTO admin_users (user_id, email, created_by)
VALUES (
  'your-user-id-here',
  'your-email@example.com',
  'your-user-id-here'  -- First admin is self-created
);
```

### 4. Test Login

1. Go to: https://manaxc.vercel.app/admin
2. You should be redirected to `/admin/login`
3. Enter your email and password
4. If successful, you'll be redirected to the admin dashboard

## Adding Additional Admins

Once you're logged in as an admin, you can add other admins:

```sql
-- First, have the new admin sign up through Supabase Auth
-- Then add them to admin_users with their user_id

INSERT INTO admin_users (user_id, email, created_by)
VALUES (
  'new-admin-user-id',
  'newadmin@example.com',
  auth.uid()  -- Your user_id as the creator
);
```

## How It Works

### Middleware Protection

`/website/middleware.ts` intercepts all requests to `/admin/*`:
- Checks if user is authenticated
- Checks if user exists in `admin_users` table
- Redirects to `/admin/login` if not authorized

### Login Flow

1. User enters email/password at `/admin/login`
2. Supabase Auth validates credentials
3. Application checks `admin_users` table for user_id
4. If authorized, user is redirected to requested admin page
5. If not authorized, user is signed out and shown error

### Logout

Click the "Logout" button on any admin page to sign out and return to login.

## Security Notes

- Passwords are handled by Supabase Auth (never stored in your database)
- RLS (Row Level Security) is enabled on `admin_users` table
- Only existing admins can view the admin_users table
- Only existing admins can add new admins
- Session cookies are HTTP-only and secure
- Middleware runs on every request to admin routes

## Troubleshooting

### "You do not have admin privileges" error

- Verify your user_id is in the `admin_users` table:
  ```sql
  SELECT * FROM admin_users WHERE email = 'your-email@example.com';
  ```

### Can't access Supabase dashboard

- Make sure you're logged into the correct Supabase project
- Project ID: `mdspteohgwkpttlmdayn`
- URL: https://mdspteohgwkpttlmdayn.supabase.co

### Middleware not working locally

- Make sure you're running `npm run dev` in the `/website` directory
- Check that `.env.local` has the correct Supabase credentials:
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://mdspteohgwkpttlmdayn.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
  ```

### Need to reset your password

1. Go to Supabase dashboard → Authentication → Users
2. Find your user
3. Click "..." → "Send password reset email"
4. Or set a new password directly in the dashboard

## Environment Variables

Required in Vercel and `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://mdspteohgwkpttlmdayn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kc3B0ZW9oZ3drcHR0bG1kYXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMjE0MDQsImV4cCI6MjA3NjY5NzQwNH0.4MT_nDkJg3gtyKgbVwNY1JVgY9Kod4ixRH-r8X7BBqE
```

These are already configured in the codebase as fallbacks.

## Next Steps

After setting up authentication:
1. Test all admin pages to ensure they're protected
2. Add admin users for anyone who needs access
3. Consider adding audit logging for admin actions
4. Review and update admin page content for public sharing

---

**Created:** November 1, 2025
**Last Updated:** November 1, 2025
