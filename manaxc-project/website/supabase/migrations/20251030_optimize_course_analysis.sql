-- Optimized SQL function for AI course analysis
-- Instead of querying each athlete individually, process all in one query

CREATE OR REPLACE FUNCTION get_athlete_course_comparisons(target_course_id uuid)
RETURNS TABLE (
  athlete_id uuid,
  athlete_name text,
  this_course_normalized float,
  other_courses_median float,
  difference_cs float,
  other_race_count int
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH target_results AS (
    -- Get all results for target course with normalized times
    SELECT
      r.athlete_id,
      a.name as athlete_name,
      r.time_cs,
      (r.time_cs::float * 1609.344 / c.distance_meters) / c.difficulty_rating as normalized_time
    FROM results r
    JOIN athletes a ON r.athlete_id = a.id
    JOIN races ra ON r.race_id = ra.id
    JOIN courses c ON ra.course_id = c.id
    WHERE ra.course_id = target_course_id
      AND r.time_cs IS NOT NULL
  ),
  other_results AS (
    -- Get all OTHER results for these athletes (not on target course)
    SELECT
      r.athlete_id,
      (r.time_cs::float * 1609.344 / c.distance_meters) / c.difficulty_rating as normalized_time
    FROM results r
    JOIN races ra ON r.race_id = ra.id
    JOIN courses c ON ra.course_id = c.id
    WHERE r.athlete_id IN (SELECT athlete_id FROM target_results)
      AND ra.course_id != target_course_id
      AND r.time_cs IS NOT NULL
  ),
  athlete_medians AS (
    -- Calculate median normalized time on other courses for each athlete
    SELECT
      athlete_id,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY normalized_time) as median_other_norm,
      COUNT(*) as race_count
    FROM other_results
    GROUP BY athlete_id
    HAVING COUNT(*) >= 3  -- Only athletes with at least 3 other races
  )
  SELECT
    tr.athlete_id,
    tr.athlete_name,
    tr.normalized_time as this_course_normalized,
    am.median_other_norm as other_courses_median,
    (tr.normalized_time - am.median_other_norm) as difference_cs,
    am.race_count::int as other_race_count
  FROM target_results tr
  JOIN athlete_medians am ON tr.athlete_id = am.athlete_id
  ORDER BY am.race_count DESC, ABS(tr.normalized_time - am.median_other_norm) DESC;
END;
$$;

-- Optimized SQL function for network calibration
-- Gets shared athlete statistics between anchor and target course in one query

CREATE OR REPLACE FUNCTION get_course_calibration_stats(
  anchor_course_id uuid,
  target_course_id uuid
)
RETURNS TABLE (
  shared_athlete_count int,
  median_ratio float,
  std_dev_ratio float,
  performance_ratios float[]
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH anchor_medians AS (
    -- Get median normalized time for each athlete on anchor course
    SELECT
      r.athlete_id,
      PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY (r.time_cs::float * 1609.344 / c.distance_meters) / c.difficulty_rating
      ) as median_norm
    FROM results r
    JOIN races ra ON r.race_id = ra.id
    JOIN courses c ON ra.course_id = c.id
    WHERE ra.course_id = anchor_course_id
      AND r.time_cs IS NOT NULL
    GROUP BY r.athlete_id
  ),
  target_medians AS (
    -- Get median normalized time for each athlete on target course
    SELECT
      r.athlete_id,
      PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY (r.time_cs::float * 1609.344 / c.distance_meters) / c.difficulty_rating
      ) as median_norm
    FROM results r
    JOIN races ra ON r.race_id = ra.id
    JOIN courses c ON ra.course_id = c.id
    WHERE ra.course_id = target_course_id
      AND r.time_cs IS NOT NULL
    GROUP BY r.athlete_id
  ),
  ratios AS (
    -- Calculate performance ratio for each shared athlete
    SELECT
      tm.median_norm / am.median_norm as ratio
    FROM target_medians tm
    JOIN anchor_medians am ON tm.athlete_id = am.athlete_id
  )
  SELECT
    COUNT(*)::int as shared_athlete_count,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ratio) as median_ratio,
    STDDEV(ratio)::float as std_dev_ratio,
    ARRAY_AGG(ratio ORDER BY ratio) as performance_ratios
  FROM ratios;
END;
$$;

-- Function to get all calibrations at once (much faster than course-by-course)
CREATE OR REPLACE FUNCTION get_all_course_calibrations(anchor_course_id uuid)
RETURNS TABLE (
  course_id uuid,
  course_name text,
  distance_meters int,
  current_difficulty float,
  shared_athlete_count int,
  median_ratio float,
  std_dev_ratio float,
  implied_difficulty float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH anchor_medians AS (
    -- Get median normalized time for each athlete on anchor course
    SELECT
      r.athlete_id,
      PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY (r.time_cs::float * 1609.344 / c.distance_meters) / c.difficulty_rating
      ) as median_norm
    FROM results r
    JOIN races ra ON r.race_id = ra.id
    JOIN courses c ON ra.course_id = c.id
    WHERE ra.course_id = anchor_course_id
      AND r.time_cs IS NOT NULL
    GROUP BY r.athlete_id
  ),
  all_course_medians AS (
    -- Get median normalized time for each athlete on EACH course
    SELECT
      ra.course_id,
      r.athlete_id,
      PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY (r.time_cs::float * 1609.344 / c.distance_meters) / c.difficulty_rating
      ) as median_norm
    FROM results r
    JOIN races ra ON r.race_id = ra.id
    JOIN courses c ON ra.course_id = c.id
    WHERE r.time_cs IS NOT NULL
    GROUP BY ra.course_id, r.athlete_id
  ),
  course_calibrations AS (
    -- Calculate stats for each course
    SELECT
      acm.course_id,
      COUNT(DISTINCT acm.athlete_id)::int as athlete_count,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY acm.median_norm / am.median_norm) as median_ratio,
      STDDEV(acm.median_norm / am.median_norm)::float as std_dev
    FROM all_course_medians acm
    JOIN anchor_medians am ON acm.athlete_id = am.athlete_id
    WHERE acm.course_id != anchor_course_id
    GROUP BY acm.course_id
    HAVING COUNT(DISTINCT acm.athlete_id) >= 10  -- At least 10 shared athletes
  )
  SELECT
    c.id as course_id,
    c.name as course_name,
    c.distance_meters,
    c.difficulty_rating as current_difficulty,
    cc.athlete_count as shared_athlete_count,
    cc.median_ratio,
    cc.std_dev as std_dev_ratio,
    (c.difficulty_rating * cc.median_ratio) as implied_difficulty
  FROM courses c
  JOIN course_calibrations cc ON c.id = cc.course_id
  ORDER BY ABS((c.difficulty_rating * cc.median_ratio) - c.difficulty_rating) DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_athlete_course_comparisons TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION get_course_calibration_stats TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION get_all_course_calibrations TO service_role, authenticated;
