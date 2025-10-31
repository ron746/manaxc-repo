-- Fix Lagoon Valley: Separate 2-mile and 3-mile courses
-- Currently all races (2mi and 3mi) are on the same "3 Miles" course

-- 1. Create a new course for the 2-mile distance
INSERT INTO courses (name, venue_id, distance_meters, difficulty_rating, surface_type)
SELECT
  'Lagoon Valley Park, 2 Miles',
  venue_id,
  3219,  -- 2 miles in meters (2 * 1609.344)
  1.0,   -- Start with flat baseline
  surface_type
FROM courses
WHERE name = 'Lagoon Valley Park, 3 Miles'
LIMIT 1
RETURNING id, name, distance_meters;

-- 2. Move all "2 Miles" races to the new course
-- First, get the new course ID (you'll need to run step 1 first and note the ID)

-- Example (replace NEW_COURSE_ID with the actual UUID from step 1):
-- UPDATE races
-- SET course_id = 'NEW_COURSE_ID'
-- WHERE id IN (
--   SELECT ra.id
--   FROM races ra
--   JOIN courses c ON ra.course_id = c.id
--   WHERE c.name = 'Lagoon Valley Park, 3 Miles'
--     AND ra.name LIKE '%2 Miles%'
-- );

-- 3. After moving races, re-calculate normalized times for both courses

-- Note: You'll need to run this in steps:
-- Step 1: Run the INSERT to create the new course
-- Step 2: Copy the course ID that's returned
-- Step 3: Uncomment and run the UPDATE, replacing NEW_COURSE_ID
-- Step 4: Recalculate normalized times (triggers should handle this)
