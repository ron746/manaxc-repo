-- Enhanced anomaly detection with seasonal improvement and difficulty recommendations
-- Accounts for athletes improving ~1-2 seconds per week during the season

-- Drop the old function first (return type changed from float to numeric)
DROP FUNCTION IF EXISTS identify_course_anomalies_with_recommendations(int, float, float);

CREATE OR REPLACE FUNCTION identify_course_anomalies_with_recommendations(
  min_shared_athletes int DEFAULT 10,
  outlier_threshold_std_dev float DEFAULT 2.0,
  improvement_per_week_cs float DEFAULT 150.0  -- 1.5 seconds per mile per week
)
RETURNS TABLE (
  course_id uuid,
  course_name text,
  distance_meters int,
  current_difficulty numeric(12,9),
  recommended_difficulty numeric(12,9),
  difficulty_adjustment_pct numeric,
  elite_athlete_count int,
  athletes_with_fast_outlier int,
  athletes_with_slow_outlier int,
  total_outliers int,
  outlier_percentage numeric,
  median_normalized_cs numeric,
  typical_normalized_cs numeric,
  difference_cs numeric,
  difference_seconds_per_mile numeric,
  improvement_adjusted_diff_cs numeric,  -- After accounting for seasonal improvement
  anomaly_direction text,
  confidence_score numeric,
  suspicion_level text,
  recommendation text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH elite_athletes AS (
    -- Identify top 25% of athletes by best normalized time
    SELECT
      athlete_id,
      PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY (r.time_cs::float * 1609.344 / c.distance_meters) / c.difficulty_rating
      ) as median_normalized_cs
    FROM results r
    JOIN races ra ON r.race_id = ra.id
    JOIN courses c ON ra.course_id = c.id
    WHERE r.time_cs IS NOT NULL
    GROUP BY athlete_id
    HAVING COUNT(*) >= 3
    ORDER BY median_normalized_cs ASC
    LIMIT (SELECT COUNT(DISTINCT athlete_id) / 4 FROM results)
  ),
  athlete_course_performances_with_dates AS (
    -- Get performances with race dates for improvement calculation
    SELECT
      r.athlete_id,
      ra.course_id,
      c.name as course_name,
      c.distance_meters,
      c.difficulty_rating,
      PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY (r.time_cs::float * 1609.344 / c.distance_meters) / c.difficulty_rating
      ) as course_median_normalized_cs,
      MAX(m.meet_date) as last_race_date,
      MIN(m.meet_date) as first_race_date
    FROM results r
    JOIN races ra ON r.race_id = ra.id
    JOIN courses c ON ra.course_id = c.id
    JOIN meets m ON ra.meet_id = m.id
    WHERE r.athlete_id IN (SELECT athlete_id FROM elite_athletes)
      AND r.time_cs IS NOT NULL
    GROUP BY r.athlete_id, ra.course_id, c.name, c.distance_meters, c.difficulty_rating
  ),
  athlete_typical_performance AS (
    -- Calculate typical performance and typical race date
    SELECT
      athlete_id,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY course_median_normalized_cs) as typical_normalized_cs,
      STDDEV(course_median_normalized_cs) as std_dev_cs,
      -- Convert date to epoch for percentile, then back to timestamptz
      TO_TIMESTAMP(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM last_race_date))) as typical_race_date
    FROM athlete_course_performances_with_dates
    GROUP BY athlete_id
  ),
  course_anomaly_stats AS (
    -- Calculate anomalies with seasonal improvement adjustment
    SELECT
      acp.course_id,
      acp.course_name,
      acp.distance_meters,
      acp.difficulty_rating,
      COUNT(DISTINCT acp.athlete_id) as elite_athlete_count,
      -- Raw outliers (before improvement adjustment)
      COUNT(DISTINCT CASE
        WHEN (acp.course_median_normalized_cs - atp.typical_normalized_cs) < -(outlier_threshold_std_dev * atp.std_dev_cs)
        THEN acp.athlete_id
      END) as athletes_with_fast_outlier,
      COUNT(DISTINCT CASE
        WHEN (acp.course_median_normalized_cs - atp.typical_normalized_cs) > (outlier_threshold_std_dev * atp.std_dev_cs)
        THEN acp.athlete_id
      END) as athletes_with_slow_outlier,
      -- Medians
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY acp.course_median_normalized_cs) as median_normalized_cs,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY atp.typical_normalized_cs) as typical_normalized_cs,
      -- Calculate improvement-adjusted difference
      -- If this course was run later in season, athletes should be faster (negative adjustment)
      PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY
          (acp.course_median_normalized_cs - atp.typical_normalized_cs) -
          COALESCE((EXTRACT(EPOCH FROM (acp.last_race_date - atp.typical_race_date)) / (7.0 * 86400.0) * improvement_per_week_cs), 0)
      ) as improvement_adjusted_diff_cs,
      STDDEV(acp.course_median_normalized_cs) as course_std_dev_cs
    FROM athlete_course_performances_with_dates acp
    JOIN athlete_typical_performance atp ON acp.athlete_id = atp.athlete_id
    GROUP BY acp.course_id, acp.course_name, acp.distance_meters, acp.difficulty_rating
    HAVING COUNT(DISTINCT acp.athlete_id) >= min_shared_athletes
  )
  SELECT
    cas.course_id,
    cas.course_name,
    cas.distance_meters,
    cas.difficulty_rating as current_difficulty,
    -- Recommended difficulty: reverse engineer what difficulty would make anomaly = 0
    -- If athletes are running faster (median < typical), need LOWER difficulty (multiply by <1.0)
    -- Formula: current_difficulty * (median_normalized / typical_normalized)
    (cas.difficulty_rating * (cas.median_normalized_cs / cas.typical_normalized_cs))::numeric(12,9) as recommended_difficulty,
    -- Percent adjustment needed
    (((cas.median_normalized_cs / cas.typical_normalized_cs) - 1.0) * 100.0)::numeric as difficulty_adjustment_pct,
    cas.elite_athlete_count::int,
    cas.athletes_with_fast_outlier::int,
    cas.athletes_with_slow_outlier::int,
    (cas.athletes_with_fast_outlier + cas.athletes_with_slow_outlier)::int as total_outliers,
    (GREATEST(cas.athletes_with_fast_outlier, cas.athletes_with_slow_outlier)::numeric / cas.elite_athlete_count::numeric * 100.0)::numeric as outlier_percentage,
    cas.median_normalized_cs::numeric,
    cas.typical_normalized_cs::numeric,
    (cas.median_normalized_cs - cas.typical_normalized_cs)::numeric as difference_cs,
    ((cas.median_normalized_cs - cas.typical_normalized_cs) / 100.0)::numeric as difference_seconds_per_mile,
    (COALESCE(cas.improvement_adjusted_diff_cs, cas.median_normalized_cs - cas.typical_normalized_cs) / 100.0)::numeric as improvement_adjusted_diff_seconds_per_mile,
    CASE
      WHEN cas.athletes_with_fast_outlier > cas.athletes_with_slow_outlier * 2
        THEN 'FASTER (easier than rated)'
      WHEN cas.athletes_with_slow_outlier > cas.athletes_with_fast_outlier * 2
        THEN 'SLOWER (harder than rated)'
      ELSE 'MIXED (inconsistent performances)'
    END as anomaly_direction,
    (LEAST(1.0, cas.elite_athlete_count::numeric / 50.0) *
     (GREATEST(cas.athletes_with_fast_outlier, cas.athletes_with_slow_outlier)::numeric / cas.elite_athlete_count::numeric))::numeric as confidence_score,
    CASE
      WHEN (GREATEST(cas.athletes_with_fast_outlier, cas.athletes_with_slow_outlier)::numeric / cas.elite_athlete_count::numeric) > 0.50
        THEN 'CRITICAL - Over 50% have outlier times'
      WHEN (GREATEST(cas.athletes_with_fast_outlier, cas.athletes_with_slow_outlier)::numeric / cas.elite_athlete_count::numeric) > 0.30
        THEN 'HIGH - 30-50% have outlier times'
      WHEN (GREATEST(cas.athletes_with_fast_outlier, cas.athletes_with_slow_outlier)::numeric / cas.elite_athlete_count::numeric) > 0.15
        THEN 'MEDIUM - 15-30% have outlier times'
      WHEN (GREATEST(cas.athletes_with_fast_outlier, cas.athletes_with_slow_outlier)::numeric / cas.elite_athlete_count::numeric) > 0.05
        THEN 'LOW - 5-15% have outlier times'
      ELSE 'NORMAL - Under 5% outliers'
    END as suspicion_level,
    -- Actionable recommendation
    CASE
      WHEN ABS((cas.median_normalized_cs / cas.typical_normalized_cs) - 1.0) > 0.15
        THEN 'URGENT: Adjust difficulty by ' || ROUND((((cas.median_normalized_cs / cas.typical_normalized_cs) - 1.0) * 100.0)::numeric, 1)::text || '% or verify course distance'
      WHEN ABS((cas.median_normalized_cs / cas.typical_normalized_cs) - 1.0) > 0.05
        THEN 'Consider adjusting difficulty by ' || ROUND((((cas.median_normalized_cs / cas.typical_normalized_cs) - 1.0) * 100.0)::numeric, 1)::text || '%'
      ELSE 'Difficulty rating appears accurate'
    END as recommendation
  FROM course_anomaly_stats cas
  WHERE ABS(cas.median_normalized_cs - cas.typical_normalized_cs) > 100
    AND (cas.athletes_with_fast_outlier + cas.athletes_with_slow_outlier) > 0
  ORDER BY GREATEST(cas.athletes_with_fast_outlier, cas.athletes_with_slow_outlier) DESC,
           ABS(cas.median_normalized_cs - cas.typical_normalized_cs) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION identify_course_anomalies_with_recommendations TO service_role, authenticated;

COMMENT ON FUNCTION identify_course_anomalies_with_recommendations IS
'Enhanced anomaly detection that accounts for seasonal improvement (~1.5 sec/week) and calculates recommended difficulty adjustments to normalize performances.';
