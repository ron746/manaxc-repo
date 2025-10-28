-- Create a function to get season best times per athlete per course
-- This dramatically reduces the amount of data transferred
-- Instead of fetching all results, we only get best times

CREATE OR REPLACE FUNCTION get_season_best_times(
  p_school_id UUID,
  p_season_year INTEGER
)
RETURNS TABLE (
  athlete_id UUID,
  athlete_name TEXT,
  athlete_gender TEXT,
  athlete_grad_year INTEGER,
  course_id UUID,
  course_name TEXT,
  course_difficulty NUMERIC,
  course_distance INTEGER,
  best_time_cs INTEGER,
  best_normalized_time_cs INTEGER,
  meet_id UUID,
  race_id UUID,
  result_id UUID,
  meet_name TEXT,
  meet_date DATE
) AS $$
BEGIN
  RETURN QUERY
  WITH best_times AS (
    SELECT DISTINCT ON (r.athlete_id, ra.course_id)
      r.athlete_id,
      ra.course_id,
      r.time_cs,
      r.normalized_time_cs,
      r.meet_id,
      r.race_id,
      r.id as result_id,
      m.name as meet_name,
      m.meet_date
    FROM results r
    JOIN athletes a ON r.athlete_id = a.id
    JOIN races ra ON r.race_id = ra.id
    JOIN meets m ON r.meet_id = m.id
    WHERE a.school_id = p_school_id
      AND m.season_year = p_season_year
      AND r.time_cs > 0
    ORDER BY r.athlete_id, ra.course_id, r.time_cs ASC
  )
  SELECT
    bt.athlete_id,
    a.name as athlete_name,
    a.gender as athlete_gender,
    a.grad_year as athlete_grad_year,
    bt.course_id,
    c.name as course_name,
    c.difficulty_rating as course_difficulty,
    c.distance_meters as course_distance,
    bt.time_cs as best_time_cs,
    bt.normalized_time_cs as best_normalized_time_cs,
    bt.meet_id,
    bt.race_id,
    bt.result_id,
    bt.meet_name,
    bt.meet_date
  FROM best_times bt
  JOIN athletes a ON bt.athlete_id = a.id
  JOIN courses c ON bt.course_id = c.id
  ORDER BY a.name, c.name;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comment
COMMENT ON FUNCTION get_season_best_times IS
  'Returns each athlete''s best time for each course they ran during a season. ' ||
  'This function reduces data transfer by pre-aggregating results server-side, ' ||
  'avoiding the 1000-record Supabase limit for schools with many results.';

-- Create an index to make this function faster
CREATE INDEX IF NOT EXISTS idx_results_athlete_race_time
  ON results(athlete_id, race_id, time_cs);
