-- Identify courses with statistical anomalies using elite runners (top 25%)
-- Find courses where athletes run significantly faster than their typical performance

CREATE OR REPLACE FUNCTION identify_course_anomalies_elite(
  min_shared_athletes int DEFAULT 10,
  outlier_threshold_std_dev float DEFAULT 2.0  -- How many std devs to flag as outlier
)
RETURNS TABLE (
  course_id uuid,
  course_name text,
  distance_meters int,
  current_difficulty numeric(12,9),
  elite_athlete_count int,
  athletes_with_fast_outlier int,
  athletes_with_slow_outlier int,
  total_outliers int,
  outlier_percentage float,
  median_normalized_cs float,
  typical_normalized_cs float,  -- Median of athlete medians (what they usually run)
  difference_cs float,  -- Positive = slower (harder), Negative = faster (easier)
  difference_seconds_per_mile float,
  anomaly_direction text,  -- 'FASTER', 'SLOWER', 'MIXED'
  confidence_score float,
  suspicion_level text
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
    HAVING COUNT(*) >= 3  -- At least 3 races
    ORDER BY median_normalized_cs ASC
    LIMIT (SELECT COUNT(DISTINCT athlete_id) / 4 FROM results)  -- Top 25%
  ),
  athlete_course_performances AS (
    -- Get all performances for elite athletes on each course
    SELECT
      r.athlete_id,
      ra.course_id,
      c.name as course_name,
      c.distance_meters,
      c.difficulty_rating,
      PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY (r.time_cs::float * 1609.344 / c.distance_meters) / c.difficulty_rating
      ) as course_median_normalized_cs
    FROM results r
    JOIN races ra ON r.race_id = ra.id
    JOIN courses c ON ra.course_id = c.id
    WHERE r.athlete_id IN (SELECT athlete_id FROM elite_athletes)
      AND r.time_cs IS NOT NULL
    GROUP BY r.athlete_id, ra.course_id, c.name, c.distance_meters, c.difficulty_rating
  ),
  athlete_typical_performance AS (
    -- Calculate each athlete's typical normalized time (median across ALL courses)
    SELECT
      athlete_id,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY course_median_normalized_cs) as typical_normalized_cs,
      STDDEV(course_median_normalized_cs) as std_dev_cs
    FROM athlete_course_performances
    GROUP BY athlete_id
  ),
  course_anomaly_stats AS (
    -- For each course, find athletes running significantly FASTER or SLOWER than their typical
    SELECT
      acp.course_id,
      acp.course_name,
      acp.distance_meters,
      acp.difficulty_rating,
      COUNT(DISTINCT acp.athlete_id) as elite_athlete_count,
      -- Count athletes with outlier FAST times (more than N std devs faster than their typical)
      COUNT(DISTINCT CASE
        WHEN (acp.course_median_normalized_cs - atp.typical_normalized_cs) < -(outlier_threshold_std_dev * atp.std_dev_cs)
        THEN acp.athlete_id
      END) as athletes_with_fast_outlier,
      -- Count athletes with outlier SLOW times (more than N std devs slower than their typical)
      COUNT(DISTINCT CASE
        WHEN (acp.course_median_normalized_cs - atp.typical_normalized_cs) > (outlier_threshold_std_dev * atp.std_dev_cs)
        THEN acp.athlete_id
      END) as athletes_with_slow_outlier,
      -- Median normalized time on this course
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY acp.course_median_normalized_cs) as median_normalized_cs,
      -- Median of what these athletes typically run
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY atp.typical_normalized_cs) as typical_normalized_cs,
      -- Standard deviation of normalized times on this course
      STDDEV(acp.course_median_normalized_cs) as course_std_dev_cs
    FROM athlete_course_performances acp
    JOIN athlete_typical_performance atp ON acp.athlete_id = atp.athlete_id
    GROUP BY acp.course_id, acp.course_name, acp.distance_meters, acp.difficulty_rating
    HAVING COUNT(DISTINCT acp.athlete_id) >= min_shared_athletes
  )
  SELECT
    cas.course_id,
    cas.course_name,
    cas.distance_meters,
    cas.difficulty_rating as current_difficulty,
    cas.elite_athlete_count::int,
    cas.athletes_with_fast_outlier::int,
    cas.athletes_with_slow_outlier::int,
    (cas.athletes_with_fast_outlier + cas.athletes_with_slow_outlier)::int as total_outliers,
    (GREATEST(cas.athletes_with_fast_outlier, cas.athletes_with_slow_outlier)::float / cas.elite_athlete_count::float * 100.0)::float as outlier_percentage,
    cas.median_normalized_cs::float,
    cas.typical_normalized_cs::float,
    (cas.median_normalized_cs - cas.typical_normalized_cs)::float as difference_cs,
    ((cas.median_normalized_cs - cas.typical_normalized_cs) / 100.0)::float as difference_seconds_per_mile,
    -- Determine if anomaly is consistently faster, slower, or mixed
    CASE
      WHEN cas.athletes_with_fast_outlier > cas.athletes_with_slow_outlier * 2
        THEN 'FASTER (easier than rated)'
      WHEN cas.athletes_with_slow_outlier > cas.athletes_with_fast_outlier * 2
        THEN 'SLOWER (harder than rated)'
      ELSE 'MIXED (inconsistent performances)'
    END as anomaly_direction,
    -- Confidence: more athletes + higher outlier percentage = higher confidence
    (LEAST(1.0, cas.elite_athlete_count::float / 50.0) *
     (GREATEST(cas.athletes_with_fast_outlier, cas.athletes_with_slow_outlier)::float / cas.elite_athlete_count::float))::float as confidence_score,
    CASE
      WHEN (GREATEST(cas.athletes_with_fast_outlier, cas.athletes_with_slow_outlier)::float / cas.elite_athlete_count::float) > 0.50
        THEN 'CRITICAL - Over 50% have outlier times'
      WHEN (GREATEST(cas.athletes_with_fast_outlier, cas.athletes_with_slow_outlier)::float / cas.elite_athlete_count::float) > 0.30
        THEN 'HIGH - 30-50% have outlier times'
      WHEN (GREATEST(cas.athletes_with_fast_outlier, cas.athletes_with_slow_outlier)::float / cas.elite_athlete_count::float) > 0.15
        THEN 'MEDIUM - 15-30% have outlier times'
      WHEN (GREATEST(cas.athletes_with_fast_outlier, cas.athletes_with_slow_outlier)::float / cas.elite_athlete_count::float) > 0.05
        THEN 'LOW - 5-15% have outlier times'
      ELSE 'NORMAL - Under 5% outliers'
    END as suspicion_level
  FROM course_anomaly_stats cas
  -- Include courses with significant anomalies in EITHER direction
  WHERE ABS(cas.median_normalized_cs - cas.typical_normalized_cs) > 100  -- At least 1 sec/mile difference
    AND (cas.athletes_with_fast_outlier + cas.athletes_with_slow_outlier) > 0  -- Has outliers
  ORDER BY GREATEST(cas.athletes_with_fast_outlier, cas.athletes_with_slow_outlier) DESC,
           ABS(cas.median_normalized_cs - cas.typical_normalized_cs) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION identify_course_anomalies_elite TO service_role, authenticated;

COMMENT ON FUNCTION identify_course_anomalies_elite IS
'Identifies courses where elite athletes (top 25%) are running statistically significantly faster than their typical performance. High outlier percentage suggests course may be easier than rated, short-measured, or have data quality issues.';

-- Example query to find suspicious courses (BOTH too fast and too slow)
SELECT
  course_name,
  ROUND(distance_meters::numeric / 1609.344, 2) as miles,
  elite_athlete_count,
  athletes_with_fast_outlier as fast_outliers,
  athletes_with_slow_outlier as slow_outliers,
  ROUND(outlier_percentage::numeric, 1) as outlier_pct,
  ROUND(difference_seconds_per_mile::numeric, 2) as diff_sec_per_mile,
  anomaly_direction,
  ROUND((confidence_score * 100)::numeric, 0) as confidence_pct,
  suspicion_level
FROM identify_course_anomalies_elite(10, 2.0)
ORDER BY outlier_percentage DESC, ABS(difference_seconds_per_mile) DESC
LIMIT 20;
