-- Mana XC - Data Import Fixes (V2 - Fixed FK Constraints)
-- Run this to clean up bad data and prepare for re-import

-- STEP 1: Delete all bad data (in correct order to respect foreign keys)
DELETE FROM results;
DELETE FROM races;
DELETE FROM meets;
DELETE FROM athletes;
DELETE FROM schools;
DELETE FROM course_rating_defaults;  -- Must delete before courses
DELETE FROM courses;

-- STEP 2: Fix schema issues

-- Change gender from boolean to TEXT in races table
ALTER TABLE races ALTER COLUMN gender TYPE TEXT USING
  CASE
    WHEN gender = true THEN 'M'
    WHEN gender = false THEN 'F'
    ELSE NULL
  END;

-- Change gender from boolean to TEXT in athletes table
ALTER TABLE athletes ALTER COLUMN gender TYPE TEXT USING
  CASE
    WHEN gender = true THEN 'M'
    WHEN gender = false THEN 'F'
    ELSE NULL
  END;

-- Add season_year to meets if missing
ALTER TABLE meets ADD COLUMN IF NOT EXISTS season_year INTEGER;

-- Add season_year to results if missing
ALTER TABLE results ADD COLUMN IF NOT EXISTS season_year INTEGER;

-- Add course_id to races if missing
ALTER TABLE races ADD COLUMN IF NOT EXISTS course_id INTEGER REFERENCES courses(id);

-- Add ath_net_id to schools if missing
ALTER TABLE schools ADD COLUMN IF NOT EXISTS ath_net_id TEXT;

-- STEP 3: After re-import, update calculated fields

-- Update total_participants for all races
UPDATE races
SET total_participants = (
  SELECT COUNT(*)
  FROM results
  WHERE results.race_id = races.id
);

-- Update season_year for all meets (from meet_date)
UPDATE meets
SET season_year = EXTRACT(YEAR FROM meet_date);

-- Update season_year for all results (from meet date via race)
UPDATE results
SET season_year = (
  SELECT EXTRACT(YEAR FROM m.meet_date)
  FROM meets m
  JOIN races r ON r.meet_id = m.id
  WHERE r.id = results.race_id
);

-- STEP 4: Refresh materialized view
REFRESH MATERIALIZED VIEW athlete_xc_times_v3;

-- STEP 5: Verify counts (should all be 0 after cleanup, then populated after import)
SELECT 'Meets' as table_name, COUNT(*) as count FROM meets
UNION ALL
SELECT 'Courses', COUNT(*) FROM courses
UNION ALL
SELECT 'Races', COUNT(*) FROM races
UNION ALL
SELECT 'Schools', COUNT(*) FROM schools
UNION ALL
SELECT 'Athletes', COUNT(*) FROM athletes
UNION ALL
SELECT 'Results', COUNT(*) FROM results
UNION ALL
SELECT 'Course Rating Defaults', COUNT(*) FROM course_rating_defaults;
