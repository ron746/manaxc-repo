-- Fix type mismatch: numeric(12,9) vs double precision
-- The courses.difficulty_rating column is numeric(12,9), but we need to return it as float8

DROP FUNCTION IF EXISTS get_all_course_calibrations(text);

CREATE OR REPLACE FUNCTION get_all_course_calibrations(
  anchor_course_name text DEFAULT 'Crystal Springs, 2.95 Miles'
)
RETURNS TABLE (
  course_id uuid,
  course_name text,
  distance_meters int,
  current_difficulty double precision,  -- Changed return type
  shared_athlete_count int,
  median_ratio double precision,
  std_dev_ratio double precision,
  implied_difficulty double precision
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
    -- Get median normalized time for each athlete on EACH course
    SELECT
      ra.course_id,
      r.athlete_id,
      c.name as course_name,
      c.distance_meters,
      c.difficulty_rating::float as difficulty_rating,  -- Explicit cast
      PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY (r.time_cs::float * 1609.344 / c.distance_meters) / c.difficulty_rating::float
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
    c.difficulty_rating::float as current_difficulty,  -- Explicit cast to float
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
'Calculates implied difficulty for ALL courses relative to anchor in single query. Returns float types compatible with Supabase client.';
