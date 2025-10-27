-- Verify 2025 Season Import
-- Run this in Supabase SQL Editor to check data quality

-- ============================================================================
-- STEP 1: Check table counts
-- ============================================================================

-- Overall counts
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
-- STEP 2: Check graduation years are populated
-- ============================================================================

SELECT
  'Graduation Year Check' as check_type,
  graduation_year,
  COUNT(*) as athlete_count
FROM athletes
WHERE graduation_year IS NOT NULL
GROUP BY graduation_year
ORDER BY graduation_year;

-- ============================================================================
-- STEP 3: Check venue → course → race linking
-- ============================================================================

SELECT
  'Venue-Course-Race Link Check' as check_type,
  v.name as venue_name,
  c.distance_meters,
  c.xc_time_rating,
  COUNT(DISTINCT r.id) as race_count,
  COUNT(DISTINCT res.id) as result_count
FROM venues v
LEFT JOIN courses c ON c.venue_id = v.id
LEFT JOIN races r ON r.course_id = c.id
LEFT JOIN results res ON res.race_id = r.id
GROUP BY v.id, v.name, c.distance_meters, c.xc_time_rating
ORDER BY venue_name, c.distance_meters;

-- ============================================================================
-- STEP 4: Sample athlete data (check full_name and graduation_year)
-- ============================================================================

SELECT
  'Sample Athletes' as check_type,
  full_name,
  first_name,
  last_name,
  graduation_year,
  gender,
  s.name as school_name
FROM athletes a
LEFT JOIN schools s ON s.id = a.current_school_id
WHERE full_name IS NOT NULL
ORDER BY graduation_year, last_name
LIMIT 20;

-- ============================================================================
-- STEP 5: Check for any NULL graduation years (should be minimal)
-- ============================================================================

SELECT
  'Missing Graduation Years' as check_type,
  COUNT(*) as athletes_without_grad_year,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM athletes), 2) as percentage
FROM athletes
WHERE graduation_year IS NULL;

-- ============================================================================
-- STEP 6: Check season_year is populated in results
-- ============================================================================

SELECT
  'Season Year Check' as check_type,
  season_year,
  COUNT(*) as result_count
FROM results
GROUP BY season_year
ORDER BY season_year DESC;

-- ============================================================================
-- STEP 7: Top 10 fastest times for 2025 season
-- ============================================================================

SELECT
  'Top 10 Times (2025)' as check_type,
  a.full_name,
  a.graduation_year as class_of,
  s.name as school,
  res.time_cs,
  FLOOR(res.time_cs / 6000) || ':' ||
    LPAD(FLOOR((res.time_cs % 6000) / 100)::text, 2, '0') || '.' ||
    LPAD((res.time_cs % 100)::text, 2, '0') as formatted_time,
  m.name as meet_name,
  r.name as race_name
FROM results res
JOIN athletes a ON a.id = res.athlete_id
JOIN schools s ON s.id = a.current_school_id
JOIN races r ON r.id = res.race_id
JOIN meets m ON m.id = r.meet_id
WHERE res.season_year = 2025
  AND res.time_cs > 0
ORDER BY res.time_cs ASC
LIMIT 10;
