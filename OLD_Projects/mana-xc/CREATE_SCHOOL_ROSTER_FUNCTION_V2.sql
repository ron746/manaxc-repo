-- Create function to get school roster with all required metrics
-- Returns: name, grade, XC Time PR, Top 3 Season Avg, Season Avg
-- FIXED: Gender field handling to work with any type

CREATE OR REPLACE FUNCTION get_school_roster(
  p_school_id UUID,
  p_season_year INTEGER
)
RETURNS TABLE (
  athlete_id UUID,
  full_name TEXT,
  gender TEXT,
  grade INTEGER,
  graduation_year INTEGER,
  xc_time_pr_cs INTEGER,
  xc_time_pr_track_mile_cs INTEGER,
  top3_season_avg_cs INTEGER,
  season_avg_cs INTEGER,
  race_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH athlete_season_stats AS (
    SELECT
      a.id as athlete_id,
      a.full_name,
      -- Flexible gender handling - convert whatever type it is to text
      CASE
        WHEN a.gender::text = 'true' THEN 'F'
        WHEN a.gender::text = 'false' THEN 'M'
        WHEN a.gender::text IN ('M', 'Male', 'Boys') THEN 'M'
        WHEN a.gender::text IN ('F', 'Female', 'Girls') THEN 'F'
        ELSE 'M'
      END as gender,
      -- Calculate grade from graduation year
      -- If graduation_year = 2025 and season_year = 2024, they were a senior (grade 12)
      -- If graduation_year = 2025 and season_year = 2022, they were a sophomore (grade 10)
      (12 - (a.graduation_year - p_season_year)) as grade,
      a.graduation_year,

      -- Get season results for averages
      ARRAY_AGG(r.time_cs ORDER BY r.time_cs ASC) FILTER (WHERE r.time_cs > 0) as season_times,
      COUNT(r.id) FILTER (WHERE r.time_cs > 0) as race_count
    FROM athletes a
    LEFT JOIN results r ON r.athlete_id = a.id AND r.season_year = p_season_year
    WHERE a.current_school_id = p_school_id
    GROUP BY a.id, a.full_name, a.gender, a.graduation_year
  ),
  athlete_prs AS (
    SELECT
      ass.athlete_id,
      ass.full_name,
      ass.gender,
      ass.grade,
      ass.graduation_year,
      ass.race_count,

      -- XC Time PR from comparison metrics (Crystal Springs equivalent)
      COALESCE(acm.best_crystal_equiv_cs::integer, 0) as xc_time_pr_cs,
      COALESCE(acm.best_track_mile_cs::integer, 0) as xc_time_pr_track_mile_cs,

      -- Top 3 season average (if they have at least 3 races)
      CASE
        WHEN ass.race_count >= 3 THEN
          (ass.season_times[1] + ass.season_times[2] + ass.season_times[3])::integer / 3
        WHEN ass.race_count = 2 THEN
          (ass.season_times[1] + ass.season_times[2])::integer / 2
        WHEN ass.race_count = 1 THEN
          ass.season_times[1]::integer
        ELSE 0
      END as top3_season_avg_cs,

      -- Season average (all races)
      CASE
        WHEN ass.race_count > 0 THEN
          (SELECT AVG(unnest)::integer FROM unnest(ass.season_times))
        ELSE 0
      END as season_avg_cs

    FROM athlete_season_stats ass
    LEFT JOIN athlete_comparison_metrics acm ON acm.athlete_id = ass.athlete_id
  )
  SELECT
    ap.athlete_id,
    ap.full_name,
    ap.gender,
    ap.grade,
    ap.graduation_year,
    ap.xc_time_pr_cs,
    ap.xc_time_pr_track_mile_cs,
    ap.top3_season_avg_cs,
    ap.season_avg_cs,
    ap.race_count::integer
  FROM athlete_prs ap
  WHERE ap.race_count > 0  -- Only show athletes who raced this season
  ORDER BY ap.xc_time_pr_cs ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql STABLE;

-- Test the function with Westmont (example school)
-- First, let's find Westmont's UUID
SELECT id, name FROM schools WHERE name LIKE '%Westmont%' LIMIT 5;

-- Then run the function (replace the UUID with actual Westmont ID)
-- SELECT * FROM get_school_roster('<UUID_HERE>', 2025);
