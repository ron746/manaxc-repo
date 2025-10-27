-- Check current course ratings and statistics
-- Run this in Supabase SQL Editor to see all courses and their current ratings

-- 1. All courses with ratings and sample sizes
SELECT
  v.name as venue,
  v.city,
  c.distance_meters,
  c.xc_time_rating,
  c.layout_version,
  COUNT(DISTINCT r.id) as total_results,
  COUNT(DISTINCT res.athlete_id) as unique_athletes,
  COUNT(DISTINCT ra.meet_id) as meets_held_here,
  MIN(res.time_cs) as fastest_time_cs,
  FLOOR(MIN(res.time_cs) / 6000)::text || ':' ||
  LPAD(FLOOR((MIN(res.time_cs) % 6000) / 100)::text, 2, '0') || '.' ||
  LPAD((MIN(res.time_cs) % 100)::text, 2, '0') as fastest_time,
  AVG(res.time_cs)::integer as avg_time_cs,
  FLOOR(AVG(res.time_cs)::integer / 6000)::text || ':' ||
  LPAD(FLOOR((AVG(res.time_cs)::integer % 6000) / 100)::text, 2, '0') || '.' ||
  LPAD((AVG(res.time_cs)::integer % 100)::text, 2, '0') as avg_time
FROM courses c
JOIN venues v ON v.id = c.venue_id
LEFT JOIN races r ON r.course_id = c.id
LEFT JOIN results res ON res.race_id = r.id
LEFT JOIN races ra ON ra.id = res.race_id
WHERE res.time_cs > 0
GROUP BY c.id, v.id, v.name, v.city, c.distance_meters, c.xc_time_rating, c.layout_version
ORDER BY c.distance_meters, v.name;

-- 2. Courses by sample size (most competitive)
SELECT
  v.name as venue,
  c.distance_meters,
  c.xc_time_rating as current_rating,
  COUNT(DISTINCT res.athlete_id) as unique_athletes,
  COUNT(*) as total_races,
  MIN(res.season_year) || '-' || MAX(res.season_year) as seasons
FROM courses c
JOIN venues v ON v.id = c.venue_id
LEFT JOIN races r ON r.course_id = c.id
LEFT JOIN results res ON res.race_id = r.id
WHERE res.time_cs > 0
GROUP BY c.id, v.name, c.distance_meters, c.xc_time_rating
ORDER BY unique_athletes DESC;

-- 3. Crystal Springs baseline check
SELECT
  v.name as venue,
  c.distance_meters,
  c.xc_time_rating,
  CASE
    WHEN v.name LIKE '%Crystal Springs%' THEN '✅ BASELINE COURSE'
    ELSE ''
  END as baseline_status
FROM courses c
JOIN venues v ON v.id = c.venue_id
WHERE v.name LIKE '%Crystal%'
ORDER BY c.distance_meters;
