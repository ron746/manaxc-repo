-- Set Course Ratings by Specific Course ID
-- Based on analysis showing multiple courses per venue and year-specific issues

-- Step 1: Show all courses with their IDs
SELECT
  c.id as course_id,
  v.name as venue,
  c.distance_meters,
  ROUND(c.distance_meters / 1609.34, 2) as distance_miles,
  COUNT(DISTINCT res.season_year) as seasons,
  MIN(res.season_year) || '-' || MAX(res.season_year) as year_range,
  COUNT(DISTINCT res.athlete_id) as unique_athletes,
  COUNT(res.id) as total_results
FROM courses c
JOIN venues v ON v.id = c.venue_id
LEFT JOIN races r ON r.course_id = c.id
LEFT JOIN results res ON res.race_id = r.id
GROUP BY c.id, v.name, c.distance_meters
ORDER BY v.name, c.distance_meters;

-- Step 2: Crystal Springs 4748m (2.95 mile) = 1.000 BASELINE
-- This is the main Crystal Springs course with largest sample size
UPDATE courses c
SET xc_time_rating = 1.0000
FROM venues v
WHERE c.venue_id = v.id
  AND v.name LIKE '%Crystal Springs%'
  AND c.distance_meters = 4748;

-- Step 3: Crystal Springs 3428m (2.13 mile) = 0.980 (shorter, estimate 2% harder per mile)
UPDATE courses c
SET xc_time_rating = 0.9800
FROM venues v
WHERE c.venue_id = v.id
  AND v.name LIKE '%Crystal Springs%'
  AND c.distance_meters = 3428;

-- Step 4: Montgomery Hill 4410m (2.74 mile)
-- Based on user expectation: 15:13 vs 16:00 at Crystal = 1.052 rating
-- BUT: 2024 data shows course was ~60 sec faster (possibly short)
-- Using 1.052 as baseline, can adjust later if needed
UPDATE courses c
SET xc_time_rating = 1.0520
FROM venues v
WHERE c.venue_id = v.id
  AND v.name LIKE '%Montgomery Hill%'
  AND c.distance_meters = 4410;

-- Step 5: Baylands 5000m = 1.010 (slight easier than Crystal, estimate)
UPDATE courses c
SET xc_time_rating = 1.0100
FROM venues v
WHERE c.venue_id = v.id
  AND v.name LIKE '%Baylands%'
  AND c.distance_meters = 5000;

-- Step 6: Baylands 4000m = 1.020 (shorter course, estimate)
UPDATE courses c
SET xc_time_rating = 1.0200
FROM venues v
WHERE c.venue_id = v.id
  AND v.name LIKE '%Baylands%'
  AND c.distance_meters = 4000;

-- Step 7: Woodward Park 5000m = 0.980 (2% harder per user)
UPDATE courses c
SET xc_time_rating = 0.9800
FROM venues v
WHERE c.venue_id = v.id
  AND v.name LIKE '%Woodward%'
  AND c.distance_meters = 5000;

-- Step 8: Woodward Park 3500m = 0.970 (shorter but still hard course)
UPDATE courses c
SET xc_time_rating = 0.9700
FROM venues v
WHERE c.venue_id = v.id
  AND v.name LIKE '%Woodward%'
  AND c.distance_meters = 3500;

-- Step 9: Golden Gate Park courses
-- User expects 15:29.7 vs 16:00 at Crystal = 1.033 rating
-- But we have multiple GGP courses, set all to 1.033 for now
UPDATE courses c
SET xc_time_rating = 1.0330
FROM venues v
WHERE c.venue_id = v.id
  AND v.name LIKE '%Golden Gate%';

-- Step 10: All remaining courses = 1.000 (neutral)
UPDATE courses
SET xc_time_rating = 1.0000
WHERE xc_time_rating IS NULL OR xc_time_rating = 0;

-- Step 11: Verify all updates
SELECT
  c.id as course_id,
  v.name as venue,
  c.distance_meters,
  ROUND(c.distance_meters / 1609.34, 2) as distance_miles,
  c.xc_time_rating as rating,
  CASE
    WHEN c.xc_time_rating > 1.05 THEN '🟢 Easy (>5%)'
    WHEN c.xc_time_rating > 1.02 THEN '🟡 Slightly Easy'
    WHEN c.xc_time_rating >= 0.98 THEN '⚪ Neutral'
    WHEN c.xc_time_rating > 0.95 THEN '🟠 Slightly Hard'
    ELSE '🔴 Hard (>5%)'
  END as difficulty,
  COUNT(DISTINCT res.athlete_id) as athletes,
  COUNT(res.id) as results
FROM courses c
JOIN venues v ON v.id = c.venue_id
LEFT JOIN races r ON r.course_id = c.id
LEFT JOIN results res ON res.race_id = r.id
GROUP BY c.id, v.name, c.distance_meters, c.xc_time_rating
ORDER BY c.xc_time_rating DESC, athletes DESC;

-- Step 12: Refresh materialized view
REFRESH MATERIALIZED VIEW athlete_course_prs;

-- Step 13: Summary
SELECT
  'Ratings Applied' as status,
  COUNT(*) as total_courses,
  COUNT(*) FILTER (WHERE xc_time_rating != 1.0000) as custom_ratings,
  MIN(xc_time_rating) as min_rating,
  MAX(xc_time_rating) as max_rating
FROM courses;
