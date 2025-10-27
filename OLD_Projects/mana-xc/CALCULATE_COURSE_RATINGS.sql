-- AI Course Rating Calculator
-- Analyzes overlapping runners to calculate relative course difficulty
-- Crystal Springs 2.95 Mile = 1.000 baseline (ALWAYS)

-- Step 1: Find Crystal Springs 2.95 Mile course (our baseline)
WITH crystal_springs_course AS (
  SELECT c.id as course_id
  FROM courses c
  JOIN venues v ON v.id = c.venue_id
  WHERE v.name LIKE '%Crystal Springs%'
    AND c.distance_meters BETWEEN 4700 AND 4800  -- 2.95 miles ≈ 4748m
  LIMIT 1
),

-- Step 2: Find overlapping runners (athletes who raced at Crystal Springs AND other courses)
overlapping_athletes AS (
  SELECT DISTINCT
    res1.athlete_id,
    res1.race_id as crystal_race_id,
    res1.time_cs as crystal_time_cs,
    res2.race_id as other_race_id,
    res2.time_cs as other_time_cs,
    r2.course_id as other_course_id
  FROM results res1
  JOIN races r1 ON r1.id = res1.race_id
  JOIN results res2 ON res2.athlete_id = res1.athlete_id
  JOIN races r2 ON r2.id = res2.race_id
  CROSS JOIN crystal_springs_course cs
  WHERE r1.course_id = cs.course_id  -- Crystal Springs race
    AND r2.course_id != cs.course_id  -- Different course
    AND res1.time_cs > 0
    AND res2.time_cs > 0
    AND res1.time_cs < 200000  -- Filter outliers (< 33 minutes)
    AND res2.time_cs < 200000
),

-- Step 3: Calculate time ratios for each athlete at each course pair
time_ratios AS (
  SELECT
    other_course_id,
    athlete_id,
    -- Ratio: crystal_time / other_time (INVERTED to get rating)
    -- If ratio > 1.0, other course is faster (easier) - you run faster there
    -- If ratio < 1.0, other course is slower (harder) - you run slower there
    (crystal_time_cs::decimal / other_time_cs::decimal) as time_ratio
  FROM overlapping_athletes
),

-- Step 4: Calculate median ratio for each course (robust to outliers)
course_ratings AS (
  SELECT
    other_course_id as course_id,
    COUNT(*) as sample_size,
    -- Median ratio (50th percentile)
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY time_ratio) as median_ratio,
    -- Also get 25th and 75th percentiles for confidence interval
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY time_ratio) as p25_ratio,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY time_ratio) as p75_ratio,
    -- Standard deviation for validation
    STDDEV(time_ratio) as std_dev,
    -- Mean for comparison
    AVG(time_ratio) as mean_ratio
  FROM time_ratios
  GROUP BY other_course_id
  HAVING COUNT(*) >= 10  -- Require at least 10 overlapping runners
)

-- Step 5: Display results with course details
SELECT
  v.name as venue,
  v.city,
  c.distance_meters,
  ROUND(c.distance_meters / 1609.34, 2) as distance_miles,
  cr.sample_size as overlapping_runners,
  ROUND(cr.median_ratio::numeric, 4) as calculated_rating,
  ROUND(cr.mean_ratio::numeric, 4) as mean_rating,
  ROUND(cr.p25_ratio::numeric, 4) as rating_25th_percentile,
  ROUND(cr.p75_ratio::numeric, 4) as rating_75th_percentile,
  ROUND(cr.std_dev::numeric, 4) as std_deviation,
  CASE
    WHEN cr.median_ratio > 1.05 THEN '🟢 Easy (>5% faster)'
    WHEN cr.median_ratio > 1.02 THEN '🟡 Slightly Easy (2-5% faster)'
    WHEN cr.median_ratio > 0.98 THEN '⚪ Neutral (±2%)'
    WHEN cr.median_ratio > 0.95 THEN '🟠 Slightly Hard (2-5% slower)'
    ELSE '🔴 Hard (>5% slower)'
  END as difficulty,
  -- Show what this means in practice (for a 16:00 at Crystal Springs)
  FLOOR((96000 / cr.median_ratio)::integer / 6000)::text || ':' ||
  LPAD(FLOOR(((96000 / cr.median_ratio)::integer % 6000) / 100)::text, 2, '0') || '.' ||
  LPAD(((96000 / cr.median_ratio)::integer % 100)::text, 2, '0') as equivalent_16min_crystal
