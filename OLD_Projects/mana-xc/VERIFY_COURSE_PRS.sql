-- Verify per-course PRs (NO XC time normalization yet)
-- Run after importing new data and creating athlete_course_prs view

-- 1. Refresh the per-course PR materialized view
REFRESH MATERIALIZED VIEW athlete_course_prs;

-- 2. Verify PR calculations
SELECT 'Total Athlete-Course PRs' as metric, COUNT(*) as count
FROM athlete_course_prs;

SELECT 'Unique Athletes with PRs' as metric, COUNT(DISTINCT athlete_id) as count
FROM athlete_course_prs;

SELECT 'Unique Courses with Results' as metric, COUNT(DISTINCT course_id) as count
FROM athlete_course_prs;

-- 3. Course records by gender (top 10 fastest times at each course)
-- Male course records
SELECT 'Male Course Records' as category,
  v.name || ' (' || c.distance_meters || 'm)' as course,
  a.full_name as athlete,
  s.name as school,
  a.graduation_year,
  FLOOR(pr.best_time_cs / 6000)::text || ':' ||
  LPAD(FLOOR((pr.best_time_cs % 6000) / 100)::text, 2, '0') || '.' ||
  LPAD((pr.best_time_cs % 100)::text, 2, '0') as pr_time,
  pr.times_raced_here,
  pr.first_year || '-' || pr.last_year as years
FROM athlete_course_prs pr
JOIN athletes a ON a.id = pr.athlete_id
JOIN courses c ON c.id = pr.course_id
JOIN venues v ON v.id = c.venue_id
JOIN schools s ON s.id = a.current_school_id
WHERE a.gender = false  -- Male
  AND pr.course_id IN (
    -- Get top 5 most competitive courses (most results)
    SELECT course_id
    FROM athlete_course_prs
    GROUP BY course_id
    ORDER BY COUNT(*) DESC
    LIMIT 5
  )
ORDER BY v.name, c.distance_meters, pr.best_time_cs ASC
LIMIT 50;

-- Female course records
SELECT 'Female Course Records' as category,
  v.name || ' (' || c.distance_meters || 'm)' as course,
  a.full_name as athlete,
  s.name as school,
  a.graduation_year,
  FLOOR(pr.best_time_cs / 6000)::text || ':' ||
  LPAD(FLOOR((pr.best_time_cs % 6000) / 100)::text, 2, '0') || '.' ||
  LPAD((pr.best_time_cs % 100)::text, 2, '0') as pr_time,
  pr.times_raced_here,
  pr.first_year || '-' || pr.last_year as years
FROM athlete_course_prs pr
JOIN athletes a ON a.id = pr.athlete_id
JOIN courses c ON c.id = pr.course_id
JOIN venues v ON v.id = c.venue_id
JOIN schools s ON s.id = a.current_school_id
WHERE a.gender = true  -- Female
  AND pr.course_id IN (
    -- Get top 5 most competitive courses (most results)
    SELECT course_id
    FROM athlete_course_prs
    GROUP BY course_id
    ORDER BY COUNT(*) DESC
    LIMIT 5
  )
ORDER BY v.name, c.distance_meters, pr.best_time_cs ASC
LIMIT 50;

-- 4. Athlete progression analysis (4-year athletes, RAW times only)
SELECT 'Four-Year Progression (Raw Times)' as category,
  a.full_name,
  s.name as school,
  a.graduation_year,
  -- Raw best times per year (no normalization)
  MIN(CASE WHEN r.season_year = 2022 THEN r.time_cs END) as y2022_best_cs,
  MIN(CASE WHEN r.season_year = 2023 THEN r.time_cs END) as y2023_best_cs,
  MIN(CASE WHEN r.season_year = 2024 THEN r.time_cs END) as y2024_best_cs,
  MIN(CASE WHEN r.season_year = 2025 THEN r.time_cs END) as y2025_best_cs,
  -- Formatted times
  FLOOR(MIN(CASE WHEN r.season_year = 2022 THEN r.time_cs END) / 6000)::text || ':' ||
  LPAD(FLOOR((MIN(CASE WHEN r.season_year = 2022 THEN r.time_cs END) % 6000) / 100)::text, 2, '0') || '.' ||
  LPAD((MIN(CASE WHEN r.season_year = 2022 THEN r.time_cs END) % 100)::text, 2, '0') as y2022_time,
  FLOOR(MIN(CASE WHEN r.season_year = 2025 THEN r.time_cs END) / 6000)::text || ':' ||
  LPAD(FLOOR((MIN(CASE WHEN r.season_year = 2025 THEN r.time_cs END) % 6000) / 100)::text, 2, '0') || '.' ||
  LPAD((MIN(CASE WHEN r.season_year = 2025 THEN r.time_cs END) % 100)::text, 2, '0') as y2025_time,
  -- Improvement calculation
  (MIN(CASE WHEN r.season_year = 2022 THEN r.time_cs END) -
   MIN(CASE WHEN r.season_year = 2025 THEN r.time_cs END)) as improvement_cs
FROM results r
JOIN races ra ON ra.id = r.race_id
JOIN athletes a ON a.id = r.athlete_id
JOIN schools s ON s.id = a.current_school_id
WHERE r.time_cs > 0
  AND r.athlete_id IN (
    -- Athletes who competed all 4 years
    SELECT athlete_id
    FROM results
    GROUP BY athlete_id
    HAVING COUNT(DISTINCT season_year) = 4
  )
GROUP BY a.id, a.full_name, s.name, a.graduation_year
HAVING MIN(CASE WHEN r.season_year = 2025 THEN r.time_cs END) IS NOT NULL
  AND MIN(CASE WHEN r.season_year = 2022 THEN r.time_cs END) IS NOT NULL
ORDER BY improvement_cs DESC  -- Most improved first
LIMIT 50;

-- 5. Athletes with most course PRs (versatile racers)
SELECT 'Most Versatile Athletes' as category,
  a.full_name,
  s.name as school,
  a.graduation_year,
  COUNT(*) as courses_raced,
  SUM(pr.times_raced_here) as total_races,
  -- Best PR across all courses
  MIN(pr.best_time_cs) as overall_pr_cs,
  FLOOR(MIN(pr.best_time_cs) / 6000)::text || ':' ||
  LPAD(FLOOR((MIN(pr.best_time_cs) % 6000) / 100)::text, 2, '0') || '.' ||
  LPAD((MIN(pr.best_time_cs) % 100)::text, 2, '0') as overall_pr
FROM athlete_course_prs pr
JOIN athletes a ON a.id = pr.athlete_id
JOIN schools s ON s.id = a.current_school_id
GROUP BY a.id, a.full_name, s.name, a.graduation_year
ORDER BY courses_raced DESC, overall_pr_cs ASC
LIMIT 50;
