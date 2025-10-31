-- Fixed version v5: Complete schemas with all denormalized fields
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
-- 2. Batch rebuild athlete best times
-- =============================================================================
CREATE OR REPLACE FUNCTION batch_rebuild_athlete_best_times()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  upserted_count INTEGER := 0;
BEGIN
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
      sb.best_normalized_time as season_best_normalized_cs,
      r.id as season_best_result_id,
      race.course_id as season_best_course_id,
      race.distance_meters as season_best_race_distance_meters
    FROM season_bests sb
    JOIN results r ON r.athlete_id = sb.athlete_id AND r.time_cs = sb.best_time
    JOIN meets m ON r.meet_id = m.id AND m.season_year = sb.season_year
    JOIN races race ON r.race_id = race.id
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
      ab.best_normalized_time as alltime_best_normalized_cs,
      r.id as alltime_best_result_id,
      race.course_id as alltime_best_course_id,
      race.distance_meters as alltime_best_race_distance_meters
    FROM alltime_bests ab
    JOIN results r ON r.athlete_id = ab.athlete_id AND r.time_cs = ab.best_time
    JOIN meets m ON r.meet_id = m.id
    JOIN races race ON r.race_id = race.id
    ORDER BY ab.athlete_id, m.meet_date DESC, r.id
  )
  INSERT INTO athlete_best_times (
    athlete_id,
    season_year,
    season_best_time_cs,
    season_best_normalized_cs,
    season_best_result_id,
    season_best_course_id,
    season_best_race_distance_meters,
    alltime_best_time_cs,
    alltime_best_normalized_cs,
    alltime_best_result_id,
    alltime_best_course_id,
    alltime_best_race_distance_meters,
    created_at,
    updated_at
  )
  SELECT
    sbr.athlete_id,
    sbr.season_year,
    sbr.season_best_time_cs,
    sbr.season_best_normalized_cs,
    sbr.season_best_result_id,
    sbr.season_best_course_id,
    sbr.season_best_race_distance_meters,
    abr.alltime_best_time_cs,
    abr.alltime_best_normalized_cs,
    abr.alltime_best_result_id,
    abr.alltime_best_course_id,
    abr.alltime_best_race_distance_meters,
    NOW(),
    NOW()
  FROM season_best_results sbr
  LEFT JOIN alltime_best_results abr ON sbr.athlete_id = abr.athlete_id
  ON CONFLICT (athlete_id, season_year) DO UPDATE SET
    season_best_time_cs = EXCLUDED.season_best_time_cs,
    season_best_normalized_cs = EXCLUDED.season_best_normalized_cs,
    season_best_result_id = EXCLUDED.season_best_result_id,
    season_best_course_id = EXCLUDED.season_best_course_id,
    season_best_race_distance_meters = EXCLUDED.season_best_race_distance_meters,
    alltime_best_time_cs = EXCLUDED.alltime_best_time_cs,
    alltime_best_normalized_cs = EXCLUDED.alltime_best_normalized_cs,
    alltime_best_result_id = EXCLUDED.alltime_best_result_id,
    alltime_best_course_id = EXCLUDED.alltime_best_course_id,
    alltime_best_race_distance_meters = EXCLUDED.alltime_best_race_distance_meters,
    updated_at = NOW();

  GET DIAGNOSTICS upserted_count = ROW_COUNT;
  RETURN upserted_count;
END;
$$;

-- =============================================================================
-- 3. Batch rebuild course records (with all denormalized fields)
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
  DELETE FROM course_records WHERE true;

  INSERT INTO course_records (
    course_id,
    gender,
    athlete_id,
    result_id,
    time_cs,
    athlete_name,
    athlete_grad_year,
    school_id,
    school_name,
    meet_id,
    meet_name,
    meet_date,
    race_id,
    rank
  )
  SELECT
    course_id,
    gender,
    athlete_id,
    result_id,
    time_cs,
    athlete_name,
    athlete_grad_year,
    school_id,
    school_name,
    meet_id,
    meet_name,
    meet_date,
    race_id,
    rank
  FROM (
    SELECT
      c.id as course_id,
      COALESCE(ra.gender, a.gender) as gender,
      a.id as athlete_id,
      r.id as result_id,
      r.time_cs,
      a.name as athlete_name,
      a.grad_year as athlete_grad_year,
      s.id as school_id,
      s.name as school_name,
      m.id as meet_id,
      m.name as meet_name,
      m.meet_date,
      ra.id as race_id,
      ROW_NUMBER() OVER (
        PARTITION BY c.id, COALESCE(ra.gender, a.gender), a.id
        ORDER BY r.time_cs ASC
      ) as athlete_result_rank,
      ROW_NUMBER() OVER (
        PARTITION BY c.id, COALESCE(ra.gender, a.gender)
        ORDER BY (
          SELECT MIN(r2.time_cs)
          FROM results r2
          WHERE r2.athlete_id = a.id
            AND r2.race_id IN (
              SELECT ra2.id FROM races ra2 WHERE ra2.course_id = c.id
            )
        ) ASC
      ) as rank
    FROM results r
    JOIN athletes a ON r.athlete_id = a.id
    JOIN schools s ON a.school_id = s.id
    JOIN races ra ON r.race_id = ra.id
    JOIN courses c ON ra.course_id = c.id
    JOIN meets m ON ra.meet_id = m.id
    WHERE r.time_cs IS NOT NULL AND r.time_cs > 0
  ) subquery
  WHERE athlete_result_rank = 1
    AND rank <= 100
  ORDER BY course_id, gender, rank;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

