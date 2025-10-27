-- Refresh athlete PR materialized view
-- Run after importing new data

-- 1. Refresh the materialized view
REFRESH MATERIALIZED VIEW athlete_xc_times_v3;

-- 2. Verify PR calculations
SELECT 'Total Athletes with PRs' as metric, COUNT(*) as count
FROM athlete_xc_times_v3;

-- 3. Top 20 PRs (Male)
SELECT 'Top 20 Male PRs' as category,
  a.full_name,
  s.name as school,
  a.graduation_year,
  FLOOR(pr.best_xc_time_cs / 6000)::text || ':' ||
  LPAD(FLOOR((pr.best_xc_time_cs % 6000) / 100)::text, 2, '0') || '.' ||
  LPAD((pr.best_xc_time_cs % 100)::text, 2, '0') as pr_time
FROM athlete_xc_times_v3 pr
JOIN athletes a ON a.id = pr.athlete_id
JOIN schools s ON s.id = a.school_id
WHERE a.gender = false  -- Male
ORDER BY pr.best_xc_time_cs ASC
LIMIT 20;

-- 4. Top 20 PRs (Female)
SELECT 'Top 20 Female PRs' as category,
  a.full_name,
  s.name as school,
  a.graduation_year,
  FLOOR(pr.best_xc_time_cs / 6000)::text || ':' ||
  LPAD(FLOOR((pr.best_xc_time_cs % 6000) / 100)::text, 2, '0') || '.' ||
  LPAD((pr.best_xc_time_cs % 100)::text, 2, '0') as pr_time
FROM athlete_xc_times_v3 pr
JOIN athletes a ON a.id = pr.athlete_id
JOIN schools s ON s.id = a.school_id
WHERE a.gender = true  -- Female
ORDER BY pr.best_xc_time_cs ASC
LIMIT 20;

-- 5. Athlete progression analysis (4-year athletes)
SELECT 'Four-Year Progression' as category,
  a.full_name,
  s.name as school,
  a.graduation_year,
  MIN(CASE WHEN r.season_year = 2022 THEN r.time_cs * ra.xc_time_rating END) as y2022_best,
  MIN(CASE WHEN r.season_year = 2023 THEN r.time_cs * ra.xc_time_rating END) as y2023_best,
  MIN(CASE WHEN r.season_year = 2024 THEN r.time_cs * ra.xc_time_rating END) as y2024_best,
  MIN(CASE WHEN r.season_year = 2025 THEN r.time_cs * ra.xc_time_rating END) as y2025_best
FROM results r
JOIN races ra ON ra.id = r.race_id
JOIN athletes a ON a.id = r.athlete_id
JOIN schools s ON s.id = a.school_id
WHERE r.time_cs > 0
  AND r.athlete_id IN (
    SELECT athlete_id
    FROM results
    GROUP BY athlete_id
    HAVING COUNT(DISTINCT season_year) = 4
  )
GROUP BY a.id, a.full_name, s.name, a.graduation_year
ORDER BY (
  COALESCE(MIN(CASE WHEN r.season_year = 2025 THEN r.time_cs * ra.xc_time_rating END), 999999)
) ASC
LIMIT 50;
