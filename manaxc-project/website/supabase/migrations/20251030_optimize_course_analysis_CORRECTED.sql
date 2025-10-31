-- CORRECTED: Optimized SQL function for AI course analysis using Malcolm Slaney's anchor-based method
-- Compares target course to ANCHOR COURSE ONLY (Crystal Springs), not all other courses

CREATE OR REPLACE FUNCTION get_athlete_course_comparisons_anchor_based(
  target_course_id uuid,
  anchor_course_name text DEFAULT 'Crystal Springs, 2.95 Miles'
)
RETURNS TABLE (
  athlete_id uuid,
  athlete_name text,
  this_course_normalized float,
  anchor_course_median float,
  difference_cs float,
  anchor_race_count int,
  performance_ratio float
)
LANGUAGE plpgsql
AS $$
DECLARE
  anchor_course_id uuid;
BEGIN
  -- Get the anchor course ID
  SELECT id INTO anchor_course_id
  FROM courses
  WHERE name = anchor_course_name
  LIMIT 1;

  IF anchor_course_id IS NULL THEN
    RAISE EXCEPTION 'Anchor course not found: %', anchor_course_name;
  END IF;

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
  anchor_results AS (
    -- Get all results for ANCHOR COURSE ONLY for these athletes
    SELECT
      r.athlete_id,
      (r.time_cs::float * 1609.344 / c.distance_meters) / c.difficulty_rating as normalized_time
    FROM results r
    JOIN races ra ON r.race_id = ra.id
    JOIN courses c ON ra.course_id = c.id
    WHERE r.athlete_id IN (SELECT athlete_id FROM target_results)
      AND ra.course_id = anchor_course_id  -- ✅ CORRECT: Only anchor course
      AND r.time_cs IS NOT NULL
  ),
  athlete_anchor_medians AS (
    -- Calculate median normalized time on ANCHOR course for each athlete
    SELECT
      athlete_id,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY normalized_time) as median_anchor_norm,
      COUNT(*) as race_count
    FROM anchor_results
    GROUP BY athlete_id
    HAVING COUNT(*) >= 1  -- At least 1 race on anchor course
  )
  SELECT
    tr.athlete_id,
    tr.athlete_name,
    tr.normalized_time as this_course_normalized,
    aam.median_anchor_norm as anchor_course_median,
    (tr.normalized_time - aam.median_anchor_norm) as difference_cs,
    aam.race_count::int as anchor_race_count,
    (tr.normalized_time / aam.median_anchor_norm) as performance_ratio  -- ✅ The key ratio!
  FROM target_results tr
  JOIN athlete_anchor_medians aam ON tr.athlete_id = aam.athlete_id
  ORDER BY aam.race_count DESC, ABS(tr.normalized_time - aam.median_anchor_norm) DESC;
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
-- Uses ANCHOR-BASED method: compares all courses to single anchor
CREATE OR REPLACE FUNCTION get_all_course_calibrations(
  anchor_course_name text DEFAULT 'Crystal Springs, 2.95 Miles'
)
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
DECLARE
  anchor_course_id uuid;
BEGIN
  -- Get the anchor course ID
  SELECT id INTO anchor_course_id
  FROM courses
  WHERE name = anchor_course_name
  LIMIT 1;

  IF anchor_course_id IS NULL THEN
    RAISE EXCEPTION 'Anchor course not found: %', anchor_course_name;
  END IF;

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
      c.name as course_name,
      c.distance_meters,
      c.difficulty_rating,
      PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY (r.time_cs::float * 1609.344 / c.distance_meters) / c.difficulty_rating
      ) as median_norm
    FROM results r
    JOIN races ra ON r.race_id = ra.id
    JOIN courses c ON ra.course_id = c.id
    WHERE r.time_cs IS NOT NULL
    GROUP BY ra.course_id, r.athlete_id, c.name, c.distance_meters, c.difficulty_rating
  ),
  course_calibrations AS (
    -- Calculate stats for each course relative to ANCHOR
    SELECT
      acm.course_id,
      COUNT(DISTINCT acm.athlete_id)::int as athlete_count,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY acm.median_norm / am.median_norm) as median_ratio,
      STDDEV(acm.median_norm / am.median_norm)::float as std_dev
    FROM all_course_medians acm
    JOIN anchor_medians am ON acm.athlete_id = am.athlete_id
    WHERE acm.course_id != anchor_course_id  -- Don't compare anchor to itself
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
GRANT EXECUTE ON FUNCTION get_athlete_course_comparisons_anchor_based TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION get_course_calibration_stats TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION get_all_course_calibrations TO service_role, authenticated;

-- Add helpful comments
COMMENT ON FUNCTION get_athlete_course_comparisons_anchor_based IS
'Malcolm Slaney anchor-based method: Compares target course to single anchor course (Crystal Springs). Returns performance ratios for each athlete.';

COMMENT ON FUNCTION get_course_calibration_stats IS
'Gets calibration statistics between anchor and target course. Used for network-based difficulty adjustment.';

COMMENT ON FUNCTION get_all_course_calibrations IS
'Calculates implied difficulty for ALL courses relative to anchor in single query. Much faster than one-by-one analysis.';
