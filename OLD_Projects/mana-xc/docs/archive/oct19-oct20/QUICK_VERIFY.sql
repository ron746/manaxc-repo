-- Quick Verification of 2025 Import
-- Copy and run this in Supabase SQL Editor

-- ============================================================================
-- 1. Table Counts
-- ============================================================================
SELECT 'Venues' as table_name, COUNT(*) as count FROM venues
UNION ALL
SELECT 'Courses', COUNT(*) FROM courses
UNION ALL
SELECT 'Meets (2025)', COUNT(*) FROM meets WHERE season_year = 2025
UNION ALL
SELECT 'Races (2025)', COUNT(*) FROM races r JOIN meets m ON m.id = r.meet_id WHERE m.season_year = 2025
UNION ALL
SELECT 'Schools', COUNT(*) FROM schools
UNION ALL
SELECT 'Athletes', COUNT(*) FROM athletes
UNION ALL
SELECT 'Results (2025)', COUNT(*) FROM results WHERE season_year = 2025;

-- ============================================================================
-- 2. Graduation Year Distribution
-- ============================================================================
SELECT
  graduation_year as class_of,
  COUNT(*) as athlete_count
FROM athletes
WHERE graduation_year IS NOT NULL
GROUP BY graduation_year
ORDER BY graduation_year;

-- ============================================================================
-- 3. Check Venue → Course → Race Linking (NEW SCHEMA!)
-- ============================================================================
SELECT
  v.name as venue_name,
  c.distance_meters,
  c.xc_time_rating,
  COUNT(DISTINCT r.id) as race_count,
  COUNT(DISTINCT res.id) as result_count
FROM venues v
JOIN courses c ON c.venue_id = v.id  -- Should work now with UUID!
LEFT JOIN races r ON r.course_id = c.id
LEFT JOIN results res ON res.race_id = r.id
GROUP BY v.id, v.name, c.distance_meters, c.xc_time_rating
ORDER BY venue_name, c.distance_meters;

-- ============================================================================
-- 4. Sample Athletes (check full_name and graduation_year)
-- ============================================================================
SELECT
  full_name,
  graduation_year as class_of,
  gender,
  s.name as school
FROM athletes a
LEFT JOIN schools s ON s.id = a.current_school_id
WHERE full_name IS NOT NULL
ORDER BY graduation_year, last_name
LIMIT 20;

-- ============================================================================
-- 5. Top 10 Fastest Times (2025 Season)
-- ============================================================================
SELECT
  a.full_name,
  a.graduation_year as class_of,
  s.name as school,
  FLOOR(res.time_cs / 6000) || ':' ||
    LPAD(FLOOR((res.time_cs % 6000) / 100)::text, 2, '0') || '.' ||
    LPAD((res.time_cs % 100)::text, 2, '0') as time,
  m.name as meet_name
FROM results res
JOIN athletes a ON a.id = res.athlete_id
JOIN schools s ON s.id = a.current_school_id
JOIN races r ON r.id = res.race_id
JOIN meets m ON m.id = r.meet_id
WHERE res.season_year = 2025
  AND res.time_cs > 0
ORDER BY res.time_cs ASC
LIMIT 10;
