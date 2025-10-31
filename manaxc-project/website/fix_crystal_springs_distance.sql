-- Fix Crystal Springs 2.13 Miles - Wrong distance in database
-- Database shows 4327m (2.69 miles) but race name says "2.13 Miles"
-- Correct distance should be 2.13 miles = 3429 meters

-- Step 1: Check current state
SELECT
  id,
  name,
  distance_meters,
  ROUND(distance_meters::numeric / 1609.344, 2) as current_miles,
  difficulty_rating,
  (SELECT COUNT(*) FROM races WHERE course_id = courses.id) as race_count
FROM courses
WHERE name LIKE '%Crystal Springs%2.13%';

-- Step 2: Update the distance to correct value
-- NOTE: This will trigger automatic recalculation of:
--   - results.normalized_time_cs for all results on this course
--   - course_records for this course
UPDATE courses
SET distance_meters = 3429  -- 2.13 miles in meters (2.13 * 1609.344)
WHERE name = 'Crystal Springs, 2.13 Miles';

-- Step 3: Manually recalculate athlete_best_times
-- The trigger handles results and course_records, but athlete_best_times needs manual rebuild
-- This may take a few minutes for all athletes in the database:
SELECT batch_rebuild_athlete_best_times();

-- Step 4: Verify the fix
SELECT
  c.name,
  c.distance_meters,
  ROUND(c.distance_meters::numeric / 1609.344, 2) as miles,
  c.difficulty_rating,
  COUNT(r.id) as result_count,
  MIN(r.time_cs) as fastest_time_cs,
  ROUND((MIN(r.time_cs)::numeric / 100 / (c.distance_meters::numeric / 1609.344) / 60), 2) as fastest_pace_per_mile
FROM courses c
LEFT JOIN races ra ON ra.course_id = c.id
LEFT JOIN results r ON r.race_id = ra.id
WHERE c.name = 'Crystal Springs, 2.13 Miles'
GROUP BY c.id, c.name, c.distance_meters, c.difficulty_rating;

-- Expected result: pace should now be around 5.3-5.5 min/mile instead of 4.2 min/mile
