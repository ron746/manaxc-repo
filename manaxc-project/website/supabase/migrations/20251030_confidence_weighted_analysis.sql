-- Update outlier analysis to weight by course confidence
-- Direct comparisons with high-confidence courses get higher weight

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
  course_confidence double precision,  -- NEW: Course's own confidence
  anchor_confidence double precision,  -- NEW: Anchor course confidence
  athlete_count int,
  median_difference_cs float,
  std_dev_cs float,
  outlier_count int,
  outlier_percentage float,
  predicted_normalized_cs float,
  implied_difficulty double precision,
  comparison_quality float,  -- NEW: Quality of this comparison (0-1)
  final_confidence float  -- NEW: Confidence in this recommendation
)
LANGUAGE plpgsql
AS $$
DECLARE
  anchor_course_id uuid;
  anchor_distance int;
  anchor_conf float;
  min_distance int;
  max_distance int;
BEGIN
  -- Get the anchor course info
  SELECT id, distance_meters, confidence_score
  INTO anchor_course_id, anchor_distance, anchor_conf
  FROM courses
  WHERE name = anchor_course_name
  LIMIT 1;

  IF anchor_course_id IS NULL THEN
    RAISE EXCEPTION 'Anchor course not found: %', anchor_course_name;
  END IF;

  -- Only compare courses within 15% distance
  min_distance := FLOOR(anchor_distance * 0.85);
  max_distance := CEIL(anchor_distance * 1.15);

  RAISE NOTICE 'Anchor: % (confidence: %), Distance range: %m to %m',
    anchor_course_name, anchor_conf, min_distance, max_distance;

  RETURN QUERY
  WITH athlete_course_medians AS (
    -- Get median normalized time for each athlete on each course
    SELECT
      r.athlete_id,
      ra.course_id,
      c.name as course_name,
      c.distance_meters,
      c.difficulty_rating::float as difficulty_rating,
      c.confidence_score::float as course_confidence,
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
    GROUP BY r.athlete_id, ra.course_id, c.name, c.distance_meters, c.difficulty_rating, c.confidence_score
  ),
  anchor_athlete_times AS (
    -- Get anchor course times for each athlete
    SELECT
      athlete_id,
      median_normalized_cs as anchor_normalized_cs,
      first_race_date as anchor_first_date,
      last_race_date as anchor_last_date,
      race_count as anchor_race_count
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
      acm.course_confidence,
      acm.athlete_id,
      acm.median_normalized_cs as course_normalized_cs,
      aat.anchor_normalized_cs,
      acm.median_normalized_cs - aat.anchor_normalized_cs as raw_difference_cs,
      -- Time adjustment for improvement
      EXTRACT(EPOCH FROM (acm.last_race_date - aat.anchor_last_date)) / (14.0 * 86400.0) as two_week_periods,
      (EXTRACT(EPOCH FROM (acm.last_race_date - aat.anchor_last_date)) / (14.0 * 86400.0)) * improvement_per_two_weeks_cs as expected_improvement_cs,
      -- Adjusted difference
      (acm.median_normalized_cs - aat.anchor_normalized_cs) +
        ((EXTRACT(EPOCH FROM (acm.last_race_date - aat.anchor_last_date)) / (14.0 * 86400.0)) * improvement_per_two_weeks_cs) as adjusted_difference_cs,
      -- Quality factors
      acm.race_count as course_race_count,
      aat.anchor_race_count,
      -- Direct comparison quality (more races on each course = higher quality)
      LEAST(1.0, (acm.race_count::float / 3.0) * (aat.anchor_race_count::float / 3.0)) as athlete_quality
    FROM athlete_course_medians acm
    JOIN anchor_athlete_times aat ON acm.athlete_id = aat.athlete_id
    WHERE acm.course_id != anchor_course_id
  ),
  course_statistics AS (
    -- Aggregate statistics per course with confidence weighting
    SELECT
      course_id,
      course_name,
      distance_meters,
      difficulty_rating,
      AVG(course_confidence) as avg_course_confidence,
      COUNT(*) as athlete_count,
      -- Median difference (positive = slower than anchor, negative = faster than anchor)
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY adjusted_difference_cs) as median_diff_cs,
      STDDEV(adjusted_difference_cs) as std_dev_cs,
      -- Count outliers
      COUNT(CASE WHEN ABS(adjusted_difference_cs) > outlier_threshold_cs THEN 1 END) as outlier_count,
      -- Median actual normalized time on this course
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY course_normalized_cs) as median_course_normalized_cs,
      -- Median anchor normalized time (for these athletes)
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY anchor_normalized_cs) as median_anchor_normalized_cs,
      -- Average comparison quality (weighted by athlete quality)
      AVG(athlete_quality) as avg_comparison_quality,
      -- Count of high-quality athlete comparisons (both have 3+ races on each course)
      COUNT(CASE WHEN athlete_quality > 0.7 THEN 1 END)::float / COUNT(*)::float as high_quality_percentage
    FROM athlete_comparisons
    GROUP BY course_id, course_name, distance_meters, difficulty_rating
    HAVING COUNT(*) >= 10  -- Need at least 10 shared athletes
  )
  SELECT
    cs.course_id,
    cs.course_name,
    cs.distance_meters,
    cs.difficulty_rating as current_difficulty,
    cs.avg_course_confidence::float as course_confidence,
    anchor_conf::float as anchor_confidence,
    cs.athlete_count::int,
    cs.median_diff_cs::float,
    cs.std_dev_cs::float,
    cs.outlier_count::int,
    (cs.outlier_count::float / cs.athlete_count::float * 100.0)::float as outlier_percentage,
    cs.median_anchor_normalized_cs::float as predicted_normalized_cs,
    -- Reverse engineer difficulty
    (cs.difficulty_rating * (cs.median_anchor_normalized_cs / cs.median_course_normalized_cs))::float as implied_difficulty,
    -- Comparison quality (0-1): based on athlete comparison quality and high-quality percentage
    (cs.avg_comparison_quality * cs.high_quality_percentage)::float as comparison_quality,
    -- Final confidence: combination of all factors
    (
      anchor_conf *  -- Anchor course confidence (Crystal Springs = 1.0)
      cs.avg_course_confidence *  -- Target course confidence
      LEAST(1.0, cs.athlete_count::float / 100.0) *  -- Sample size
      (1.0 - LEAST(0.5, cs.std_dev_cs / 500.0)) *  -- Consistency (low variance)
      cs.avg_comparison_quality *  -- Quality of athlete comparisons
      cs.high_quality_percentage  -- Percentage of high-quality comparisons
    )::float as final_confidence
  FROM course_statistics cs
  ORDER BY
    -- Prioritize by confidence, then by absolute difference
    (
      anchor_conf * cs.avg_course_confidence *
      LEAST(1.0, cs.athlete_count::float / 100.0) *
      (1.0 - LEAST(0.5, cs.std_dev_cs / 500.0))
    ) DESC,
    ABS(cs.median_diff_cs) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_course_outlier_analysis TO service_role, authenticated;

COMMENT ON FUNCTION get_course_outlier_analysis IS
'Malcolm Slaney method with confidence weighting. Prioritizes direct comparisons with high-confidence anchor courses. Returns final_confidence based on anchor confidence, course confidence, sample size, variance, and comparison quality.';
