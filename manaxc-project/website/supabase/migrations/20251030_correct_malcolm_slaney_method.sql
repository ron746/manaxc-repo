-- CORRECT implementation of Malcolm Slaney's network calibration method
-- Uses normalized time differences (not ratios) and accounts for athlete improvement over time

DROP FUNCTION IF EXISTS get_course_outlier_analysis(text, float, float);

CREATE OR REPLACE FUNCTION get_course_outlier_analysis(
  anchor_course_name text DEFAULT 'Crystal Springs, 2.95 Miles',
  improvement_per_two_weeks_cs float DEFAULT 150.0,  -- 1.5 seconds per mile per 2 weeks
  outlier_threshold_cs float DEFAULT 300.0  -- 3 seconds per mile
)
RETURNS TABLE (
  course_id uuid,
  course_name text,
  distance_meters int,
  current_difficulty double precision,
  athlete_count int,
  median_difference_cs float,  -- How much faster/slower than anchor (adjusted for improvement)
  std_dev_cs float,
  outlier_count int,  -- Athletes with difference > threshold
  outlier_percentage float,
  predicted_normalized_cs float,  -- What normalized time SHOULD be
  implied_difficulty double precision,  -- Reverse-engineered difficulty
  confidence float
)
LANGUAGE plpgsql
AS $$
DECLARE
  anchor_course_id uuid;
  anchor_distance int;
  min_distance int;
  max_distance int;
BEGIN
  -- Get the anchor course
  SELECT id, distance_meters INTO anchor_course_id, anchor_distance
  FROM courses
  WHERE name = anchor_course_name
  LIMIT 1;

  IF anchor_course_id IS NULL THEN
    RAISE EXCEPTION 'Anchor course not found: %', anchor_course_name;
  END IF;

  -- Only compare courses within 15% distance (to avoid distance-effect confounding)
  min_distance := FLOOR(anchor_distance * 0.85);
  max_distance := CEIL(anchor_distance * 1.15);

  RETURN QUERY
  WITH athlete_course_medians AS (
    -- Get median normalized time for each athlete on each course
    SELECT
      r.athlete_id,
      ra.course_id,
      c.name as course_name,
      c.distance_meters,
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
      AND c.distance_meters BETWEEN min_distance AND max_distance
    GROUP BY r.athlete_id, ra.course_id, c.name, c.distance_meters, c.difficulty_rating
  ),
  anchor_athlete_times AS (
    -- Get anchor course times for each athlete
    SELECT
      athlete_id,
      median_normalized_cs as anchor_normalized_cs,
      first_race_date as anchor_first_date,
      last_race_date as anchor_last_date
    FROM athlete_course_medians
    WHERE course_id = anchor_course_id
  ),
  athlete_comparisons AS (
    -- Compare each athlete's performance on target course vs anchor
    SELECT
      acm.course_id,
      acm.course_name,
      acm.distance_meters,
      acm.difficulty_rating,
      acm.athlete_id,
      acm.median_normalized_cs as course_normalized_cs,
      aat.anchor_normalized_cs,
      acm.median_normalized_cs - aat.anchor_normalized_cs as raw_difference_cs,
      -- Calculate improvement adjustment
      -- If course race was AFTER anchor, athlete may have improved (negative adjustment)
      -- If course race was BEFORE anchor, athlete may have been worse (positive adjustment)
      EXTRACT(EPOCH FROM (acm.last_race_date - aat.anchor_last_date)) / (14.0 * 86400.0) as two_week_periods,
      -- Expected improvement (negative if later, positive if earlier)
      (EXTRACT(EPOCH FROM (acm.last_race_date - aat.anchor_last_date)) / (14.0 * 86400.0)) * improvement_per_two_weeks_cs as expected_improvement_cs,
      -- Adjusted difference: if athlete improved, we ADD that back to see "what would they have run if at same fitness"
      (acm.median_normalized_cs - aat.anchor_normalized_cs) +
        ((EXTRACT(EPOCH FROM (acm.last_race_date - aat.anchor_last_date)) / (14.0 * 86400.0)) * improvement_per_two_weeks_cs) as adjusted_difference_cs
    FROM athlete_course_medians acm
    JOIN anchor_athlete_times aat ON acm.athlete_id = aat.athlete_id
    WHERE acm.course_id != anchor_course_id
  ),
  course_statistics AS (
    -- Aggregate statistics per course
    SELECT
      course_id,
      course_name,
      distance_meters,
      difficulty_rating,
      COUNT(*) as athlete_count,
      -- Median difference (positive = slower than anchor, negative = faster than anchor)
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY adjusted_difference_cs) as median_diff_cs,
      STDDEV(adjusted_difference_cs) as std_dev_cs,
      -- Count outliers (athletes with large discrepancies)
      COUNT(CASE WHEN ABS(adjusted_difference_cs) > outlier_threshold_cs THEN 1 END) as outlier_count,
      -- Median actual normalized time on this course
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY course_normalized_cs) as median_course_normalized_cs,
      -- Median anchor normalized time (for these athletes)
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY anchor_normalized_cs) as median_anchor_normalized_cs
    FROM athlete_comparisons
    GROUP BY course_id, course_name, distance_meters, difficulty_rating
    HAVING COUNT(*) >= 10  -- Need at least 10 shared athletes
  )
  SELECT
    cs.course_id,
    cs.course_name,
    cs.distance_meters,
    cs.difficulty_rating as current_difficulty,
    cs.athlete_count::int,
    cs.median_diff_cs::float,
    cs.std_dev_cs::float,
    cs.outlier_count::int,
    (cs.outlier_count::float / cs.athlete_count::float * 100.0)::float as outlier_percentage,
    -- What the normalized time SHOULD be (anchor time, since courses should be equivalent)
    cs.median_anchor_normalized_cs::float as predicted_normalized_cs,
    -- Reverse engineer difficulty: if athletes are too fast, need higher difficulty
    -- ratio = predicted / actual (if predicted > actual, ratio > 1, difficulty increases)
    (cs.difficulty_rating * (cs.median_anchor_normalized_cs / cs.median_course_normalized_cs))::float as implied_difficulty,
    -- Confidence based on sample size and consistency
    LEAST(1.0, cs.athlete_count::float / 100.0) * (1.0 - LEAST(0.5, cs.std_dev_cs / 500.0))::float as confidence
  FROM course_statistics cs
  ORDER BY ABS(cs.median_diff_cs) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_course_outlier_analysis TO service_role, authenticated;

COMMENT ON FUNCTION get_course_outlier_analysis IS
'Malcolm Slaney method: Compare normalized times (not ratios), account for athlete improvement over time (~1.5 sec/mile per 2 weeks), identify statistical outliers. Returns courses where athletes consistently run faster/slower than expected.';

-- Example query to understand the output
-- SELECT * FROM get_course_outlier_analysis('Crystal Springs, 2.95 Miles', 150.0, 300.0);
