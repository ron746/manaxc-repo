-- ============================================
-- RE-ENABLE RLS AFTER DATA IMPORT
-- ============================================
-- Run this script in Supabase SQL Editor AFTER importing data successfully

-- Re-enable RLS on all tables
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE meets ENABLE ROW LEVEL SECURITY;
ALTER TABLE races ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;

-- Create permissive read policies for public access
-- (Allow anyone to read data, but not write)

-- Athletes: Allow all to read
DROP POLICY IF EXISTS "Allow public read access" ON athletes;
CREATE POLICY "Allow public read access" ON athletes
    FOR SELECT USING (true);

-- Courses: Allow all to read
DROP POLICY IF EXISTS "Allow public read access" ON courses;
CREATE POLICY "Allow public read access" ON courses
    FOR SELECT USING (true);

-- Venues: Allow all to read
DROP POLICY IF EXISTS "Allow public read access" ON venues;
CREATE POLICY "Allow public read access" ON venues
    FOR SELECT USING (true);

-- Meets: Allow all to read
DROP POLICY IF EXISTS "Allow public read access" ON meets;
CREATE POLICY "Allow public read access" ON meets
    FOR SELECT USING (true);

-- Races: Allow all to read
DROP POLICY IF EXISTS "Allow public read access" ON races;
CREATE POLICY "Allow public read access" ON races
    FOR SELECT USING (true);

-- Results: Allow all to read
DROP POLICY IF EXISTS "Allow public read access" ON results;
CREATE POLICY "Allow public read access" ON results
    FOR SELECT USING (true);

-- Schools: Allow all to read
DROP POLICY IF EXISTS "Allow public read access" ON schools;
CREATE POLICY "Allow public read access" ON schools
    FOR SELECT USING (true);

-- Difficulty presets: Allow all to read
DROP POLICY IF EXISTS "Allow public read access" ON difficulty_presets;
CREATE POLICY "Allow public read access" ON difficulty_presets
    FOR SELECT USING (true);

-- Verify RLS is enabled with read-only policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
