-- Fix network calibration to only compare courses of similar distances
-- Malcolm Slaney's method assumes similar race distances
-- Comparing 2.13 miles to 2.95 miles introduces distance effect confounding

DROP FUNCTION IF EXISTS get_all_course_calibrations(text);

CREATE OR REPLACE FUNCTION get_all_course_calibrations(
  anchor_course_name text DEFAULT 'Crystal Springs, 2.95 Miles',
  distance_tolerance_pct float DEFAULT 0.15  -- Only compare courses within 15% distance
)
RETURNS TABLE (
  course_id uuid,
  course_name text,
  distance_meters int,
  current_difficulty double precision,
  shared_athlete_count int,
  median_ratio double precision,
  std_dev_ratio double precision,
  implied_difficulty double precision
)
LANGUAGE plpgsql
AS $$
DECLARE
  anchor_course_id uuid;
  anchor_distance int;
  min_distance int;
  max_distance int;
BEGIN
  -- Get the anchor course ID and distance
  SELECT id, distance_meters INTO anchor_course_id, anchor_distance
  FROM courses
  WHERE name = anchor_course_name
  LIMIT 1;

  IF anchor_course_id IS NULL THEN
    RAISE EXCEPTION 'Anchor course not found: %', anchor_course_name;
  END IF;

  -- Calculate distance range (e.g., 2.95 miles ± 15% = 2.51 to 3.39 miles)
  min_distance := FLOOR(anchor_distance * (1 - distance_tolerance_pct));
  max_distance := CEIL(anchor_distance * (1 + distance_tolerance_pct));

  RAISE NOTICE 'Anchor: %, Distance: %m, Range: %m to %m',
    anchor_course_name, anchor_distance, min_distance, max_distance;

  RETURN QUERY
  WITH anchor_medians AS (
    -- Get median normalized time for each athlete on anchor course
    SELECT
      r.athlete_id,
      PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY (r.time_cs::float * 1609.344 / c.distance_meters) / c.difficulty_rating::float
      ) as median_norm
    FROM results r
    JOIN races ra ON r.race_id = ra.id
    JOIN courses c ON ra.course_id = c.id
    WHERE ra.course_id = anchor_course_id
      AND r.time_cs IS NOT NULL
    GROUP BY r.athlete_id
  ),
  all_course_medians AS (
    -- Get median normalized time for each athlete on EACH course (similar distance only)
    SELECT
      ra.course_id,
      r.athlete_id,
      c.name as course_name,
      c.distance_meters,
      c.difficulty_rating::float as difficulty_rating,
      PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY (r.time_cs::float * 1609.344 / c.distance_meters) / c.difficulty_rating::float
      ) as median_norm
    FROM results r
    JOIN races ra ON r.race_id = ra.id
    JOIN courses c ON ra.course_id = c.id
    WHERE r.time_cs IS NOT NULL
      AND c.distance_meters BETWEEN min_distance AND max_distance  -- CRITICAL FIX
    GROUP BY ra.course_id, r.athlete_id, c.name, c.distance_meters, c.difficulty_rating
  ),
  course_calibrations AS (
    -- Calculate stats for each course relative to ANCHOR
    SELECT
      acm.course_id,
      COUNT(DISTINCT acm.athlete_id)::int as athlete_count,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY acm.median_norm / am.median_norm)::float as median_ratio,
      STDDEV(acm.median_norm / am.median_norm)::float as std_dev
    FROM all_course_medians acm
    JOIN anchor_medians am ON acm.athlete_id = am.athlete_id
    WHERE acm.course_id != anchor_course_id
    GROUP BY acm.course_id
    HAVING COUNT(DISTINCT acm.athlete_id) >= 10
  )
  SELECT
    c.id as course_id,
    c.name as course_name,
    c.distance_meters,
    c.difficulty_rating::float as current_difficulty,
    cc.athlete_count as shared_athlete_count,
    cc.median_ratio::float,
    cc.std_dev as std_dev_ratio,
    (c.difficulty_rating::float * cc.median_ratio)::float as implied_difficulty
  FROM courses c
  JOIN course_calibrations cc ON c.id = cc.course_id
  ORDER BY ABS((c.difficulty_rating::float * cc.median_ratio) - c.difficulty_rating::float) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_all_course_calibrations TO service_role, authenticated;

COMMENT ON FUNCTION get_all_course_calibrations IS
'Calculates implied difficulty for courses relative to anchor, filtering to similar distances only (within 15% by default). This prevents comparing 2-mile races to 3-mile races which introduces distance-effect confounding.';

-- Test query to see what courses are being compared
DO $$
DECLARE
  anchor_distance int;
  min_dist int;
  max_dist int;
BEGIN
  SELECT distance_meters INTO anchor_distance
  FROM courses
  WHERE name = 'Crystal Springs, 2.95 Miles';

  min_dist := FLOOR(anchor_distance * 0.85);
  max_dist := CEIL(anchor_distance * 1.15);

  RAISE NOTICE 'Anchor distance: %m (% miles)', anchor_distance, ROUND(anchor_distance / 1609.344, 2);
  RAISE NOTICE 'Will compare courses from %m to %m', min_dist, max_dist;
  RAISE NOTICE 'That is % to % miles',
    ROUND(min_dist / 1609.344::float, 2),
    ROUND(max_dist / 1609.344::float, 2);
END $$;
