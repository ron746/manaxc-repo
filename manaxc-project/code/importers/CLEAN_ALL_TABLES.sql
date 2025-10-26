-- CLEAN ALL TABLES - Complete Database Reset
-- Run this in Supabase SQL Editor
-- WARNING: This will delete ALL data from ALL tables

-- ============================================================================
-- DELETE ALL DATA (in correct order to avoid foreign key violations)
-- ============================================================================

-- 1. Delete child tables first (have foreign keys)
DELETE FROM results;
DELETE FROM races;
DELETE FROM meets;
DELETE FROM athletes;

-- 2. Delete course-related data
DELETE FROM courses;
DELETE FROM venues;
DELETE FROM difficulty_presets;

-- 3. Delete school data (keep structure but clear data)
DELETE FROM schools;

-- 4. Delete audit/logging tables if they exist
-- Note: These tables may not exist yet, so we use DO block to handle errors
DO $$
BEGIN
    DELETE FROM course_rating_history;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Table course_rating_history does not exist yet';
END $$;

DO $$
BEGIN
    DELETE FROM admin_log;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Table admin_log does not exist yet';
END $$;

-- ============================================================================
-- VERIFY CLEAN STATE
-- ============================================================================

SELECT 'results' as table_name, COUNT(*) as count FROM results
UNION ALL
SELECT 'races', COUNT(*) FROM races
UNION ALL
SELECT 'meets', COUNT(*) FROM meets
UNION ALL
SELECT 'athletes', COUNT(*) FROM athletes
UNION ALL
SELECT 'courses', COUNT(*) FROM courses
UNION ALL
SELECT 'venues', COUNT(*) FROM venues
UNION ALL
SELECT 'schools', COUNT(*) FROM schools
UNION ALL
SELECT 'difficulty_presets', COUNT(*) FROM difficulty_presets
ORDER BY table_name;

-- Expected output: All tables should show 0 count

-- ============================================================================
-- RESET SEQUENCES (if using auto-increment IDs)
-- ============================================================================

-- For UUIDs, no sequence reset needed
-- If you were using INTEGER IDs, you would run:
-- ALTER SEQUENCE athletes_id_seq RESTART WITH 1;
-- ALTER SEQUENCE schools_id_seq RESTART WITH 1;
-- etc.

-- ============================================================================
-- RE-INSERT DIFFICULTY PRESETS (reference data)
-- ============================================================================

INSERT INTO difficulty_presets (label, difficulty_value, description, typical_range_min, typical_range_max)
VALUES
    ('Fast', 0.85, 'Very fast course, significantly easier than track', 0.70, 0.90),
    ('Easy', 0.95, 'Easier than track, mostly flat with minimal obstacles', 0.90, 1.00),
    ('Average', 1.00, 'Similar difficulty to flat track', 0.95, 1.05),
    ('Moderate', 1.10, 'Moderately challenging with some hills or terrain', 1.05, 1.15),
    ('Hard', 1.20, 'Challenging course with significant hills or obstacles', 1.15, 1.30),
    ('Slow', 1.35, 'Very challenging, steep hills or difficult terrain', 1.30, 1.50)
ON CONFLICT (label) DO UPDATE SET
    difficulty_value = EXCLUDED.difficulty_value,
    description = EXCLUDED.description,
    typical_range_min = EXCLUDED.typical_range_min,
    typical_range_max = EXCLUDED.typical_range_max;

-- ============================================================================
-- RE-INSERT WESTMONT HIGH SCHOOL (our main school)
-- ============================================================================

INSERT INTO schools (name, short_name, city, state)
VALUES ('Westmont High School', 'Westmont', 'Campbell', 'CA')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

SELECT 'Database cleaned successfully!' as status;

SELECT
    'results' as table_name,
    COUNT(*) as count,
    CASE WHEN COUNT(*) = 0 THEN '✅' ELSE '❌' END as status
FROM results
UNION ALL
SELECT 'races', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✅' ELSE '❌' END FROM races
UNION ALL
SELECT 'meets', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✅' ELSE '❌' END FROM meets
UNION ALL
SELECT 'athletes', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✅' ELSE '❌' END FROM athletes
UNION ALL
SELECT 'courses', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✅' ELSE '❌' END FROM courses
UNION ALL
SELECT 'venues', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✅' ELSE '❌' END FROM venues
UNION ALL
SELECT 'schools', COUNT(*), CASE WHEN COUNT(*) > 0 THEN '✅' ELSE '❌' END FROM schools
UNION ALL
SELECT 'difficulty_presets', COUNT(*), CASE WHEN COUNT(*) = 6 THEN '✅' ELSE '❌' END FROM difficulty_presets
ORDER BY table_name;

-- Expected:
-- ✅ results: 0
-- ✅ races: 0
-- ✅ meets: 0
-- ✅ athletes: 0
-- ✅ courses: 0
-- ✅ venues: 0
-- ✅ schools: 1 (Westmont)
-- ✅ difficulty_presets: 6

