-- Add course confidence ranking system
-- Confidence based on:
-- 1. Number of results (more data = higher confidence)
-- 2. Season-to-season consistency (low variance = higher confidence)
-- 3. Number of shared athletes with high-confidence courses
-- 4. Manual overrides (for known reliable courses like Crystal Springs)

-- Add confidence score to courses table
ALTER TABLE courses ADD COLUMN IF NOT EXISTS confidence_score numeric(5,4) DEFAULT 0.5000;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS confidence_notes text;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS last_confidence_update timestamptz;

COMMENT ON COLUMN courses.confidence_score IS
'Confidence in course difficulty rating (0.0 to 1.0). Based on result count, season-to-season variance, and manual assessment.';

-- Set Crystal Springs as highest confidence anchor
UPDATE courses
SET
  confidence_score = 1.0000,
  confidence_notes = 'Primary anchor course - highest confidence',
  last_confidence_update = NOW()
WHERE name = 'Crystal Springs, 2.95 Miles';

-- Create function to calculate course confidence
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

  -- Factor 3: Season-to-season variance (calculated below)
  -- Lower variance = more consistent = higher confidence
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
    HAVING COUNT(*) >= 10  -- Need at least 10 results per season
  )
  SELECT COALESCE(STDDEV(median_normalized), 0) INTO variance_score
  FROM season_medians;

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

  -- Calculate final confidence (0.0 to 1.0)
  final_confidence := LEAST(1.0,
    -- Result count contribution (up to 0.4)
    LEAST(0.4, result_count::numeric / 500.0) +

    -- Season count contribution (up to 0.2)
    LEAST(0.2, season_count::numeric / 5.0) +

    -- Low variance contribution (up to 0.2)
    -- Penalize if variance > 500cs (5 seconds)
    GREATEST(0.0, 0.2 - (variance_score / 2500.0)) +

    -- Shared athletes contribution (up to 0.2)
    LEAST(0.2, shared_athlete_score::numeric / 100.0)
  );

  RETURN final_confidence;
END;
$$;

GRANT EXECUTE ON FUNCTION calculate_course_confidence TO service_role;

COMMENT ON FUNCTION calculate_course_confidence IS
'Calculate confidence score for a course based on result count, season consistency, variance, and shared athletes with anchor course.';

-- Create function to detect season-to-season anomalies
CREATE OR REPLACE FUNCTION detect_season_anomalies(target_course_id uuid)
RETURNS TABLE (
  season int,
  result_count int,
  median_normalized_cs float,
  deviation_from_mean_cs float,
  z_score float,
  is_anomaly boolean,
  possible_causes text[]
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH season_stats AS (
    SELECT
      EXTRACT(YEAR FROM m.meet_date)::int as season_year,
      COUNT(*)::int as count,
      PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY (r.time_cs::float * 1609.344 / c.distance_meters) / c.difficulty_rating::float
      )::float as median_norm_cs
    FROM results r
    JOIN races ra ON r.race_id = ra.id
    JOIN meets m ON ra.meet_id = m.id
    JOIN courses c ON ra.course_id = c.id
    WHERE ra.course_id = target_course_id
      AND r.time_cs IS NOT NULL
    GROUP BY EXTRACT(YEAR FROM m.meet_date)
    HAVING COUNT(*) >= 10
  ),
  overall_stats AS (
    SELECT
      AVG(median_norm_cs) as mean_norm,
      STDDEV(median_norm_cs) as std_dev_norm
    FROM season_stats
  )
  SELECT
    ss.season_year,
    ss.count,
    ss.median_norm_cs,
    (ss.median_norm_cs - os.mean_norm)::float as deviation,
    ((ss.median_norm_cs - os.mean_norm) / NULLIF(os.std_dev_norm, 0))::float as z,
    ABS((ss.median_norm_cs - os.mean_norm) / NULLIF(os.std_dev_norm, 0)) > 2.0 as anomaly,
    CASE
      WHEN ss.median_norm_cs - os.mean_norm > 300 THEN ARRAY['Possible hot weather', 'Course may have been altered (longer/harder)', 'Weaker competition pool']
      WHEN ss.median_norm_cs - os.mean_norm < -300 THEN ARRAY['Possible ideal weather', 'Course may have been altered (shorter/easier)', 'Stronger competition pool']
      ELSE ARRAY['Normal variation']::text[]
    END as causes
  FROM season_stats ss
  CROSS JOIN overall_stats os
  ORDER BY ss.season_year DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION detect_season_anomalies TO service_role;

COMMENT ON FUNCTION detect_season_anomalies IS
'Detect seasons where course performance deviates significantly from historical average. Helps identify course alterations, extreme weather, or data quality issues.';

-- Update all course confidence scores
DO $$
DECLARE
  course_record RECORD;
  new_confidence numeric;
BEGIN
  FOR course_record IN SELECT id, name FROM courses LOOP
    -- Skip Crystal Springs (already set to 1.0)
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

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_courses_confidence ON courses(confidence_score DESC);

-- Grant permissions
GRANT SELECT ON courses TO authenticated;
