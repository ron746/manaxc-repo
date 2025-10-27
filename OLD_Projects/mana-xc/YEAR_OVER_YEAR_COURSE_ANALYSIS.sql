-- Year-Over-Year Course Consistency Analysis
-- Detects when courses change significantly between seasons
-- Example: Montgomery Hill 160m short in 2025 should show as anomaly

-- Step 1: Calculate average times by course and season (gender-separated)
WITH course_season_stats AS (
  SELECT
    c.id as course_id,
    v.name as venue,
    c.distance_meters,
    res.season_year,
    r.gender,
    COUNT(*) as result_count,
    AVG(res.time_cs) as avg_time_cs,
    STDDEV(res.time_cs) as std_time_cs,
    MIN(res.time_cs) as min_time_cs,
    MAX(res.time_cs) as max_time_cs,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY res.time_cs) as median_time_cs
  FROM results res
  JOIN races r ON r.id = res.race_id
  JOIN courses c ON c.id = r.course_id
  JOIN venues v ON v.id = c.venue_id
  WHERE res.time_cs > 0 AND res.time_cs < 200000
  GROUP BY c.id, v.name, c.distance_meters, res.season_year, r.gender
  HAVING COUNT(*) >= 10  -- Require at least 10 results for statistical validity
),

-- Step 2: Calculate year-over-year changes
yoy_changes AS (
  SELECT
    curr.venue,
    curr.distance_meters,
    curr.season_year as current_year,
    curr.season_year - 1 as prior_year,
    curr.gender,
    curr.avg_time_cs as current_avg,
    prev.avg_time_cs as prior_avg,
    curr.avg_time_cs - prev.avg_time_cs as time_diff_cs,
    ((curr.avg_time_cs - prev.avg_time_cs)::decimal / prev.avg_time_cs) * 100 as pct_change,
    curr.result_count as current_count,
    prev.result_count as prior_count
  FROM course_season_stats curr
  LEFT JOIN course_season_stats prev
    ON curr.course_id = prev.course_id
    AND curr.gender = prev.gender
    AND prev.season_year = curr.season_year - 1
  WHERE prev.avg_time_cs IS NOT NULL  -- Only show courses with prior year data
)

-- Step 3: Flag significant changes (>3% faster or slower)
SELECT
  venue,
  distance_meters,
  ROUND(distance_meters / 1609.34, 2) as distance_miles,
  current_year,
  prior_year,
  gender,
  -- Format times
  FLOOR(current_avg::integer / 6000)::text || ':' ||
  LPAD(FLOOR((current_avg::integer % 6000) / 100)::text, 2, '0') || '.' ||
  LPAD((current_avg::integer % 100)::text, 2, '0') as current_avg_time,
  FLOOR(prior_avg::integer / 6000)::text || ':' ||
  LPAD(FLOOR((prior_avg::integer % 6000) / 100)::text, 2, '0') || '.' ||
  LPAD((prior_avg::integer % 100)::text, 2, '0') as prior_avg_time,
  -- Time difference
  FLOOR(ABS(time_diff_cs)::integer / 6000)::text || ':' ||
  LPAD(FLOOR((ABS(time_diff_cs)::integer % 6000) / 100)::text, 2, '0') || '.' ||
  LPAD((ABS(time_diff_cs)::integer % 100)::text, 2, '0') as time_difference,
  ROUND(pct_change, 2) as pct_change,
  current_count,
  prior_count,
  -- Flag anomalies
  CASE
    WHEN pct_change < -5 THEN '🚩 MUCH FASTER (>5%) - Possible course change'
    WHEN pct_change < -3 THEN '⚠️ Significantly faster (3-5%)'
    WHEN pct_change > 5 THEN '🚩 MUCH SLOWER (>5%) - Possible course change'
    WHEN pct_change > 3 THEN '⚠️ Significantly slower (3-5%)'
    WHEN pct_change BETWEEN -1 AND 1 THEN '✅ Consistent (<1% change)'
    ELSE '🟡 Minor change (1-3%)'
  END as status,
  -- Explanation
  CASE
    WHEN venue = 'Montgomery Hill Park' AND current_year = 2025 AND pct_change < -3
    THEN '📝 Known issue: Course ~160m short in 2025'
    ELSE ''
  END as notes
