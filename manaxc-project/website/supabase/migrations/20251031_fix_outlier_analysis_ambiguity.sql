-- Fix column ambiguity in get_course_outlier_analysis function
DROP FUNCTION IF EXISTS get_course_outlier_analysis(text, float, float);

CREATE OR REPLACE FUNCTION get_course_outlier_analysis(
  anchor_course_name text DEFAULT 'Crystal Springs, 2.95 Miles',
  improvement_per_two_weeks_cs float DEFAULT 150.0,
  outlier_threshold_cs float DEFAULT 300.0
)
RETURNS TABLE (
  course_id uuid,
  course_name text,
  distance_meters int,
  current_difficulty double precision,
  athlete_count int,
  median_difference_cs float,
  std_dev_cs float,
  outlier_count int,
  outlier_percentage float,
  predicted_normalized_cs float,
  implied_difficulty double precision,
  confidence float
)
LANGUAGE plpgsql
AS $$
DECLARE
  anchor_course_id uuid;
  anchor_distance_meters int;  -- Renamed to avoid ambiguity
  min_distance_meters int;     -- Renamed to avoid ambiguity
  max_distance_meters int;     -- Renamed to avoid ambiguity
BEGIN
  -- Get the anchor course
  SELECT c.id, c.distance_meters
  INTO anchor_course_id, anchor_distance_meters
  FROM courses c
  WHERE c.name = anchor_course_name
  LIMIT 1;

  IF anchor_course_id IS NULL THEN
    RAISE EXCEPTION 'Anchor course not found: %', anchor_course_name;
  END IF;

  -- Only compare courses within 15% distance
  min_distance_meters := FLOOR(anchor_distance_meters * 0.85);
  max_distance_meters := CEIL(anchor_distance_meters * 1.15);

  RETURN QUERY
  WITH athlete_course_medians AS (
    SELECT
      r.athlete_id,
      ra.course_id,
      c.name as course_name,
      c.distance_meters as course_distance,
      c.difficulty_rating::float as difficulty_rating,
      PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY (r.time_cs::float * 1609.344 / c.distance_meters) / c.difficulty_rating::float
      ) as median_normalized_cs,
      MIN(m.meet_date) as first_race_date,
      MAX(m.meet_date) as last_race_date,
      COUNT(*) as race_count
    FROM results r
    JOIN races ra ON r.race_id = ra.id
    JOIN courses c ON ra.course_id = c.id
    JOIN meets m ON ra.meet_id = m.id
    WHERE r.time_cs IS NOT NULL
      AND c.distance_meters BETWEEN min_distance_meters AND max_distance_meters
    GROUP BY r.athlete_id, ra.course_id, c.name, c.distance_meters, c.difficulty_rating
  ),
  anchor_athlete_times AS (
    SELECT
      athlete_id,
      median_normalized_cs as anchor_normalized_cs,
      first_race_date as anchor_first_date,
      last_race_date as anchor_last_date
    FROM athlete_course_medians
    WHERE course_id = anchor_course_id
  ),
  athlete_comparisons AS (
    SELECT
      acm.course_id,
      acm.course_name,
      acm.course_distance,
      acm.difficulty_rating,
      acm.athlete_id,
      acm.median_normalized_cs as course_normalized_cs,
      aat.anchor_normalized_cs,
      acm.median_normalized_cs - aat.anchor_normalized_cs as raw_difference_cs,
      -- Time adjustment for improvement (using fixed rate for single season)
      EXTRACT(EPOCH FROM (acm.last_race_date - aat.anchor_last_date)) / (14.0 * 86400.0) as two_week_periods,
      (EXTRACT(EPOCH FROM (acm.last_race_date - aat.anchor_last_date)) / (14.0 * 86400.0)) * improvement_per_two_weeks_cs as expected_improvement_cs,
      -- Adjusted difference
      (acm.median_normalized_cs - aat.anchor_normalized_cs) -
        ((EXTRACT(EPOCH FROM (acm.last_race_date - aat.anchor_last_date)) / (14.0 * 86400.0)) * improvement_per_two_weeks_cs) as adjusted_difference_cs
    FROM athlete_course_medians acm
    JOIN anchor_athlete_times aat ON acm.athlete_id = aat.athlete_id
    WHERE acm.course_id != anchor_course_id
  ),
  course_statistics AS (
    SELECT
      course_id,
      course_name,
      course_distance,
      difficulty_rating,
      COUNT(*) as athlete_count,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY adjusted_difference_cs) as median_diff_cs,
      STDDEV(adjusted_difference_cs) as std_dev_cs,
      COUNT(CASE WHEN ABS(adjusted_difference_cs) > outlier_threshold_cs THEN 1 END) as outlier_count,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY course_normalized_cs) as median_course_normalized_cs,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY anchor_normalized_cs) as median_anchor_normalized_cs
    FROM athlete_comparisons
    GROUP BY course_id, course_name, course_distance, difficulty_rating
    HAVING COUNT(*) >= 10
  )
  SELECT
    cs.course_id,
    cs.course_name,
    cs.course_distance::int as distance_meters,
    cs.difficulty_rating as current_difficulty,
    cs.athlete_count::int,
    cs.median_diff_cs::float,
    cs.std_dev_cs::float,
    cs.outlier_count::int,
    (cs.outlier_count::float / cs.athlete_count::float * 100.0)::float as outlier_percentage,
    cs.median_anchor_normalized_cs::float as predicted_normalized_cs,
    (cs.difficulty_rating * (cs.median_anchor_normalized_cs / cs.median_course_normalized_cs))::float as implied_difficulty,
    (
      LEAST(1.0, cs.athlete_count::float / 100.0) *
      (1.0 - LEAST(0.5, cs.std_dev_cs / 500.0))
    )::float as confidence
  FROM course_statistics cs
  ORDER BY ABS(cs.median_diff_cs) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_course_outlier_analysis TO service_role, authenticated;

COMMENT ON FUNCTION get_course_outlier_analysis IS
'Malcolm Slaney outlier analysis with fixed variable naming to avoid column ambiguity. Filters to courses within ±15% distance of anchor.';
