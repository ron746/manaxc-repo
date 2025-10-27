-- Dual Comparison System: Track Mile + Championship Course
-- Every athlete gets TWO comparison metrics:
-- 1. Track Mile Equivalent (universal baseline everyone understands)
-- 2. Championship Course Time (what coaches need for meet planning)
--
-- For Westmont: Championship = Crystal Springs 2.95 mile
-- Future: Allow coaches to select their own championship course

-- Step 1: Add championship course configuration (for future multi-team support)
CREATE TABLE IF NOT EXISTS team_championship_courses (
  id SERIAL PRIMARY KEY,
  school_id UUID REFERENCES schools(id),
  course_id INTEGER REFERENCES courses(id),
  season_year INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(school_id, season_year)
);

-- Step 2: Set Westmont's championship course (Crystal Springs 4748m)
-- Note: We'll add this after we have school_id for Westmont
-- For now, Crystal Springs 4748m is the default championship course

-- Step 3: Create comprehensive athlete PR view with BOTH metrics
DROP MATERIALIZED VIEW IF EXISTS athlete_comparison_metrics CASCADE;

CREATE MATERIALIZED VIEW athlete_comparison_metrics AS
SELECT
  r.athlete_id,
  -- Track Mile Equivalent (universal baseline)
  MIN(r.time_cs * c.track_mile_rating) as best_track_mile_cs,
  -- Crystal Springs 2.95 Equivalent (championship baseline)
  MIN(r.time_cs * c.xc_time_rating) as best_crystal_equiv_cs,
  -- Raw best time (for reference)
  MIN(r.time_cs) as best_raw_time_cs,
  -- Course where track mile PR was achieved
  (
    SELECT ra2.course_id
    FROM results r2
    JOIN races ra2 ON ra2.id = r2.race_id
    JOIN courses c2 ON c2.id = ra2.course_id
    WHERE r2.athlete_id = r.athlete_id
      AND r2.time_cs > 0
    ORDER BY r2.time_cs * c2.track_mile_rating ASC
    LIMIT 1
  ) as track_mile_pr_course_id,
  -- Course where Crystal Springs PR was achieved
  (
    SELECT ra3.course_id
    FROM results r3
    JOIN races ra3 ON ra3.id = r3.race_id
    JOIN courses c3 ON c3.id = ra3.course_id
    WHERE r3.athlete_id = r.athlete_id
      AND r3.time_cs > 0
    ORDER BY r3.time_cs * c3.xc_time_rating ASC
    LIMIT 1
  ) as crystal_equiv_pr_course_id,
  -- Count of races
  COUNT(*) as total_races,
  COUNT(DISTINCT ra.course_id) as courses_raced,
  MIN(r.season_year) as first_season,
  MAX(r.season_year) as last_season
FROM results r
JOIN races ra ON ra.id = r.race_id
JOIN courses c ON c.id = ra.course_id
WHERE r.time_cs > 0
GROUP BY r.athlete_id;

-- Create indexes
CREATE INDEX idx_athlete_comparison_metrics_athlete ON athlete_comparison_metrics(athlete_id);
CREATE INDEX idx_athlete_comparison_metrics_track_mile ON athlete_comparison_metrics(best_track_mile_cs);
CREATE INDEX idx_athlete_comparison_metrics_crystal ON athlete_comparison_metrics(best_crystal_equiv_cs);

-- Step 4: Top 50 athletes with BOTH metrics (Male)
SELECT
  ROW_NUMBER() OVER (ORDER BY pr.best_track_mile_cs) as track_mile_rank,
  ROW_NUMBER() OVER (ORDER BY pr.best_crystal_equiv_cs) as crystal_rank,
  a.full_name,
  s.name as school,
  a.graduation_year,
  -- Track Mile PR
  FLOOR(pr.best_track_mile_cs::integer / 6000)::text || ':' ||
  LPAD(FLOOR((pr.best_track_mile_cs::integer % 6000) / 100)::text, 2, '0') || '.' ||
  LPAD((pr.best_track_mile_cs::integer % 100)::text, 2, '0') as track_mile_pr,
  v1.name as track_mile_course,
  -- Crystal Springs Equivalent
  FLOOR(pr.best_crystal_equiv_cs::integer / 6000)::text || ':' ||
  LPAD(FLOOR((pr.best_crystal_equiv_cs::integer % 6000) / 100)::text, 2, '0') || '.' ||
  LPAD((pr.best_crystal_equiv_cs::integer % 100)::text, 2, '0') as crystal_equiv_pr,
  v2.name as crystal_equiv_course,
  pr.total_races,
  pr.first_season || '-' || pr.last_season as seasons
FROM athlete_comparison_metrics pr
JOIN athletes a ON a.id = pr.athlete_id
JOIN schools s ON s.id = a.current_school_id
LEFT JOIN courses c1 ON c1.id = pr.track_mile_pr_course_id
LEFT JOIN venues v1 ON v1.id = c1.venue_id
LEFT JOIN courses c2 ON c2.id = pr.crystal_equiv_pr_course_id
LEFT JOIN venues v2 ON v2.id = c2.venue_id
WHERE a.gender::text = 'M'  -- Male
ORDER BY pr.best_track_mile_cs ASC
LIMIT 50;

