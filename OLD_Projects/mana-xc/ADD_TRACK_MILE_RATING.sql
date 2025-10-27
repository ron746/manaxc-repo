-- Add Track Mile Rating System
-- Universal baseline: 1 Mile Track Time
-- Conversion factor from XC to Track: 0.8505
-- Based on: Crystal Springs 16:00 (2.95mi) = 4:36.4 (1 mile track)

-- Step 1: Add track_mile_rating column to courses table
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS track_mile_rating NUMERIC DEFAULT 1.0000;

-- Step 2: Calculate track_mile_rating for all courses
-- Formula: track_mile_rating = xc_time_rating * 0.8505
-- This converts XC course difficulty to equivalent track mile pace

UPDATE courses
SET track_mile_rating = xc_time_rating * 0.8505;

-- Step 3: Verify the conversion
-- For Crystal Springs: rating should be 0.8505 (16:00 XC = 4:36.4 track)
SELECT
  v.name as venue,
  c.distance_meters,
  ROUND(c.distance_meters / 1609.34, 2) as distance_miles,
  c.xc_time_rating as xc_rating,
  ROUND(c.track_mile_rating::numeric, 4) as track_mile_rating,
  CASE
    WHEN c.xc_time_rating > 1.00 THEN '🟢 Easier XC course'
    WHEN c.xc_time_rating = 1.00 THEN '⚪ Baseline (Crystal Springs)'
    ELSE '🔴 Harder XC course'
  END as xc_difficulty,
  -- Show what a 16:00 at Crystal Springs converts to
  FLOOR((96000 / c.xc_time_rating * c.track_mile_rating)::integer / 6000)::text || ':' ||
  LPAD(FLOOR(((96000 / c.xc_time_rating * c.track_mile_rating)::integer % 6000) / 100)::text, 2, '0') || '.' ||
  LPAD(((96000 / c.xc_time_rating * c.track_mile_rating)::integer % 100)::text, 2, '0') as track_mile_equivalent,
  COUNT(DISTINCT res.athlete_id) as athletes
FROM courses c
JOIN venues v ON v.id = c.venue_id
LEFT JOIN races r ON r.course_id = c.id
LEFT JOIN results res ON res.race_id = r.id
GROUP BY c.id, v.name, c.distance_meters, c.xc_time_rating, c.track_mile_rating
ORDER BY c.xc_time_rating DESC, athletes DESC;

-- Step 4: Create materialized view for athlete track mile PRs
DROP MATERIALIZED VIEW IF EXISTS athlete_track_mile_prs CASCADE;

CREATE MATERIALIZED VIEW athlete_track_mile_prs AS
SELECT
  r.athlete_id,
  -- Best XC time (normalized to Crystal Springs)
  MIN(r.time_cs * c.xc_time_rating) as best_xc_time_cs,
  -- Best Track Mile Equivalent
  MIN(r.time_cs * c.track_mile_rating) as best_track_mile_cs,
  -- Course where they achieved their best
  (
    SELECT ra2.course_id
    FROM results r2
    JOIN races ra2 ON ra2.id = r2.race_id
    JOIN courses c2 ON c2.id = ra2.course_id
    WHERE r2.athlete_id = r.athlete_id
      AND r2.time_cs > 0
    ORDER BY r2.time_cs * c2.xc_time_rating ASC
    LIMIT 1
  ) as best_performance_course_id
FROM results r
JOIN races ra ON ra.id = r.race_id
JOIN courses c ON c.id = ra.course_id
WHERE r.time_cs > 0
GROUP BY r.athlete_id;

-- Create indexes
CREATE INDEX idx_athlete_track_mile_prs_athlete ON athlete_track_mile_prs(athlete_id);
CREATE INDEX idx_athlete_track_mile_prs_track_mile ON athlete_track_mile_prs(best_track_mile_cs);

-- Step 5: Verify Crystal Springs conversion
-- Should show 16:00 XC = 4:36.4 track mile
SELECT
  'Crystal Springs Verification' as test,
  v.name as venue,
  '16:00.0 XC time' as xc_time,
  FLOOR((96000 * c.track_mile_rating)::integer / 6000)::text || ':' ||
  LPAD(FLOOR(((96000 * c.track_mile_rating)::integer % 6000) / 100)::text, 2, '0') || '.' ||
  LPAD(((96000 * c.track_mile_rating)::integer % 100)::text, 2, '0') as track_mile_equivalent,
  '4:36.4' as expected_result,
  CASE
    WHEN ABS((96000 * c.track_mile_rating) - 27640) < 10 THEN '✅ Correct'
    ELSE '⚠️ Check conversion'
  END as validation
FROM courses c
JOIN venues v ON v.id = c.venue_id
WHERE v.name LIKE '%Crystal Springs%'
  AND c.distance_meters = 4748;

-- Step 6: Top 20 Track Mile Estimated PR (male)
SELECT
  'Top 20 Male Track Mile Estimated PR' as category,
  a.full_name,
  s.name as school,
  a.graduation_year,
  FLOOR(pr.best_track_mile_cs::integer / 6000)::text || ':' ||
  LPAD(FLOOR((pr.best_track_mile_cs::integer % 6000) / 100)::text, 2, '0') || '.' ||
  LPAD((pr.best_track_mile_cs::integer % 100)::text, 2, '0') as track_mile_estimated_pr,
  v.name as course_achieved
FROM athlete_track_mile_prs pr
JOIN athletes a ON a.id = pr.athlete_id
JOIN schools s ON s.id = a.current_school_id
JOIN courses c ON c.id = pr.best_performance_course_id
JOIN venues v ON v.id = c.venue_id
WHERE a.gender::text = 'M'  -- Male
ORDER BY pr.best_track_mile_cs ASC
LIMIT 20;

-- Step 7: Top 20 Track Mile Estimated PR (female)
SELECT
  'Top 20 Female Track Mile Estimated PR' as category,
  a.full_name,
  s.name as school,
  a.graduation_year,
  FLOOR(pr.best_track_mile_cs::integer / 6000)::text || ':' ||
  LPAD(FLOOR((pr.best_track_mile_cs::integer % 6000) / 100)::text, 2, '0') || '.' ||
  LPAD((pr.best_track_mile_cs::integer % 100)::text, 2, '0') as track_mile_estimated_pr,
  v.name as course_achieved
FROM athlete_track_mile_prs pr
JOIN athletes a ON a.id = pr.athlete_id
JOIN schools s ON s.id = a.current_school_id
JOIN courses c ON c.id = pr.best_performance_course_id
JOIN venues v ON v.id = c.venue_id
WHERE a.gender::text = 'F'  -- Female
ORDER BY pr.best_track_mile_cs ASC
LIMIT 20;

-- Step 8: Summary
SELECT
  'Track Mile Rating System Enabled' as status,
  COUNT(*) as total_courses,
  ROUND(MIN(track_mile_rating)::numeric, 4) as min_track_rating,
  ROUND(MAX(track_mile_rating)::numeric, 4) as max_track_rating,
  COUNT(*) FILTER (WHERE track_mile_rating IS NOT NULL) as courses_with_track_rating
FROM courses;