FROM yoy_changes
ORDER BY ABS(pct_change) DESC, venue, current_year;

-- Step 4: Multi-year trend for specific courses
WITH course_trends AS (
  SELECT
    v.name as venue,
    c.distance_meters,
    res.season_year,
    r.gender,
    AVG(res.time_cs) as avg_time_cs,
    COUNT(*) as result_count
  FROM results res
  JOIN races r ON r.id = res.race_id
  JOIN courses c ON c.id = r.course_id
  JOIN venues v ON v.id = c.venue_id
  WHERE res.time_cs > 0 AND res.time_cs < 200000
    AND v.name IN ('Montgomery Hill Park', 'Crystal Springs', 'Baylands Park', 'Woodward Park')
  GROUP BY v.name, c.distance_meters, res.season_year, r.gender
  HAVING COUNT(*) >= 10
)
SELECT
  venue,
  distance_meters,
  gender,
  season_year,
  FLOOR(avg_time_cs::integer / 6000)::text || ':' ||
  LPAD(FLOOR((avg_time_cs::integer % 6000) / 100)::text, 2, '0') || '.' ||
  LPAD((avg_time_cs::integer % 100)::text, 2, '0') as avg_time,
  result_count,
  -- Calculate trend from 2022 baseline
  CASE
    WHEN season_year = 2022 THEN '📊 Baseline year'
    ELSE ROUND(((avg_time_cs - LAG(avg_time_cs) OVER (PARTITION BY venue, distance_meters, gender ORDER BY season_year))::decimal
      / LAG(avg_time_cs) OVER (PARTITION BY venue, distance_meters, gender ORDER BY season_year)) * 100, 2)::text || '%'
  END as yoy_change
FROM course_trends
ORDER BY venue, gender, season_year;

-- Step 5: Summary - Courses with consistent ratings
SELECT
  v.name as venue,
  c.distance_meters,
  COUNT(DISTINCT res.season_year) as seasons_with_data,
  MIN(res.season_year) || '-' || MAX(res.season_year) as year_range,
  STDDEV(
    (SELECT AVG(res2.time_cs)
     FROM results res2
     JOIN races r2 ON r2.id = res2.race_id
     WHERE r2.course_id = c.id
       AND res2.season_year = res.season_year
       AND res2.time_cs > 0 AND res2.time_cs < 200000
    )
  ) as year_to_year_variance,
  CASE
    WHEN STDDEV(
      (SELECT AVG(res2.time_cs)
       FROM results res2
       JOIN races r2 ON r2.id = res2.race_id
       WHERE r2.course_id = c.id
         AND res2.season_year = res.season_year
         AND res2.time_cs > 0 AND res2.time_cs < 200000
      )
    ) < 500 THEN '✅ Very consistent (<5 sec variance)'
    WHEN STDDEV(
      (SELECT AVG(res2.time_cs)
       FROM results res2
       JOIN races r2 ON r2.id = res2.race_id
       WHERE r2.course_id = c.id
         AND res2.season_year = res.season_year
         AND res2.time_cs > 0 AND res2.time_cs < 200000
      )
    ) < 1000 THEN '🟡 Moderately consistent (5-10 sec variance)'
    ELSE '⚠️ High variance (>10 sec) - investigate'
  END as consistency_rating
FROM results res
JOIN races r ON r.id = res.race_id
JOIN courses c ON c.id = r.course_id
JOIN venues v ON v.id = c.venue_id
WHERE res.time_cs > 0 AND res.time_cs < 200000
GROUP BY c.id, v.name, c.distance_meters
HAVING COUNT(DISTINCT res.season_year) >= 2  -- Need at least 2 years
ORDER BY year_to_year_variance ASC;