-- Step 5: Top 50 athletes with BOTH metrics (Female)
SELECT
  ROW_NUMBER() OVER (ORDER BY pr.best_track_mile_cs) as track_mile_rank,
  ROW_NUMBER() OVER (ORDER BY pr.best_crystal_equiv_cs) as crystal_rank,
  a.full_name,
  s.name as school,
  a.graduation_year,
  -- Track Mile PR
  FLOOR(pr.best_track_mile_cs::integer / 6000)::text || ':' ||
  LPAD(FLOOR((pr.best_track_mile_cs::integer % 6000) / 100)::text, 2, '0') || '.' ||
  LPAD((pr.best_track_mile_cs::integer % 100)::text, 2, '0') as track_mile_pr,
  v1.name as track_mile_course,
  -- Crystal Springs Equivalent
  FLOOR(pr.best_crystal_equiv_cs::integer / 6000)::text || ':' ||
  LPAD(FLOOR((pr.best_crystal_equiv_cs::integer % 6000) / 100)::text, 2, '0') || '.' ||
  LPAD((pr.best_crystal_equiv_cs::integer % 100)::text, 2, '0') as crystal_equiv_pr,
  v2.name as crystal_equiv_course,
  pr.total_races,
  pr.first_season || '-' || pr.last_season as seasons
FROM athlete_comparison_metrics pr
JOIN athletes a ON a.id = pr.athlete_id
JOIN schools s ON s.id = a.current_school_id
LEFT JOIN courses c1 ON c1.id = pr.track_mile_pr_course_id
LEFT JOIN venues v1 ON v1.id = c1.venue_id
LEFT JOIN courses c2 ON c2.id = pr.crystal_equiv_pr_course_id
LEFT JOIN venues v2 ON v2.id = c2.venue_id
WHERE a.gender::text = 'F'  -- Female
ORDER BY pr.best_track_mile_cs ASC
LIMIT 50;

-- Step 6: Example athlete comparison
-- Show how same athlete looks in both systems
SELECT
  a.full_name,
  -- Track Mile (universal)
  FLOOR(pr.best_track_mile_cs::integer / 6000)::text || ':' ||
  LPAD(FLOOR((pr.best_track_mile_cs::integer % 6000) / 100)::text, 2, '0') || '.' ||
  LPAD((pr.best_track_mile_cs::integer % 100)::text, 2, '0') as track_mile_pr,
  -- Crystal Springs (championship)
  FLOOR(pr.best_crystal_equiv_cs::integer / 6000)::text || ':' ||
  LPAD(FLOOR((pr.best_crystal_equiv_cs::integer % 6000) / 100)::text, 2, '0') || '.' ||
  LPAD((pr.best_crystal_equiv_cs::integer % 100)::text, 2, '0') as crystal_equiv_pr,
  -- Interpretation
  'Track Mile = recruiting/comparison, Crystal = meet planning' as use_case
FROM athlete_comparison_metrics pr
JOIN athletes a ON a.id = pr.athlete_id
ORDER BY pr.best_track_mile_cs ASC
LIMIT 5;

-- Step 7: Summary
SELECT
  'Dual Comparison System Active' as status,
  COUNT(*) as total_athletes,
  COUNT(*) FILTER (WHERE best_track_mile_cs IS NOT NULL) as athletes_with_track_mile,
  COUNT(*) FILTER (WHERE best_crystal_equiv_cs IS NOT NULL) as athletes_with_crystal_equiv,
  ROUND(AVG(total_races), 1) as avg_races_per_athlete
FROM athlete_comparison_metrics;

-- Step 8: Team rankings preview (both metrics)
-- Top 10 teams by average Track Mile equivalent (top 7 runners)
WITH team_track_mile AS (
  SELECT
    a.current_school_id,
    s.name as school_name,
    a.gender,
    pr.athlete_id,
    pr.best_track_mile_cs,
    ROW_NUMBER() OVER (PARTITION BY a.current_school_id, a.gender ORDER BY pr.best_track_mile_cs) as team_rank
  FROM athlete_comparison_metrics pr
  JOIN athletes a ON a.id = pr.athlete_id
  JOIN schools s ON s.id = a.current_school_id
  WHERE pr.best_track_mile_cs IS NOT NULL
)
SELECT
  school_name,
  gender::text as gender,
  COUNT(*) as runners,
  FLOOR(AVG(best_track_mile_cs)::integer / 6000)::text || ':' ||
  LPAD(FLOOR((AVG(best_track_mile_cs)::integer % 6000) / 100)::text, 2, '0') || '.' ||
  LPAD((AVG(best_track_mile_cs)::integer % 100)::text, 2, '0') as avg_track_mile_top7
FROM team_track_mile
WHERE team_rank <= 7
GROUP BY current_school_id, school_name, gender
HAVING COUNT(*) = 7  -- Must have 7 runners
ORDER BY AVG(best_track_mile_cs) ASC
LIMIT 10;
