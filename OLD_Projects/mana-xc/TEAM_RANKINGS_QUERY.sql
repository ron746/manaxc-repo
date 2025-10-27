-- Team Rankings with Correct XC Scoring
-- Top 5 runners score (can race up to 7)
-- Show BOTH metrics:
-- 1. Average Track Mile PR (for comparison)
-- 2. Total Crystal Springs Time (for championship projection)

WITH team_rosters AS (
  SELECT
    a.current_school_id,
    s.name as school_name,
    a.gender,
    pr.athlete_id,
    a.full_name,
    a.graduation_year,
    pr.best_track_mile_cs,
    pr.best_crystal_equiv_cs,
    ROW_NUMBER() OVER (
      PARTITION BY a.current_school_id, a.gender
      ORDER BY pr.best_crystal_equiv_cs ASC
    ) as team_rank
  FROM athlete_comparison_metrics pr
  JOIN athletes a ON a.id = pr.athlete_id
  JOIN schools s ON s.id = a.current_school_id
  WHERE pr.best_crystal_equiv_cs IS NOT NULL
    AND pr.best_track_mile_cs IS NOT NULL
)
SELECT
  school_name,
  gender::text as gender,
  COUNT(*) as scoring_runners,
  -- Track Mile metrics (average of top 5)
  FLOOR(AVG(best_track_mile_cs)::integer / 6000)::text || ':' ||
  LPAD(FLOOR((AVG(best_track_mile_cs)::integer % 6000) / 100)::text, 2, '0') || '.' ||
  LPAD((AVG(best_track_mile_cs)::integer % 100)::text, 2, '0') as avg_track_mile_top5,
  -- Crystal Springs total team time (sum of top 5)
  FLOOR(SUM(best_crystal_equiv_cs)::integer / 6000)::text || ':' ||
  LPAD(FLOOR((SUM(best_crystal_equiv_cs)::integer % 6000) / 100)::text, 2, '0') || '.' ||
  LPAD((SUM(best_crystal_equiv_cs)::integer % 100)::text, 2, '0') as total_crystal_time_top5,
  -- Average Crystal Springs time (for context)
  FLOOR(AVG(best_crystal_equiv_cs)::integer / 6000)::text || ':' ||
  LPAD(FLOOR((AVG(best_crystal_equiv_cs)::integer % 6000) / 100)::text, 2, '0') || '.' ||
  LPAD((AVG(best_crystal_equiv_cs)::integer % 100)::text, 2, '0') as avg_crystal_time_top5,
  -- Top 5 runner names (for reference)
  STRING_AGG(
    full_name || ' (' ||
    FLOOR(best_crystal_equiv_cs::integer / 6000)::text || ':' ||
    LPAD(FLOOR((best_crystal_equiv_cs::integer % 6000) / 100)::text, 2, '0') || '.' ||
    LPAD((best_crystal_equiv_cs::integer % 100)::text, 2, '0') || ')',
    ', '
    ORDER BY team_rank
  ) as top5_runners
FROM team_rosters
WHERE team_rank <= 5  -- Top 5 scoring runners
GROUP BY current_school_id, school_name, gender
HAVING COUNT(*) = 5  -- Must have full scoring team
ORDER BY SUM(best_crystal_equiv_cs) ASC  -- Rank by total team time
LIMIT 50;

-- Example output interpretation:
-- School: Westmont HS
-- Gender: M
-- Avg Track Mile: 4:39.2 (recruiting metric)
-- Total Crystal Time: 80:15.3 (championship projection - sum of top 5)
-- Avg Crystal Time: 16:03.1 (individual average)
-- Top 5: John Smith (15:45.2), Jane Doe (16:02.4), ...

-- Detailed team roster view (shows all 7 runners if available)
WITH team_rosters AS (
  SELECT
    a.current_school_id,
    s.name as school_name,
    a.gender,
    pr.athlete_id,
    a.full_name,
    a.graduation_year,
    pr.best_track_mile_cs,
    pr.best_crystal_equiv_cs,
    ROW_NUMBER() OVER (
      PARTITION BY a.current_school_id, a.gender
      ORDER BY pr.best_crystal_equiv_cs ASC
    ) as team_rank
  FROM athlete_comparison_metrics pr
  JOIN athletes a ON a.id = pr.athlete_id
  JOIN schools s ON s.id = a.current_school_id
  WHERE pr.best_crystal_equiv_cs IS NOT NULL
)
SELECT
  school_name,
  team_rank,
  full_name,
  graduation_year,
  CASE WHEN team_rank <= 5 THEN '✅ Scoring' ELSE '📊 Displacement' END as role,
  -- Track Mile PR
  FLOOR(best_track_mile_cs::integer / 6000)::text || ':' ||
  LPAD(FLOOR((best_track_mile_cs::integer % 6000) / 100)::text, 2, '0') || '.' ||
  LPAD((best_track_mile_cs::integer % 100)::text, 2, '0') as track_mile_pr,
  -- Crystal Springs Equivalent
  FLOOR(best_crystal_equiv_cs::integer / 6000)::text || ':' ||
  LPAD(FLOOR((best_crystal_equiv_cs::integer % 6000) / 100)::text, 2, '0') || '.' ||
  LPAD((best_crystal_equiv_cs::integer % 100)::text, 2, '0') as crystal_equiv_pr
FROM team_rosters
WHERE school_name = 'Westmont'  -- Example: Show Westmont roster
  AND team_rank <= 7  -- Show all 7 varsity runners
ORDER BY team_rank;