-- =============================================================================
-- 4. Batch rebuild school hall of fame (with all denormalized fields)
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
  DELETE FROM school_hall_of_fame WHERE true;

  INSERT INTO school_hall_of_fame (
    school_id,
    gender,
    athlete_id,
    athlete_name,
    athlete_grad_year,
    result_id,
    time_cs,
    normalized_time_cs,
    course_id,
    course_name,
    meet_id,
    meet_name,
    meet_date,
    race_id,
    season_year,
    rank
  )
  SELECT
    school_id,
    gender,
    athlete_id,
    athlete_name,
    athlete_grad_year,
    result_id,
    time_cs,
    normalized_time_cs,
    course_id,
    course_name,
    meet_id,
    meet_name,
    meet_date,
    race_id,
    season_year,
    rank
  FROM (
    SELECT
      s.id as school_id,
      a.gender,
      a.id as athlete_id,
      a.name as athlete_name,
      a.grad_year as athlete_grad_year,
      r.id as result_id,
      r.time_cs,
      r.normalized_time_cs,
      c.id as course_id,
      c.name as course_name,
      m.id as meet_id,
      m.name as meet_name,
      m.meet_date,
      ra.id as race_id,
      m.season_year,
      ROW_NUMBER() OVER (
        PARTITION BY s.id, a.gender, a.id
        ORDER BY r.normalized_time_cs ASC
      ) as athlete_result_rank,
      ROW_NUMBER() OVER (
        PARTITION BY s.id, a.gender
        ORDER BY (
          SELECT MIN(r2.normalized_time_cs)
          FROM results r2
          WHERE r2.athlete_id = a.id
            AND r2.normalized_time_cs IS NOT NULL
        ) ASC
      ) as rank
    FROM results r
    JOIN athletes a ON r.athlete_id = a.id
    JOIN schools s ON a.school_id = s.id
    JOIN races ra ON r.race_id = ra.id
    JOIN courses c ON ra.course_id = c.id
    JOIN meets m ON ra.meet_id = m.id
    WHERE r.normalized_time_cs IS NOT NULL
  ) subquery
  WHERE athlete_result_rank = 1
    AND rank <= 100
  ORDER BY school_id, gender, rank;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

-- =============================================================================
-- 5. Batch rebuild school course records (with all denormalized fields)
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
  DELETE FROM school_course_records WHERE true;

  INSERT INTO school_course_records (
    school_id,
    course_id,
    gender,
    grade,
    athlete_id,
    result_id,
    time_cs,
    athlete_name,
    athlete_grad_year,
    meet_id,
    meet_name,
    meet_date,
    race_id,
    season_year
  )
  SELECT DISTINCT ON (school_id, course_id, gender, grade)
    s.id as school_id,
    c.id as course_id,
    COALESCE(ra.gender, a.gender) as gender,
    12 - (a.grad_year - m.season_year) as grade,
    a.id as athlete_id,
    r.id as result_id,
    r.time_cs,
    a.name as athlete_name,
    a.grad_year as athlete_grad_year,
    m.id as meet_id,
    m.name as meet_name,
    m.meet_date,
    ra.id as race_id,
    m.season_year
  FROM results r
  JOIN athletes a ON r.athlete_id = a.id
  JOIN schools s ON a.school_id = s.id
  JOIN races ra ON r.race_id = ra.id
  JOIN courses c ON ra.course_id = c.id
  JOIN meets m ON ra.meet_id = m.id
  WHERE r.time_cs IS NOT NULL
    AND 12 - (a.grad_year - m.season_year) BETWEEN 9 AND 12
  ORDER BY school_id, course_id, gender, grade, r.time_cs ASC;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION batch_rebuild_normalized_times() TO service_role, anon;
GRANT EXECUTE ON FUNCTION batch_rebuild_athlete_best_times() TO service_role, anon;
GRANT EXECUTE ON FUNCTION batch_rebuild_course_records() TO service_role, anon;
GRANT EXECUTE ON FUNCTION batch_rebuild_school_hall_of_fame() TO service_role, anon;
GRANT EXECUTE ON FUNCTION batch_rebuild_school_course_records() TO service_role, anon;
