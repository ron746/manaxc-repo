-- Full database recalculation of all normalized times
-- Run this after fixing course distances or difficulties that happened before the trigger was created

-- Step 1: Recalculate ALL normalized_time_cs values
-- This ensures every result uses the correct distance and difficulty
UPDATE results r
SET normalized_time_cs = (
  (r.time_cs::float * 1609.344 / c.distance_meters) / c.difficulty_rating
)::int
FROM races ra
JOIN courses c ON ra.course_id = c.id
WHERE r.race_id = ra.id
  AND r.time_cs IS NOT NULL;

-- Check how many were updated
SELECT
  'Results updated' as step,
  COUNT(*) as total_results,
  COUNT(CASE WHEN time_cs IS NOT NULL THEN 1 END) as results_with_times
FROM results;

-- Step 2: Rebuild athlete_best_times for ALL athletes
-- This may take 2-3 minutes
SELECT batch_rebuild_athlete_best_times() as athlete_best_times_status;

-- Step 3: Rebuild course_records for ALL courses
-- This rebuilds the fastest M/F times for each course
SELECT batch_rebuild_course_records() as course_records_status;

-- Step 4: Verify some key courses are now correct
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
WHERE c.name IN (
  'Lagoon Valley Park, 2 Miles',
  'Lagoon Valley Park, 3 Miles',
  'Crystal Springs, 2.13 Miles',
  'Crystal Springs, 2.95 Miles'
)
GROUP BY c.id, c.name, c.distance_meters, c.difficulty_rating
ORDER BY c.name, c.distance_meters;

-- Expected results:
-- Lagoon Valley 2 Miles: ~5.0-5.5 min/mile
-- Lagoon Valley 3 Miles: ~5.3-6.0 min/mile
-- Crystal Springs 2.13 Miles: ~5.3-5.5 min/mile
-- Crystal Springs 2.95 Miles: ~5.4-5.8 min/mile
