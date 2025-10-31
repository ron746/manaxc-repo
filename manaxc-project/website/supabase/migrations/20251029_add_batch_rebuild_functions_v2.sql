-- Fixed version: Add RPC functions for batch rebuild operations
-- Run this to replace the broken functions

-- =============================================================================
-- 1. Batch rebuild normalized times
-- =============================================================================
CREATE OR REPLACE FUNCTION batch_rebuild_normalized_times()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE results r
  SET normalized_time_cs = CASE
      WHEN c.difficulty_rating > 0 THEN
          CAST((r.time_cs * 100000.0 / (c.difficulty_rating * (5280.0 / 3.0) * race.distance_meters)) AS INTEGER)
      ELSE NULL
  END
  FROM races race
  JOIN courses c ON race.course_id = c.id
  WHERE r.race_id = race.id
  AND (r.normalized_time_cs IS NULL OR r.normalized_time_cs = 0);

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- =============================================================================
-- 2. Batch rebuild athlete best times (FIXED)
-- =============================================================================
CREATE OR REPLACE FUNCTION batch_rebuild_athlete_best_times()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  upserted_count INTEGER := 0;
BEGIN
  -- First, get season bests
  WITH season_bests AS (
    SELECT
      r.athlete_id,
      m.season_year,
      MIN(r.time_cs) as best_time,
      MIN(r.normalized_time_cs) as best_normalized_time
    FROM results r
    JOIN meets m ON r.meet_id = m.id
    WHERE r.time_cs IS NOT NULL
    GROUP BY r.athlete_id, m.season_year
  ),
  season_best_results AS (
    SELECT DISTINCT ON (sb.athlete_id, sb.season_year)
      sb.athlete_id,
      sb.season_year,
      sb.best_time as season_best_time_cs,
      sb.best_normalized_time as season_best_normalized_time_cs,
      r.id as season_best_result_id
    FROM season_bests sb
    JOIN results r ON r.athlete_id = sb.athlete_id AND r.time_cs = sb.best_time
    JOIN meets m ON r.meet_id = m.id AND m.season_year = sb.season_year
    ORDER BY sb.athlete_id, sb.season_year, m.meet_date DESC, r.id
  ),
  alltime_bests AS (
    SELECT
      r.athlete_id,
      MIN(r.time_cs) as best_time,
      MIN(r.normalized_time_cs) as best_normalized_time
    FROM results r
    WHERE r.time_cs IS NOT NULL
    GROUP BY r.athlete_id
  ),
  alltime_best_results AS (
    SELECT DISTINCT ON (ab.athlete_id)
      ab.athlete_id,
      ab.best_time as alltime_best_time_cs,
      ab.best_normalized_time as alltime_best_normalized_time_cs,
      r.id as alltime_best_result_id
    FROM alltime_bests ab
    JOIN results r ON r.athlete_id = ab.athlete_id AND r.time_cs = ab.best_time
    JOIN meets m ON r.meet_id = m.id
    ORDER BY ab.athlete_id, m.meet_date DESC, r.id
  )
  INSERT INTO athlete_best_times (
    athlete_id,
    season_year,
    season_best_time_cs,
    season_best_normalized_time_cs,
    season_best_result_id,
    alltime_best_time_cs,
    alltime_best_normalized_time_cs,
    alltime_best_result_id,
    created_at,
    updated_at
  )
  SELECT
    sbr.athlete_id,
    sbr.season_year,
    sbr.season_best_time_cs,
    sbr.season_best_normalized_time_cs,
    sbr.season_best_result_id,
    abr.alltime_best_time_cs,
    abr.alltime_best_normalized_time_cs,
    abr.alltime_best_result_id,
    NOW(),
    NOW()
  FROM season_best_results sbr
  LEFT JOIN alltime_best_results abr ON sbr.athlete_id = abr.athlete_id
  ON CONFLICT (athlete_id, season_year) DO UPDATE SET
    season_best_time_cs = EXCLUDED.season_best_time_cs,
    season_best_normalized_time_cs = EXCLUDED.season_best_normalized_time_cs,
    season_best_result_id = EXCLUDED.season_best_result_id,
    alltime_best_time_cs = EXCLUDED.alltime_best_time_cs,
    alltime_best_normalized_time_cs = EXCLUDED.alltime_best_normalized_time_cs,
    alltime_best_result_id = EXCLUDED.alltime_best_result_id,
    updated_at = NOW();

  GET DIAGNOSTICS upserted_count = ROW_COUNT;
  RETURN upserted_count;
