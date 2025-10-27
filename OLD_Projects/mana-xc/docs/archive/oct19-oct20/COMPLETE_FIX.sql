-- Complete Fix: Clean database and ensure all types are correct
-- Run this ONCE, then re-scrape 2025

-- ============================================================================
-- STEP 1: Clean all data
-- ============================================================================
DELETE FROM results;
DELETE FROM races;
DELETE FROM meets;
DELETE FROM athletes;
DELETE FROM schools;

-- Don't delete venues - we can reuse them

-- ============================================================================
-- STEP 2: Fix races.course_id to be INTEGER
-- ============================================================================
ALTER TABLE races DROP COLUMN IF EXISTS course_id;
ALTER TABLE races ADD COLUMN course_id INTEGER REFERENCES courses(id);

-- ============================================================================
-- STEP 3: Verify all key foreign key types are correct
-- ============================================================================
SELECT
  'Type Verification' as check_name,
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'venues' AND column_name = 'id') OR
    (table_name = 'courses' AND column_name = 'id') OR
    (table_name = 'courses' AND column_name = 'venue_id') OR
    (table_name = 'races' AND column_name = 'course_id') OR
    (table_name = 'meets' AND column_name = 'id') OR
    (table_name = 'races' AND column_name = 'meet_id') OR
    (table_name = 'athletes' AND column_name = 'id') OR
    (table_name = 'results' AND column_name = 'athlete_id') OR
    (table_name = 'results' AND column_name = 'race_id')
  )
ORDER BY table_name, column_name;

-- ============================================================================
-- STEP 4: Show counts (should all be 0 except venues)
-- ============================================================================
SELECT 'Venues' as table_name, COUNT(*) as count FROM venues
UNION ALL
SELECT 'Courses', COUNT(*) FROM courses
UNION ALL
SELECT 'Meets', COUNT(*) FROM meets
UNION ALL
SELECT 'Races', COUNT(*) FROM races
UNION ALL
SELECT 'Athletes', COUNT(*) FROM athletes
UNION ALL
SELECT 'Schools', COUNT(*) FROM schools
UNION ALL
SELECT 'Results', COUNT(*) FROM results;

-- ============================================================================
-- Expected types after this script:
--
-- venues.id              → UUID (original)
-- courses.id             → integer (SERIAL)
-- courses.venue_id       → UUID (references venues.id)
-- races.course_id        → integer (references courses.id)
-- meets.id               → integer (SERIAL)
-- races.meet_id          → integer (references meets.id)
-- athletes.id            → integer (SERIAL)
-- results.athlete_id     → integer (references athletes.id)
-- results.race_id        → integer (references races.id)
--
-- After running this, re-scrape 2025 and everything should import correctly!
-- ============================================================================
