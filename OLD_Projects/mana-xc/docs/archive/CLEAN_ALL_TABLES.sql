-- Quick cleanup - delete all data from all tables
-- Run this in Supabase SQL Editor

DELETE FROM results;
DELETE FROM races;
DELETE FROM meets;
DELETE FROM athletes;
DELETE FROM schools;
DELETE FROM courses;
DELETE FROM venues;

-- Verify all empty
SELECT 'Venues' as table_name, COUNT(*) as count FROM venues
UNION ALL
SELECT 'Courses', COUNT(*) FROM courses
UNION ALL
SELECT 'Schools', COUNT(*) FROM schools
UNION ALL
SELECT 'Meets', COUNT(*) FROM meets
UNION ALL
SELECT 'Races', COUNT(*) FROM races
UNION ALL
SELECT 'Athletes', COUNT(*) FROM athletes
UNION ALL
SELECT 'Results', COUNT(*) FROM results;
