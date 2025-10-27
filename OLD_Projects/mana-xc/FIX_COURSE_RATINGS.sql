-- Fix Course Ratings - Correct Interpretation
-- Lower rating = HARDER course (you run slower time there)
-- Higher rating = EASIER course (you run faster time there)
--
-- User's expected equivalencies (all equal performance):
-- - Crystal Springs 2.95mi: 16:00.0 (baseline = 1.000)
-- - Montgomery Hill 2.74mi: 15:13.0 → rating = 0.951 (HARDER - shorter distance but slower per-mile pace)
-- - Golden Gate Park 2.93mi: 15:29.7 → rating = 0.968 (HARDER - slightly shorter but slower per-mile pace)
-- - Woodward Park 5000m: 16:19.6 → rating = 1.020 (EASIER - longer but similar per-mile pace)

-- Fix Montgomery Hill: 15:13 / 16:00 = 0.9510 (HARDER)
UPDATE courses c
SET xc_time_rating = 0.9510
FROM venues v
WHERE c.venue_id = v.id
  AND v.name LIKE '%Montgomery Hill%'
  AND c.distance_meters = 4410;

-- Fix Golden Gate Park: 15:29.7 / 16:00 = 0.9683 (HARDER)
UPDATE courses c
SET xc_time_rating = 0.9683
FROM venues v
WHERE c.venue_id = v.id
  AND v.name LIKE '%Golden Gate%';

-- Fix Woodward Park 5000m: 16:19.6 / 16:00 = 1.0204 (EASIER)
UPDATE courses c
SET xc_time_rating = 1.0204
FROM venues v
WHERE c.venue_id = v.id
  AND v.name LIKE '%Woodward%'
  AND c.distance_meters = 5000;

-- Crystal Springs stays at 1.000 (baseline)
UPDATE courses c
SET xc_time_rating = 1.0000
FROM venues v
WHERE c.venue_id = v.id
  AND v.name LIKE '%Crystal Springs%'
  AND c.distance_meters = 4748;

-- Verify the corrections
SELECT
  c.id as course_id,
  v.name as venue,
  c.distance_meters,
  ROUND(c.distance_meters / 1609.34, 2) as distance_miles,
  c.xc_time_rating as rating,
  CASE
    WHEN c.xc_time_rating > 1.02 THEN '🟢 Easier (>2%)'
    WHEN c.xc_time_rating > 1.00 THEN '🟡 Slightly Easier'
    WHEN c.xc_time_rating = 1.00 THEN '⚪ Baseline'
    WHEN c.xc_time_rating > 0.98 THEN '🟠 Slightly Harder'
    ELSE '🔴 Harder (>2%)'
  END as difficulty,
  -- Show what a 16:00 at Crystal Springs would be on this course
  FLOOR((96000 / c.xc_time_rating)::integer / 6000)::text || ':' ||
  LPAD(FLOOR(((96000 / c.xc_time_rating)::integer % 6000) / 100)::text, 2, '0') || '.' ||
  LPAD(((96000 / c.xc_time_rating)::integer % 100)::text, 2, '0') as equivalent_16min_crystal,
  COUNT(DISTINCT res.athlete_id) as athletes
FROM courses c
JOIN venues v ON v.id = c.venue_id
LEFT JOIN races r ON r.course_id = c.id
LEFT JOIN results res ON res.race_id = r.id
WHERE v.name IN ('Crystal Springs', 'Montgomery Hill Park', 'Golden Gate Park', 'Woodward Park')
GROUP BY c.id, v.name, c.distance_meters, c.xc_time_rating
ORDER BY c.xc_time_rating DESC;

-- Refresh materialized view
REFRESH MATERIALIZED VIEW athlete_course_prs;

-- Summary
SELECT
  'Fixed Ratings' as status,
  COUNT(*) as total_courses,
  MIN(xc_time_rating) as min_rating,
  MAX(xc_time_rating) as max_rating
FROM courses;
