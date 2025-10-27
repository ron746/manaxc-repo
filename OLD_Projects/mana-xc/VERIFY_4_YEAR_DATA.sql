-- Comprehensive 4-year data verification
-- Run this in Supabase SQL Editor after importing all seasons

-- 1. Results by season
SELECT 'Results by Season' as metric, season_year, COUNT(*) as count
FROM results
WHERE season_year IS NOT NULL
GROUP BY season_year
ORDER BY season_year;

-- 2. Meets by season
SELECT 'Meets by Season' as metric, season_year, COUNT(*) as count
FROM meets
WHERE season_year IS NOT NULL
GROUP BY season_year
ORDER BY season_year;

-- 3. Unique athletes by graduation year
SELECT 'Athletes by Grad Year' as metric, graduation_year, COUNT(*) as count
FROM athletes
WHERE graduation_year IS NOT NULL
GROUP BY graduation_year
ORDER BY graduation_year;

-- 4. Gender distribution
SELECT 'Gender Distribution' as metric,
  CASE WHEN gender THEN 'Female' ELSE 'Male' END as gender,
  COUNT(*) as count
FROM athletes
GROUP BY gender;

-- 5. Athletes with multiple season results (4-year progressions)
SELECT 'Multi-Season Athletes' as metric,
  COUNT(DISTINCT athlete_id) as athletes_with_multiple_seasons
FROM (
  SELECT athlete_id, COUNT(DISTINCT season_year) as seasons
  FROM results
  GROUP BY athlete_id
  HAVING COUNT(DISTINCT season_year) > 1
) multi;

-- 6. Top 4-year athletes (all 4 seasons)
SELECT 'Athletes with 4 Seasons' as metric,
  COUNT(DISTINCT athlete_id) as four_year_athletes
FROM (
  SELECT athlete_id, COUNT(DISTINCT season_year) as seasons
  FROM results
  GROUP BY athlete_id
  HAVING COUNT(DISTINCT season_year) = 4
) four_year;

-- 7. Data quality checks
SELECT 'Results Missing Time' as metric, COUNT(*) as count
FROM results WHERE time_cs IS NULL OR time_cs = 0
UNION ALL
SELECT 'Results Missing Season', COUNT(*)
FROM results WHERE season_year IS NULL
UNION ALL
SELECT 'Athletes Missing Grad Year', COUNT(*)
FROM athletes WHERE graduation_year IS NULL
UNION ALL
SELECT 'Races Missing Gender', COUNT(*)
FROM races WHERE gender IS NULL
UNION ALL
SELECT 'Races Missing Course', COUNT(*)
FROM races WHERE course_id IS NULL;

-- 8. Average results per race
SELECT 'Avg Results per Race' as metric,
  ROUND(AVG(result_count), 1) as avg_count
FROM (
  SELECT race_id, COUNT(*) as result_count
  FROM results
  GROUP BY race_id
) rc;

-- 9. Schools with most athletes
SELECT 'Top 10 Schools' as metric, s.name, COUNT(DISTINCT a.id) as athlete_count
FROM schools s
JOIN athletes a ON a.school_id = s.id
GROUP BY s.id, s.name
ORDER BY athlete_count DESC
LIMIT 10;

-- 10. Most competitive courses (by total results)
SELECT 'Top 10 Courses' as metric, c.name, COUNT(*) as result_count
FROM courses c
JOIN races r ON r.course_id = c.id
JOIN results res ON res.race_id = r.id
GROUP BY c.id, c.name
ORDER BY result_count DESC
LIMIT 10;
