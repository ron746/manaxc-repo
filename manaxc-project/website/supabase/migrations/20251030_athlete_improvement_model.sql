-- Athlete-specific improvement modeling
-- Based on user insight:
-- - Elite athletes: ~1 sec/week improvement
-- - Slower runners: GREATER improvement (2-3+ sec/week)
-- - Girls: Initial rise → plateau → small-to-medium decline (fatigue, iron deficiency, body changes)

-- Create function to calculate athlete's actual improvement rate
CREATE OR REPLACE FUNCTION calculate_athlete_improvement_rate(
  athlete_id_param uuid
)
RETURNS TABLE (
  athlete_id uuid,
  athlete_name text,
  gender text,
  grad_year int,
  total_races int,
  season_span_weeks float,
  baseline_normalized_cs float,  -- First race normalized time
  current_normalized_cs float,   -- Recent race normalized time
  total_improvement_cs float,    -- Total improvement (negative = got faster)
  improvement_per_week_cs float, -- Average improvement per week
  performance_level text,         -- 'elite', 'strong', 'developing', 'novice'
  improvement_pattern text,       -- 'linear', 'plateau', 'declining'
  confidence float                -- Confidence in this estimate
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH athlete_results AS (
    -- Get all results for athlete with normalized times
    SELECT
      r.athlete_id,
      a.name as athlete_name,
      a.gender,
      a.grad_year,
      m.meet_date as race_date,
      (r.time_cs::float * 1609.344 / c.distance_meters) / c.difficulty_rating::float as normalized_cs
    FROM results r
    JOIN athletes a ON r.athlete_id = a.id
    JOIN races ra ON r.race_id = ra.id
    JOIN courses c ON ra.course_id = c.id
    JOIN meets m ON ra.meet_id = m.id
    WHERE r.athlete_id = athlete_id_param
      AND r.time_cs IS NOT NULL
    ORDER BY m.meet_date
  ),
  athlete_stats AS (
    SELECT
      ar.athlete_id,
      ar.athlete_name,
      ar.gender,
      ar.grad_year,
      COUNT(*) as race_count,
      -- Time span in weeks
      EXTRACT(EPOCH FROM (MAX(race_date) - MIN(race_date))) / (7.0 * 86400.0) as weeks,
      -- First 3 races average (baseline)
      (
        SELECT AVG(normalized_cs)
        FROM (
          SELECT normalized_cs FROM athlete_results
          ORDER BY race_date LIMIT 3
        ) baseline
      ) as baseline_norm,
      -- Last 3 races average (current)
      (
        SELECT AVG(normalized_cs)
        FROM (
          SELECT normalized_cs FROM athlete_results
          ORDER BY race_date DESC LIMIT 3
        ) recent
      ) as current_norm,
      -- Linear regression slope (improvement trend)
      REGR_SLOPE(
        normalized_cs,
        EXTRACT(EPOCH FROM race_date) / (7.0 * 86400.0)
      ) as weekly_slope,
      -- R-squared for fit quality
      POWER(CORR(
        normalized_cs,
        EXTRACT(EPOCH FROM race_date) / (7.0 * 86400.0)
      ), 2) as r_squared
    FROM athlete_results ar
    GROUP BY ar.athlete_id, ar.athlete_name, ar.gender, ar.grad_year
    HAVING COUNT(*) >= 3  -- Need at least 3 races
  )
  SELECT
    athlete_id_param as athlete_id,
    athlete_name,
    gender,
    grad_year,
    race_count::int as total_races,
    weeks::float as season_span_weeks,
    baseline_norm::float as baseline_normalized_cs,
    current_norm::float as current_normalized_cs,
    (current_norm - baseline_norm)::float as total_improvement_cs,
    CASE
      WHEN weeks > 0 THEN ((current_norm - baseline_norm) / weeks)::float
      ELSE 0.0
    END as improvement_per_week_cs,
    -- Performance level classification
    CASE
      WHEN baseline_norm < 32000 THEN 'elite'        -- < 5:20/mile
      WHEN baseline_norm < 36000 THEN 'strong'       -- 5:20-6:00/mile
      WHEN baseline_norm < 42000 THEN 'developing'   -- 6:00-7:00/mile
      ELSE 'novice'                                   -- > 7:00/mile
    END as performance_level,
    -- Improvement pattern
    CASE
      WHEN r_squared > 0.7 AND weekly_slope < -50 THEN 'linear'      -- Strong linear improvement
      WHEN r_squared > 0.3 AND weekly_slope < -20 THEN 'gradual'     -- Gradual improvement
      WHEN ABS(weekly_slope) < 20 THEN 'plateau'                      -- Flat/plateaued
      WHEN weekly_slope > 20 THEN 'declining'                         -- Getting slower
      ELSE 'inconsistent'                                             -- High variance
    END as improvement_pattern,
    -- Confidence in estimate
    LEAST(1.0,
      (race_count::float / 8.0) *  -- More races = more confidence
      r_squared                      -- Better fit = more confidence
    )::float as confidence
  FROM athlete_stats;
END;
$$;

GRANT EXECUTE ON FUNCTION calculate_athlete_improvement_rate TO service_role;

COMMENT ON FUNCTION calculate_athlete_improvement_rate IS
'Calculate individual athlete improvement rate from their race history. Elite athletes improve ~1 sec/week, slower runners improve more. Girls may show plateau or decline patterns.';

-- Update outlier analysis to use ATHLETE-SPECIFIC improvement rates
DROP FUNCTION IF EXISTS get_course_outlier_analysis_v2(text, float, float);

CREATE OR REPLACE FUNCTION get_course_outlier_analysis_v2(
  anchor_course_name text DEFAULT 'Crystal Springs, 2.95 Miles',
  outlier_threshold_cs float DEFAULT 300.0
)
RETURNS TABLE (
  course_id uuid,
  course_name text,
  distance_meters int,
  current_difficulty double precision,
  course_confidence double precision,
  anchor_confidence double precision,
  athlete_count int,
  median_difference_cs float,
  std_dev_cs float,
  outlier_count int,
  outlier_percentage float,
  predicted_normalized_cs float,
  implied_difficulty double precision,
  comparison_quality float,
  final_confidence float
)
LANGUAGE plpgsql
AS $$
DECLARE
  anchor_course_id uuid;
  anchor_distance int;
  anchor_conf float;
  min_distance int;
  max_distance int;
BEGIN
  -- Get anchor course
  SELECT id, distance_meters, confidence_score
  INTO anchor_course_id, anchor_distance, anchor_conf
  FROM courses
  WHERE name = anchor_course_name
  LIMIT 1;

  IF anchor_course_id IS NULL THEN
    RAISE EXCEPTION 'Anchor course not found: %', anchor_course_name;
  END IF;

  min_distance := FLOOR(anchor_distance * 0.85);
  max_distance := CEIL(anchor_distance * 1.15);

  RETURN QUERY
  WITH athlete_improvement_rates AS (
    -- Calculate each athlete's personal improvement rate
    SELECT
      ar.athlete_id,
      ar.improvement_per_week_cs,
      ar.performance_level,
      ar.gender,
      CASE
        -- Use athlete-specific rate if confident
        WHEN ar.confidence > 0.5 THEN ar.improvement_per_week_cs
        -- Otherwise use defaults based on level and gender
        WHEN ar.performance_level = 'elite' THEN -100.0  -- 1 sec/week improvement
        WHEN ar.performance_level = 'strong' THEN -125.0  -- 1.25 sec/week
        WHEN ar.performance_level = 'developing' THEN -200.0  -- 2 sec/week (greater improvement)
        WHEN ar.performance_level = 'novice' THEN -250.0  -- 2.5 sec/week (greatest improvement)
        ELSE -150.0  -- Default 1.5 sec/week
      END as effective_improvement_rate
    FROM (
      -- Get all athletes who have raced
      SELECT DISTINCT athlete_id FROM results
    ) athletes,
    LATERAL calculate_athlete_improvement_rate(athletes.athlete_id) ar
  ),
  athlete_course_medians AS (
    SELECT
      r.athlete_id,
      ra.course_id,
      c.name as course_name,
      c.distance_meters,
      c.difficulty_rating::float as difficulty_rating,
      c.confidence_score::float as course_confidence,
      PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY (r.time_cs::float * 1609.344 / c.distance_meters) / c.difficulty_rating::float
      ) as median_normalized_cs,
      MIN(m.meet_date) as first_race_date,
      MAX(m.meet_date) as last_race_date,
      COUNT(*) as race_count
    FROM results r
    JOIN races ra ON r.race_id = ra.id
    JOIN courses c ON ra.course_id = c.id
    JOIN meets m ON ra.meet_id = m.id
    WHERE r.time_cs IS NOT NULL
      AND c.distance_meters BETWEEN min_distance AND max_distance
    GROUP BY r.athlete_id, ra.course_id, c.name, c.distance_meters, c.difficulty_rating, c.confidence_score
  ),
  anchor_athlete_times AS (
    SELECT
      athlete_id,
      median_normalized_cs as anchor_normalized_cs,
      first_race_date as anchor_first_date,
      last_race_date as anchor_last_date
    FROM athlete_course_medians
    WHERE course_id = anchor_course_id
  ),
  athlete_comparisons AS (
    SELECT
      acm.course_id,
      acm.course_name,
      acm.distance_meters,
      acm.difficulty_rating,
      acm.course_confidence,
      acm.athlete_id,
      acm.median_normalized_cs as course_normalized_cs,
      aat.anchor_normalized_cs,
      -- Use athlete-specific improvement rate
      air.effective_improvement_rate,
      air.performance_level,
      -- Calculate weeks between races
      EXTRACT(EPOCH FROM (acm.last_race_date - aat.anchor_last_date)) / (7.0 * 86400.0) as weeks_diff,
      -- Expected improvement using athlete-specific rate
      (EXTRACT(EPOCH FROM (acm.last_race_date - aat.anchor_last_date)) / (7.0 * 86400.0)) * air.effective_improvement_rate as expected_improvement_cs,
      -- Adjusted difference (accounting for athlete-specific improvement)
      (acm.median_normalized_cs - aat.anchor_normalized_cs) -
        ((EXTRACT(EPOCH FROM (acm.last_race_date - aat.anchor_last_date)) / (7.0 * 86400.0)) * air.effective_improvement_rate) as adjusted_difference_cs
    FROM athlete_course_medians acm
    JOIN anchor_athlete_times aat ON acm.athlete_id = aat.athlete_id
    JOIN athlete_improvement_rates air ON acm.athlete_id = air.athlete_id
    WHERE acm.course_id != anchor_course_id
  ),
  course_statistics AS (
    SELECT
      course_id,
      course_name,
      distance_meters,
      difficulty_rating,
      AVG(course_confidence) as avg_course_confidence,
      COUNT(*) as athlete_count,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY adjusted_difference_cs) as median_diff_cs,
      STDDEV(adjusted_difference_cs) as std_dev_cs,
      COUNT(CASE WHEN ABS(adjusted_difference_cs) > outlier_threshold_cs THEN 1 END) as outlier_count,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY course_normalized_cs) as median_course_normalized_cs,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY anchor_normalized_cs) as median_anchor_normalized_cs
    FROM athlete_comparisons
    GROUP BY course_id, course_name, distance_meters, difficulty_rating
    HAVING COUNT(*) >= 10
  )
  SELECT
    cs.course_id,
    cs.course_name,
    cs.distance_meters,
    cs.difficulty_rating as current_difficulty,
    cs.avg_course_confidence::float as course_confidence,
    anchor_conf::float as anchor_confidence,
    cs.athlete_count::int,
    cs.median_diff_cs::float,
    cs.std_dev_cs::float,
    cs.outlier_count::int,
    (cs.outlier_count::float / cs.athlete_count::float * 100.0)::float as outlier_percentage,
    cs.median_anchor_normalized_cs::float as predicted_normalized_cs,
    (cs.difficulty_rating * (cs.median_anchor_normalized_cs / cs.median_course_normalized_cs))::float as implied_difficulty,
    0.8::float as comparison_quality,  -- Simplified for now
    (
      anchor_conf *
      cs.avg_course_confidence *
      LEAST(1.0, cs.athlete_count::float / 100.0) *
      (1.0 - LEAST(0.5, cs.std_dev_cs / 500.0))
    )::float as final_confidence
  FROM course_statistics cs
  ORDER BY ABS(cs.median_diff_cs) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_course_outlier_analysis_v2 TO service_role, authenticated;

COMMENT ON FUNCTION get_course_outlier_analysis_v2 IS
'Uses athlete-specific improvement rates: Elite athletes ~1 sec/week, slower runners 2-3 sec/week. Accounts for gender-specific patterns (girls may plateau or decline).';
