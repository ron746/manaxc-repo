-- Recalculate normalized times for BOTH Lagoon Valley courses

-- Recalculate for 2-mile course
SELECT recalculate_normalized_times_for_course('c9c2e3e2-0148-4410-a929-4812f108ec2e');

-- Recalculate for 3-mile course
SELECT recalculate_normalized_times_for_course('f141307c-9364-43e3-bf17-8ea7fe45c4a7');

-- Rebuild athlete best times
SELECT batch_rebuild_athlete_best_times();

-- Verify the fix
SELECT
  c.name,
  c.distance_meters,
  ROUND(c.distance_meters::numeric / 1609.344, 2) as miles,
  c.difficulty_rating,
  COUNT(DISTINCT ra.id) as race_count,
  COUNT(DISTINCT r.id) as result_count,
  MIN(r.time_cs) as fastest_time_cs,
  ROUND((MIN(r.time_cs)::numeric / 100 / (c.distance_meters::numeric / 1609.344) / 60), 2) as fastest_pace_per_mile
FROM courses c
LEFT JOIN races ra ON ra.course_id = c.id
LEFT JOIN results r ON r.race_id = ra.id
WHERE c.name LIKE '%Lagoon Valley%'
GROUP BY c.id, c.name, c.distance_meters, c.difficulty_rating
ORDER BY c.distance_meters;

-- Expected:
-- 2 Miles: 5 races, ~650 results, ~5.0-5.5 min/mile
-- 3 Miles: 4 races, ~460 results, ~5.3-6.0 min/mile
