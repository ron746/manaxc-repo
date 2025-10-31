-- Fix confidence calculation to be more realistic for limited data
-- Single-season courses should have much lower confidence than 50-year validated courses

DROP FUNCTION IF EXISTS calculate_course_confidence(uuid);

CREATE OR REPLACE FUNCTION calculate_course_confidence(target_course_id uuid)
RETURNS numeric(5,4)
LANGUAGE plpgsql
AS $$
DECLARE
  result_count int;
  season_count int;
  variance_score numeric;
  shared_athlete_score numeric;
  final_confidence numeric;
  result_contribution numeric;
  season_contribution numeric;
  variance_contribution numeric;
  shared_contribution numeric;
BEGIN
  -- Factor 1: Result count (more results = higher confidence)
  SELECT COUNT(*) INTO result_count
  FROM results r
  JOIN races ra ON r.race_id = ra.id
  WHERE ra.course_id = target_course_id
    AND r.time_cs IS NOT NULL;

  -- Factor 2: Number of seasons with results (consistency over time)
  SELECT COUNT(DISTINCT EXTRACT(YEAR FROM m.meet_date)) INTO season_count
  FROM results r
  JOIN races ra ON r.race_id = ra.id
  JOIN meets m ON ra.meet_id = m.id
  WHERE ra.course_id = target_course_id
    AND r.time_cs IS NOT NULL;

  -- Factor 3: Season-to-season variance (only if 2+ seasons)
  IF season_count >= 2 THEN
    WITH season_medians AS (
      SELECT
        EXTRACT(YEAR FROM m.meet_date) as season,
        PERCENTILE_CONT(0.5) WITHIN GROUP (
          ORDER BY (r.time_cs::float * 1609.344 / c.distance_meters) / c.difficulty_rating::float
        ) as median_normalized
      FROM results r
      JOIN races ra ON r.race_id = ra.id
      JOIN meets m ON ra.meet_id = m.id
      JOIN courses c ON ra.course_id = c.id
      WHERE ra.course_id = target_course_id
        AND r.time_cs IS NOT NULL
      GROUP BY EXTRACT(YEAR FROM m.meet_date)
      HAVING COUNT(*) >= 10
    )
    SELECT COALESCE(STDDEV(median_normalized), 0) INTO variance_score
    FROM season_medians;
  ELSE
    variance_score := 999999;  -- High variance if can't calculate
  END IF;

  -- Factor 4: Shared athletes with high-confidence anchor (Crystal Springs)
  SELECT COUNT(DISTINCT r.athlete_id) INTO shared_athlete_score
  FROM results r
  JOIN races ra ON r.race_id = ra.id
  WHERE ra.course_id = target_course_id
    AND r.athlete_id IN (
      SELECT DISTINCT r2.athlete_id
      FROM results r2
      JOIN races ra2 ON r2.race_id = ra2.id
      JOIN courses c2 ON ra2.course_id = c2.id
      WHERE c2.name = 'Crystal Springs, 2.95 Miles'
    );

  -- Calculate contributions
  -- Result count contribution (up to 0.30)
  result_contribution := LEAST(0.30, result_count::numeric / 500.0);

  -- Season count contribution (up to 0.40) - CRITICAL for reliability
  season_contribution := CASE
    WHEN season_count >= 5 THEN 0.40
    WHEN season_count >= 3 THEN 0.25
    WHEN season_count >= 2 THEN 0.15
    ELSE 0.00  -- Single season gets ZERO multi-season credit
  END;

  -- Variance contribution (up to 0.20, only if 2+ seasons)
  variance_contribution := CASE
    WHEN season_count >= 2 THEN GREATEST(0.0, 0.20 - (variance_score / 2500.0))
    ELSE 0.00  -- Can't measure consistency with 1 season
  END;

  -- Shared athletes contribution (up to 0.10)
  shared_contribution := LEAST(0.10, shared_athlete_score::numeric / 100.0);

  -- Calculate final confidence (max 1.0)
  final_confidence := LEAST(1.0,
    result_contribution +
    season_contribution +
    variance_contribution +
    shared_contribution
  );

  RETURN final_confidence;
END;
$$;

GRANT EXECUTE ON FUNCTION calculate_course_confidence TO service_role;

COMMENT ON FUNCTION calculate_course_confidence IS
'Calculate confidence score (0.0-1.0) based on:
- Result count (up to 0.30)
- Season count (up to 0.40) - requires 5+ seasons for full credit
- Variance (up to 0.20) - only if 2+ seasons
- Shared athletes with anchor (up to 0.10)
Single-season courses max out at ~0.4 confidence.';

-- Recalculate all course confidence scores (except Crystal Springs)
DO $$
DECLARE
  course_record RECORD;
  new_confidence numeric;
BEGIN
  FOR course_record IN SELECT id, name FROM courses LOOP
    -- Skip Crystal Springs (keep manual 1.0)
    IF course_record.name != 'Crystal Springs, 2.95 Miles' THEN
      new_confidence := calculate_course_confidence(course_record.id);

      UPDATE courses
      SET
        confidence_score = new_confidence,
        last_confidence_update = NOW()
      WHERE id = course_record.id;

      RAISE NOTICE 'Updated % confidence: %', course_record.name, new_confidence;
    END IF;
  END LOOP;
END $$;
