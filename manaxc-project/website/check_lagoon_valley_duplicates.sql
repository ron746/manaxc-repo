-- Check for duplicate Lagoon Valley courses
SELECT
  c.id,
  c.name,
  c.distance_meters,
  c.difficulty_rating,
  c.venue_id,
  COUNT(ra.id) as race_count,
  c.created_at
FROM courses c
LEFT JOIN races ra ON ra.course_id = c.id
WHERE c.name LIKE '%Lagoon Valley%'
GROUP BY c.id, c.name, c.distance_meters, c.difficulty_rating, c.venue_id, c.created_at
ORDER BY c.name, c.created_at;

-- If there are duplicates, we need to merge them
-- Delete the empty duplicate (keep the one created first)
DELETE FROM courses
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      name,
      distance_meters,
      ROW_NUMBER() OVER (PARTITION BY name, distance_meters ORDER BY created_at) as rn,
      COUNT(*) OVER (PARTITION BY name, distance_meters) as dup_count
    FROM courses
    WHERE name LIKE '%Lagoon Valley%'
  ) sub
  WHERE dup_count > 1 AND rn > 1
);

-- Verify cleanup
SELECT
  c.name,
  c.distance_meters,
  COUNT(DISTINCT c.id) as course_count
FROM courses c
WHERE c.name LIKE '%Lagoon Valley%'
GROUP BY c.name, c.distance_meters;

-- Expected: Each name/distance combo should have exactly 1 course
