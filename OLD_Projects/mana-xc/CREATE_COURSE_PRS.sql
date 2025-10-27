-- Create per-course PR materialized view
-- This gives each athlete's best time at each course (RAW times, no normalization yet)
-- Run this in Supabase SQL Editor

-- IMPORTANT: This does NOT use course ratings yet!
-- We are tracking per-course PRs only (e.g., "John's best at Crystal Springs")
-- XC Time PRs (normalized across courses) require AI course rating model first
--
-- Baseline: Crystal Springs 2.95 Mile will ALWAYS have rating = 1.000
-- See COURSE_RATING_BASELINE.md for full methodology

-- Drop if exists (in case we need to recreate)
DROP MATERIALIZED VIEW IF EXISTS athlete_course_prs;

-- Create the view
CREATE MATERIALIZED VIEW athlete_course_prs AS
SELECT
  r.athlete_id,
  ra.course_id,
  MIN(r.time_cs) as best_time_cs,
  COUNT(*) as times_raced_here,
  MIN(r.season_year) as first_year,
  MAX(r.season_year) as last_year
FROM results r
JOIN races ra ON ra.id = r.race_id
WHERE r.time_cs > 0
  AND ra.course_id IS NOT NULL
GROUP BY r.athlete_id, ra.course_id;

-- Create index for faster lookups
CREATE INDEX idx_athlete_course_prs_athlete ON athlete_course_prs(athlete_id);
CREATE INDEX idx_athlete_course_prs_course ON athlete_course_prs(course_id);
CREATE INDEX idx_athlete_course_prs_time ON athlete_course_prs(best_time_cs);

-- Verify creation
SELECT 'Total Athlete-Course PRs' as metric, COUNT(*) as count
FROM athlete_course_prs;

-- Example: Top 10 PRs at each course
SELECT
  v.name || ' (' || c.distance_meters || 'm)' as course,
  a.full_name as athlete,
  s.name as school,
  a.graduation_year,
  FLOOR(pr.best_time_cs / 6000)::text || ':' ||
  LPAD(FLOOR((pr.best_time_cs % 6000) / 100)::text, 2, '0') || '.' ||
  LPAD((pr.best_time_cs % 100)::text, 2, '0') as pr_time,
  pr.times_raced_here,
  pr.first_year || '-' || pr.last_year as years_competed
FROM athlete_course_prs pr
JOIN athletes a ON a.id = pr.athlete_id
JOIN courses c ON c.id = pr.course_id
JOIN venues v ON v.id = c.venue_id
JOIN schools s ON s.id = a.current_school_id
ORDER BY v.name, c.distance_meters, pr.best_time_cs ASC;

-- Course records (absolute fastest at each course)
SELECT
  v.name as venue,
  v.city,
  c.distance_meters,
  c.layout_version,
  MIN(pr.best_time_cs) as course_record_cs,
  FLOOR(MIN(pr.best_time_cs) / 6000)::text || ':' ||
  LPAD(FLOOR((MIN(pr.best_time_cs) % 6000) / 100)::text, 2, '0') || '.' ||
  LPAD((MIN(pr.best_time_cs) % 100)::text, 2, '0') as course_record
FROM athlete_course_prs pr
JOIN courses c ON c.id = pr.course_id
JOIN venues v ON v.id = c.venue_id
GROUP BY v.id, v.name, v.city, c.id, c.distance_meters, c.layout_version
ORDER BY course_record_cs ASC;