FROM course_ratings cr
JOIN courses c ON c.id = cr.course_id
JOIN venues v ON v.id = c.venue_id
ORDER BY cr.median_ratio DESC;

-- Step 6: Show Crystal Springs baseline (separate query)
SELECT
  '✅ BASELINE' as status,
  v.name as venue,
  c.distance_meters,
  1.0000 as rating,
  'Crystal Springs 2.95 Mile is the reference point - all other courses rated relative to this' as note
FROM courses c
JOIN venues v ON v.id = c.venue_id
WHERE v.name LIKE '%Crystal Springs%'
  AND c.distance_meters BETWEEN 4700 AND 4800
LIMIT 1;

-- Step 7: Validation - Compare to user's expected equivalencies (separate query)
-- User expects these times to be equivalent performance:
-- - Crystal Springs 2.95mi: 16:00.0
-- - Golden Gate Park 2.93mi: 15:29.7 (rating ≈ 1.033)
-- - Montgomery Hill 2.74mi: 15:13.0 (rating ≈ 1.052)
-- - Woodward Park 5000m: 16:19.6 (rating ≈ 0.980)

WITH crystal_springs_course AS (
  SELECT c.id as course_id
  FROM courses c
  JOIN venues v ON v.id = c.venue_id
  WHERE v.name LIKE '%Crystal Springs%'
    AND c.distance_meters BETWEEN 4700 AND 4800
  LIMIT 1
),
overlapping_athletes AS (
  SELECT DISTINCT
    res1.athlete_id,
    res1.time_cs as crystal_time_cs,
    res2.time_cs as other_time_cs,
    r2.course_id as other_course_id
  FROM results res1
  JOIN races r1 ON r1.id = res1.race_id
  JOIN results res2 ON res2.athlete_id = res1.athlete_id
  JOIN races r2 ON r2.id = res2.race_id
  CROSS JOIN crystal_springs_course cs
  WHERE r1.course_id = cs.course_id
    AND r2.course_id != cs.course_id
    AND res1.time_cs > 0 AND res1.time_cs < 200000
    AND res2.time_cs > 0 AND res2.time_cs < 200000
),
time_ratios AS (
  SELECT
    other_course_id,
    (crystal_time_cs::decimal / other_time_cs::decimal) as time_ratio
  FROM overlapping_athletes
),
course_ratings AS (
  SELECT
    other_course_id as course_id,
    COUNT(*) as sample_size,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY time_ratio) as median_ratio
  FROM time_ratios
  GROUP BY other_course_id
  HAVING COUNT(*) >= 10
)
SELECT
  'VALIDATION CHECK' as status,
  v.name as venue,
  c.distance_meters,
  ROUND(cr.median_ratio::numeric, 4) as calculated_rating,
  CASE v.name
    WHEN 'Golden Gate Park' THEN 1.0325
    WHEN 'Montgomery Hill Park' THEN 1.0515
    WHEN 'Woodward Park' THEN 0.9799
    ELSE NULL
  END as expected_rating,
  CASE v.name
    WHEN 'Golden Gate Park' THEN ROUND(ABS(cr.median_ratio - 1.0325)::numeric, 4)
    WHEN 'Montgomery Hill Park' THEN ROUND(ABS(cr.median_ratio - 1.0515)::numeric, 4)
    WHEN 'Woodward Park' THEN ROUND(ABS(cr.median_ratio - 0.9799)::numeric, 4)
    ELSE NULL
  END as difference,
  CASE
    WHEN v.name IN ('Golden Gate Park', 'Montgomery Hill Park', 'Woodward Park')
      AND ABS(cr.median_ratio - CASE v.name
        WHEN 'Golden Gate Park' THEN 1.0325
        WHEN 'Montgomery Hill Park' THEN 1.0515
        WHEN 'Woodward Park' THEN 0.9799
      END) < 0.02
    THEN '✅ Close match (<2% difference)'
    WHEN v.name IN ('Golden Gate Park', 'Montgomery Hill Park', 'Woodward Park')
    THEN '⚠️ Needs review'
    ELSE ''
  END as validation_status
FROM course_ratings cr
JOIN courses c ON c.id = cr.course_id
JOIN venues v ON v.id = c.venue_id
WHERE v.name IN ('Golden Gate Park', 'Montgomery Hill Park', 'Woodward Park')
ORDER BY v.name;
