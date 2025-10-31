-- Add distance filtering to get_all_course_calibrations to fix distance-effect confounding
-- Crystal Springs 2.13 miles should NOT be compared to Crystal Springs 2.95 miles
-- Only compare courses within ±15% distance of anchor

DROP FUNCTION IF EXISTS get_all_course_calibrations(text);

CREATE OR REPLACE FUNCTION get_all_course_calibrations(
  anchor_course_name text DEFAULT 'Crystal Springs, 2.95 Miles',
  distance_tolerance_pct float DEFAULT 0.15
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
  anchor_distance_meters int;
  min_distance_meters int;
  max_distance_meters int;
BEGIN
  -- Get the anchor course ID and distance
  SELECT id, distance_meters
  INTO anchor_course_id, anchor_distance_meters
  FROM courses
  WHERE name = anchor_course_name
  LIMIT 1;

  IF anchor_course_id IS NULL THEN
    RAISE EXCEPTION 'Anchor course not found: %', anchor_course_name;
  END IF;

  -- Calculate distance bounds (±15% by default)
  min_distance_meters := FLOOR(anchor_distance_meters * (1.0 - distance_tolerance_pct));
  max_distance_meters := CEIL(anchor_distance_meters * (1.0 + distance_tolerance_pct));

  RAISE NOTICE 'Anchor: % (% meters)', anchor_course_name, anchor_distance_meters;
  RAISE NOTICE 'Distance range: % to % meters (±%)', min_distance_meters, max_distance_meters, (distance_tolerance_pct * 100)::int || '%';

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
    -- Get median normalized time for each athlete on EACH course (within distance range)
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
      AND c.distance_meters BETWEEN min_distance_meters AND max_distance_meters  -- ✅ DISTANCE FILTER
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

GRANT EXECUTE ON FUNCTION get_all_course_calibrations TO service_role, authenticated;

COMMENT ON FUNCTION get_all_course_calibrations IS
'Network calibration with distance filtering to avoid distance-effect confounding. Only compares courses within ±15% distance of anchor (e.g., Crystal Springs 2.95 miles only compares to 2.51-3.39 mile courses).';

-- Test the function to see what courses are now included/excluded
SELECT
  course_name,
  ROUND(distance_meters::numeric / 1609.344, 2) as miles,
  shared_athlete_count,
  ROUND((median_ratio - 1.0)::numeric * 100, 1) as ratio_pct,
  ROUND((implied_difficulty - current_difficulty)::numeric * 100, 1) as diff_pct
FROM get_all_course_calibrations('Crystal Springs, 2.95 Miles', 0.15)
ORDER BY ABS(implied_difficulty - current_difficulty) DESC;
