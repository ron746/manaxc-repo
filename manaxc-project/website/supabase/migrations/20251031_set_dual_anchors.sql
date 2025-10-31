-- Set dual anchor system based on user's coaching validation
-- Crystal Springs: 50 years expert validation = 1.0
-- Woodward Park: Proven through elite program usage = 0.95
-- Everything else: Single-season data = 0.3-0.5

-- First apply the stricter confidence calculation
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
  -- Factor 1: Result count
  SELECT COUNT(*) INTO result_count
  FROM results r
  JOIN races ra ON r.race_id = ra.id
  WHERE ra.course_id = target_course_id
    AND r.time_cs IS NOT NULL;

  -- Factor 2: Number of seasons
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
    variance_score := 999999;
  END IF;

  -- Factor 4: Shared athletes with anchors
  SELECT COUNT(DISTINCT r.athlete_id) INTO shared_athlete_score
  FROM results r
  JOIN races ra ON r.race_id = ra.id
  WHERE ra.course_id = target_course_id
    AND r.athlete_id IN (
      SELECT DISTINCT r2.athlete_id
      FROM results r2
      JOIN races ra2 ON r2.race_id = ra2.id
      JOIN courses c2 ON ra2.course_id = c2.id
      WHERE c2.name IN ('Crystal Springs, 2.95 Miles', 'Woodward Park, 5000 Meters')
    );

  -- Calculate contributions with stricter requirements
  result_contribution := LEAST(0.30, result_count::numeric / 500.0);

  season_contribution := CASE
    WHEN season_count >= 5 THEN 0.40
    WHEN season_count >= 3 THEN 0.25
    WHEN season_count >= 2 THEN 0.15
    ELSE 0.00
  END;

  variance_contribution := CASE
    WHEN season_count >= 2 THEN GREATEST(0.0, 0.20 - (variance_score / 2500.0))
    ELSE 0.00
  END;

  shared_contribution := LEAST(0.10, shared_athlete_score::numeric / 100.0);

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

-- Set the two validated anchor courses
UPDATE courses
SET
  confidence_score = 1.0000,
  confidence_notes = 'Primary anchor - 50 years expert validation (Malcolm Slaney, coach expertise)',
  last_confidence_update = NOW()
WHERE name = 'Crystal Springs, 2.95 Miles';

UPDATE courses
SET
  confidence_score = 0.9500,
  confidence_notes = 'Secondary anchor - proven through elite program usage, consistent volume',
  last_confidence_update = NOW()
WHERE name = 'Woodward Park, 5000 Meters';

-- Recalculate all other courses
DO $$
DECLARE
  course_record RECORD;
  new_confidence numeric;
BEGIN
  FOR course_record IN
    SELECT id, name
    FROM courses
    WHERE name NOT IN ('Crystal Springs, 2.95 Miles', 'Woodward Park, 5000 Meters')
  LOOP
    new_confidence := calculate_course_confidence(course_record.id);

    UPDATE courses
    SET
      confidence_score = new_confidence,
      confidence_notes = CASE
        WHEN new_confidence >= 0.70 THEN 'High confidence - multi-season data'
        WHEN new_confidence >= 0.50 THEN 'Medium confidence - needs more seasons'
        WHEN new_confidence >= 0.30 THEN 'Low confidence - single season data'
        ELSE 'Very low confidence - insufficient data'
      END,
      last_confidence_update = NOW()
    WHERE id = course_record.id;

    RAISE NOTICE 'Updated %: confidence = %', course_record.name, new_confidence;
  END LOOP;
END $$;

-- Verify the anchors
SELECT
  name,
  confidence_score,
  confidence_notes
FROM courses
WHERE name IN ('Crystal Springs, 2.95 Miles', 'Woodward Park, 5000 Meters')
ORDER BY confidence_score DESC;