END;
$$;

-- =============================================================================
-- 3. Batch rebuild course records
-- =============================================================================
CREATE OR REPLACE FUNCTION batch_rebuild_course_records()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inserted_count INTEGER;
BEGIN
  -- Clear and rebuild
  DELETE FROM course_records;

  INSERT INTO course_records (
    course_id,
    result_id,
    athlete_id,
    gender,
    rank
  )
  SELECT
    ranked.course_id,
    ranked.result_id,
    ranked.athlete_id,
    ranked.gender,
    ranked.rank
  FROM (
    SELECT
      c.id as course_id,
      r.id as result_id,
      r.athlete_id,
      a.gender,
      ROW_NUMBER() OVER (PARTITION BY c.id, a.gender ORDER BY r.time_cs) as rank
    FROM results r
    JOIN races race ON r.race_id = race.id
    JOIN courses c ON race.course_id = c.id
    JOIN athletes a ON r.athlete_id = a.id
    WHERE r.time_cs IS NOT NULL
  ) ranked
  WHERE ranked.rank <= 100;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

-- =============================================================================
-- 4. Batch rebuild school hall of fame
-- =============================================================================
CREATE OR REPLACE FUNCTION batch_rebuild_school_hall_of_fame()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inserted_count INTEGER;
BEGIN
  -- Clear and rebuild
  DELETE FROM school_hall_of_fame;

  INSERT INTO school_hall_of_fame (
    school_id,
    result_id,
    athlete_id,
    gender,
    rank
  )
  SELECT
    ranked.school_id,
    ranked.result_id,
    ranked.athlete_id,
    ranked.gender,
    ranked.rank
  FROM (
    SELECT
      a.school_id,
      r.id as result_id,
      r.athlete_id,
      a.gender,
      ROW_NUMBER() OVER (PARTITION BY a.school_id, a.gender ORDER BY r.normalized_time_cs) as rank
    FROM results r
    JOIN athletes a ON r.athlete_id = a.id
    WHERE r.normalized_time_cs IS NOT NULL
    AND a.school_id IS NOT NULL
  ) ranked
  WHERE ranked.rank <= 100;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

-- =============================================================================
-- 5. Batch rebuild school course records
-- =============================================================================
CREATE OR REPLACE FUNCTION batch_rebuild_school_course_records()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inserted_count INTEGER;
BEGIN
  -- Clear and rebuild
  DELETE FROM school_course_records;

  INSERT INTO school_course_records (
    school_id,
    course_id,
    result_id,
    athlete_id,
    grade_level,
    gender
  )
  SELECT DISTINCT ON (a.school_id, c.id, a.gender, (12 - (a.grad_year - m.season_year)))
    a.school_id,
    c.id as course_id,
    r.id as result_id,
    r.athlete_id,
    (12 - (a.grad_year - m.season_year)) as grade_level,
    a.gender
  FROM results r
  JOIN athletes a ON r.athlete_id = a.id
  JOIN races race ON r.race_id = race.id
  JOIN courses c ON race.course_id = c.id
  JOIN meets m ON r.meet_id = m.id
  WHERE r.time_cs IS NOT NULL
  AND a.school_id IS NOT NULL
  AND (12 - (a.grad_year - m.season_year)) BETWEEN 9 AND 12
  ORDER BY a.school_id, c.id, a.gender, (12 - (a.grad_year - m.season_year)), r.time_cs;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

-- Grant execute permissions to service role
GRANT EXECUTE ON FUNCTION batch_rebuild_normalized_times() TO service_role;
GRANT EXECUTE ON FUNCTION batch_rebuild_athlete_best_times() TO service_role;
GRANT EXECUTE ON FUNCTION batch_rebuild_course_records() TO service_role;
GRANT EXECUTE ON FUNCTION batch_rebuild_school_hall_of_fame() TO service_role;
GRANT EXECUTE ON FUNCTION batch_rebuild_school_course_records() TO service_role;

-- Also grant to anon for easier testing
GRANT EXECUTE ON FUNCTION batch_rebuild_normalized_times() TO anon;
GRANT EXECUTE ON FUNCTION batch_rebuild_athlete_best_times() TO anon;
GRANT EXECUTE ON FUNCTION batch_rebuild_course_records() TO anon;
GRANT EXECUTE ON FUNCTION batch_rebuild_school_hall_of_fame() TO anon;
GRANT EXECUTE ON FUNCTION batch_rebuild_school_course_records() TO anon;
