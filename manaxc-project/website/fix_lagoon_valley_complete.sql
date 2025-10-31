-- Complete Lagoon Valley fix: Remove duplicates, move races, recalculate

-- Step 1: See all Lagoon Valley courses
SELECT
  c.id,
  c.name,
  c.distance_meters,
  ROUND(c.distance_meters::numeric / 1609.344, 2) as miles,
  c.difficulty_rating,
  COUNT(ra.id) as race_count,
  c.created_at
FROM courses c
LEFT JOIN races ra ON ra.course_id = c.id
WHERE c.name LIKE '%Lagoon Valley%'
GROUP BY c.id, c.name, c.distance_meters, c.difficulty_rating, c.created_at
ORDER BY c.distance_meters, c.created_at;

-- Step 2: Keep only the OLDEST course for each distance (delete duplicates)
-- This keeps the course with races if any, since it was created first
DELETE FROM courses
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (PARTITION BY name, distance_meters ORDER BY created_at) as rn
    FROM courses
    WHERE name LIKE '%Lagoon Valley%'
  ) sub
  WHERE rn > 1  -- Delete all but the first one for each distance
);

-- Step 3: Verify we have exactly 2 courses (one for each distance)
SELECT
  c.name,
  c.id,
  c.distance_meters,
  ROUND(c.distance_meters::numeric / 1609.344, 2) as miles
FROM courses c
WHERE c.name LIKE '%Lagoon Valley%'
ORDER BY c.distance_meters;

-- Step 4: Move all "2 Miles" races to the 2-mile course
-- Get the correct course IDs first
DO $$
DECLARE
  v_2mile_course_id uuid;
  v_3mile_course_id uuid;
  v_races_moved int;
BEGIN
  -- Get course IDs
  SELECT id INTO v_2mile_course_id
  FROM courses
  WHERE name LIKE '%Lagoon Valley%' AND distance_meters < 3500
  LIMIT 1;

  SELECT id INTO v_3mile_course_id
  FROM courses
  WHERE name LIKE '%Lagoon Valley%' AND distance_meters > 4000
  LIMIT 1;

  RAISE NOTICE '2-mile course ID: %', v_2mile_course_id;
  RAISE NOTICE '3-mile course ID: %', v_3mile_course_id;

  -- Move races with "2 Miles" in the name to the 2-mile course
  UPDATE races
  SET course_id = v_2mile_course_id
  WHERE course_id = v_3mile_course_id
    AND name LIKE '%2 Miles%';

  GET DIAGNOSTICS v_races_moved = ROW_COUNT;
  RAISE NOTICE 'Moved % races to 2-mile course', v_races_moved;

  -- Recalculate normalized times for the 3-mile course
  PERFORM recalculate_normalized_times_for_course(v_3mile_course_id);
  RAISE NOTICE 'Recalculated 3-mile course';

  -- Recalculate normalized times for the 2-mile course
  PERFORM recalculate_normalized_times_for_course(v_2mile_course_id);
  RAISE NOTICE 'Recalculated 2-mile course';
END $$;

-- Step 5: Verify the fix
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

-- Expected results:
-- Lagoon Valley Park, 2 Miles: 5 races, ~650 results, pace ~5.0-5.5 min/mile
-- Lagoon Valley Park, 3 Miles: 4 races, ~460 results, pace ~5.3-6.0 min/mile

-- Step 6: Rebuild athlete best times (in case any were affected)
SELECT batch_rebuild_athlete_best_times();
