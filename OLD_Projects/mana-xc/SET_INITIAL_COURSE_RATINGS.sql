-- Set Initial Course Ratings (Manual Assignment - Option B)
-- Based on user's domain knowledge and expected time equivalencies
--
-- User's expected equivalencies (all equal performance):
-- - Crystal Springs 2.95mi: 16:00.0 (baseline = 1.000)
-- - Golden Gate Park 2.93mi: 15:29.7 → rating ≈ 1.033 (3.3% easier)
-- - Montgomery Hill 2.74mi: 15:13.0 → rating ≈ 1.052 (5.2% easier)
-- - Woodward Park 5000m: 16:19.6 → rating ≈ 0.980 (2% harder)
--
-- Range: 0.88 to 1.12 (±12% from baseline per user preference)

-- Step 1: Identify all courses and their current ratings
SELECT
  c.id,
  v.name as venue,
  v.city,
  c.distance_meters,
  ROUND(c.distance_meters / 1609.34, 2) as distance_miles,
  c.xc_time_rating as current_rating,
  COUNT(DISTINCT res.athlete_id) as unique_athletes,
  COUNT(res.id) as total_results
FROM courses c
JOIN venues v ON v.id = c.venue_id
LEFT JOIN races r ON r.course_id = c.id
LEFT JOIN results res ON res.race_id = r.id
GROUP BY c.id, v.id, v.name, v.city, c.distance_meters, c.xc_time_rating
ORDER BY unique_athletes DESC;

-- Step 2: Update ratings for known courses
-- Crystal Springs 2.95 mile (4748m) = 1.000 baseline
UPDATE courses
SET xc_time_rating = 1.0000
FROM venues v
WHERE courses.venue_id = v.id
  AND v.name LIKE '%Crystal Springs%'
  AND courses.distance_meters BETWEEN 4700 AND 4800;

-- Golden Gate Park ~2.93 mile (4700m) = 1.033 (3.3% easier)
UPDATE courses
SET xc_time_rating = 1.0330
FROM venues v
WHERE courses.venue_id = v.id
  AND v.name LIKE '%Golden Gate%'
  AND courses.distance_meters BETWEEN 4600 AND 4800;

-- Montgomery Hill Park 2.74 mile (4410m) = 1.052 (5.2% easier)
-- Note: 2025 may be ~160m short, but using listed distance for now
UPDATE courses
SET xc_time_rating = 1.0520
FROM venues v
WHERE courses.venue_id = v.id
  AND v.name LIKE '%Montgomery Hill%'
  AND courses.distance_meters BETWEEN 4300 AND 4500;

-- Woodward Park 5000m = 0.980 (2% harder)
UPDATE courses
SET xc_time_rating = 0.9800
FROM venues v
WHERE courses.venue_id = v.id
  AND v.name LIKE '%Woodward%'
  AND courses.distance_meters BETWEEN 4900 AND 5100;

-- Baylands Park 3.1 mile (5000m) = 1.010 (1% easier, estimate)
UPDATE courses
SET xc_time_rating = 1.0100
FROM venues v
WHERE courses.venue_id = v.id
  AND v.name LIKE '%Baylands%'
  AND courses.distance_meters BETWEEN 4900 AND 5100;

-- For all other courses, set to neutral 1.000 (can refine later)
UPDATE courses
SET xc_time_rating = 1.0000
WHERE xc_time_rating IS NULL OR xc_time_rating = 0;

-- Step 3: Verify the updates
SELECT
  v.name as venue,
  v.city,
  c.distance_meters,
  ROUND(c.distance_meters / 1609.34, 2) as distance_miles,
  c.xc_time_rating as rating,
  CASE
    WHEN c.xc_time_rating > 1.05 THEN '🟢 Easy (>5% faster)'
    WHEN c.xc_time_rating > 1.02 THEN '🟡 Slightly Easy (2-5% faster)'
    WHEN c.xc_time_rating > 0.98 THEN '⚪ Neutral (±2%)'
    WHEN c.xc_time_rating > 0.95 THEN '🟠 Slightly Hard (2-5% slower)'
    ELSE '🔴 Hard (>5% slower)'
  END as difficulty,
  -- Show what a 16:00 at Crystal Springs would be on this course
  FLOOR((96000 / c.xc_time_rating)::integer / 6000)::text || ':' ||
  LPAD(FLOOR(((96000 / c.xc_time_rating)::integer % 6000) / 100)::text, 2, '0') || '.' ||
  LPAD(((96000 / c.xc_time_rating)::integer % 100)::text, 2, '0') as equivalent_16min_crystal,
  COUNT(DISTINCT res.athlete_id) as unique_athletes
FROM courses c
JOIN venues v ON v.id = c.venue_id
LEFT JOIN races r ON r.course_id = c.id
LEFT JOIN results res ON res.race_id = r.id
GROUP BY c.id, v.name, v.city, c.distance_meters, c.xc_time_rating
ORDER BY c.xc_time_rating DESC, unique_athletes DESC;

-- Step 4: Refresh the athlete_course_prs materialized view with new ratings
REFRESH MATERIALIZED VIEW athlete_course_prs;

-- Step 5: Summary stats
SELECT
  'Total Courses' as metric,
  COUNT(*) as count
FROM courses
UNION ALL
SELECT
  'Courses with Custom Ratings (not 1.000)',
  COUNT(*)
FROM courses
WHERE xc_time_rating != 1.0000
UNION ALL
SELECT
  'Rating Range',
  MIN(xc_time_rating)::text || ' to ' || MAX(xc_time_rating)::text
FROM courses;
