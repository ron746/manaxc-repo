-- Clean Database Script
-- Preserves course ratings as reference guide
-- Run in Supabase SQL Editor

-- 1. Export current course ratings to backup (run this query and save results)
SELECT
    name,
    distance_meters,
    difficulty_rating,
    location,
    venue,
    notes
FROM courses
WHERE difficulty_rating IS NOT NULL
ORDER BY name;

-- Save the above results to: course_ratings_backup.csv

-- 2. Delete all race data (cascades to results)
DELETE FROM results;
DELETE FROM races;
DELETE FROM meets;

-- 3. Delete all athletes (but keep schools)
DELETE FROM athletes;

-- 4. Keep courses table with ratings as reference
-- We'll use these difficulty ratings when matching/creating courses during import

-- 5. Verify clean state
SELECT 'results' as table_name, COUNT(*) as count FROM results
UNION ALL
SELECT 'races', COUNT(*) FROM races
UNION ALL
SELECT 'meets', COUNT(*) FROM meets
UNION ALL
SELECT 'athletes', COUNT(*) FROM athletes
UNION ALL
SELECT 'schools', COUNT(*) FROM schools
UNION ALL
SELECT 'courses', COUNT(*) FROM courses;

-- Expected output:
-- results: 0
-- races: 0
-- meets: 0
-- athletes: 0
-- schools: 1-10 (keep existing schools)
-- courses: 119 (keep as reference)

-- 6. Reset sequences if needed
-- (Not necessary for UUIDs, but good practice)
