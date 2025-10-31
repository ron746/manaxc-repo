-- Fix Lagoon Valley: Actually MOVE the 2-mile races to the 2-mile course
-- The 2-mile course exists but has no races assigned to it

-- Step 1: Check current state
SELECT
  c.name,
  c.id as course_id,
  c.distance_meters,
  ROUND(c.distance_meters::numeric / 1609.344, 2) as miles,
  COUNT(DISTINCT ra.id) as race_count,
  STRING_AGG(DISTINCT ra.name, ' | ' ORDER BY ra.name) as race_names
FROM courses c
LEFT JOIN races ra ON ra.course_id = c.id
WHERE c.name LIKE '%Lagoon Valley%'
GROUP BY c.id, c.name, c.distance_meters
ORDER BY c.distance_meters;

-- Step 2: Get the course IDs
WITH course_ids AS (
  SELECT
    c.id,
    c.name,
    c.distance_meters
  FROM courses c
  WHERE c.name LIKE '%Lagoon Valley%'
)
SELECT * FROM course_ids;

-- Step 3: Move all "2 Miles" races from 3-mile course to 2-mile course
UPDATE races ra
SET course_id = (
  SELECT id FROM courses WHERE name = 'Lagoon Valley Park, 2 Miles' LIMIT 1
)
WHERE ra.course_id = (
  SELECT id FROM courses WHERE name = 'Lagoon Valley Park, 3 Miles' LIMIT 1
)
AND ra.name LIKE '%2 Miles%';

-- Check how many races were moved
SELECT
  'Races moved' as status,
  COUNT(*) as moved_count
FROM races ra
WHERE ra.course_id = (SELECT id FROM courses WHERE name = 'Lagoon Valley Park, 2 Miles' LIMIT 1);

-- Step 4: Verify the fix
SELECT
  c.name,
  c.distance_meters,
  ROUND(c.distance_meters::numeric / 1609.344, 2) as miles,
  COUNT(DISTINCT ra.id) as race_count,
  STRING_AGG(DISTINCT ra.name, ' | ' ORDER BY ra.name LIMIT 3) as sample_races
FROM courses c
LEFT JOIN races ra ON ra.course_id = c.id
WHERE c.name LIKE '%Lagoon Valley%'
GROUP BY c.id, c.name, c.distance_meters
ORDER BY c.distance_meters;

-- Expected result:
-- Lagoon Valley Park, 2 Miles: 5 races (all JV/Frosh/Soph 2-mile races)
-- Lagoon Valley Park, 3 Miles: 4 races (all Varsity 3-mile races)
