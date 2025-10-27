-- Single Script: Fix Type Mismatch and Prepare for Re-import
-- Run this ONCE in Supabase, then re-scrape 2025 season

-- ============================================================================
-- STEP 1: Clean everything (we'll re-import)
-- ============================================================================

DELETE FROM results;
DELETE FROM races;
DELETE FROM meets;
DELETE FROM athletes;
DELETE FROM schools;

-- ============================================================================
-- STEP 2: Fix courses table - change venue_id to UUID
-- ============================================================================

DROP TABLE IF EXISTS courses CASCADE;

CREATE TABLE courses (
  id SERIAL PRIMARY KEY,
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,  -- UUID, not INTEGER!
  distance_meters INTEGER NOT NULL,

  -- Course versioning
  layout_version TEXT DEFAULT 'standard',
  layout_description TEXT,
  active_from DATE,
  active_to DATE,

  -- Course characteristics
  elevation_gain_meters INTEGER,
  surface_type TEXT,
  xc_time_rating NUMERIC(5,3) DEFAULT 1.000,

  -- Course records
  boys_course_record_cs INTEGER,
  boys_record_holder_id INTEGER,
  boys_record_date DATE,
  girls_course_record_cs INTEGER,
  girls_record_holder_id INTEGER,
  girls_record_date DATE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(venue_id, distance_meters, layout_version)
);

CREATE INDEX idx_courses_venue ON courses(venue_id);
CREATE INDEX idx_courses_distance ON courses(distance_meters);
CREATE INDEX idx_courses_rating ON courses(xc_time_rating);

-- ============================================================================
-- STEP 3: Verify table structure
-- ============================================================================

SELECT
  'Type Check' as verification,
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'venues' AND column_name = 'id') OR
    (table_name = 'courses' AND column_name = 'venue_id')
  )
ORDER BY table_name;

-- ============================================================================
-- STEP 4: Show current counts (should all be 0)
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
-- ALL DONE!
--
-- Next steps:
-- 1. This script is complete ✅
-- 2. Go to /admin/scrape-requests
-- 3. Remove the old completed request
-- 4. Add new request: School ID 1076, Click "Current Season"
-- 5. Click "Run All Pending"
-- 6. Data will import correctly with UUID types!
-- ============================================================================
