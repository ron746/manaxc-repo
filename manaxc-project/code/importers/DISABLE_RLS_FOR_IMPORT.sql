-- ============================================
-- TEMPORARILY DISABLE RLS FOR DATA IMPORT
-- ============================================
-- Run this script in Supabase SQL Editor BEFORE importing data
-- Then run ENABLE_RLS_AFTER_IMPORT.sql when done

-- Disable RLS on tables needed for import
ALTER TABLE athletes DISABLE ROW LEVEL SECURITY;
ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE venues DISABLE ROW LEVEL SECURITY;
ALTER TABLE meets DISABLE ROW LEVEL SECURITY;
ALTER TABLE races DISABLE ROW LEVEL SECURITY;
ALTER TABLE results DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('athletes', 'courses', 'venues', 'meets', 'races', 'results')
ORDER BY tablename;

-- Should see rowsecurity = false for all tables
