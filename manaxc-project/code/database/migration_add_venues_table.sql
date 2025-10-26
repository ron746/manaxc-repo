-- ============================================================================
-- MIGRATION: Add Venues Table and Fix Relationships
-- Date: October 26, 2025
-- Purpose: Separate venues from courses, fix meets → venues relationship
--
-- CHANGES:
-- 1. Create venues table
-- 2. Populate venues from existing courses.venue data
-- 3. Add venue_id to courses table
-- 4. Link courses to venues
-- 5. Replace meets.course_id with meets.venue_id
-- 6. Add course_id to races table
--
-- SCHEMA BEFORE:
--   courses (venue TEXT, ...)
--   meets (course_id → courses)
--   races (meet_id → meets)
--
-- SCHEMA AFTER:
--   venues (id, name)
--   courses (venue_id → venues, ...)
--   meets (venue_id → venues)
--   races (meet_id → meets, course_id → courses)
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Create venues table
-- ============================================================================

-- Drop existing venues table if it exists (to ensure clean state)
DROP TABLE IF EXISTS venues CASCADE;

CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,

  -- Location details
  city TEXT,
  state TEXT DEFAULT 'CA',

  -- Optional
  full_address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  website_url TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_venues_name ON venues(name);
CREATE INDEX IF NOT EXISTS idx_venues_location ON venues(city, state);

COMMENT ON TABLE venues IS 'Physical locations where XC meets are held';
COMMENT ON COLUMN venues.name IS 'Venue name (e.g., "Crystal Springs", "Track", "Montgomery Hill")';

-- ============================================================================
-- STEP 2: Populate venues from existing courses.venue data
-- ============================================================================

-- Extract unique venue names from courses table
INSERT INTO venues (name)
SELECT DISTINCT venue
FROM courses
WHERE venue IS NOT NULL AND venue != ''
ON CONFLICT (name) DO NOTHING;

-- Verify venues were created
DO $$
DECLARE
  venue_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO venue_count FROM venues;
  RAISE NOTICE '✅ Created % venues from courses.venue data', venue_count;
END $$;

-- ============================================================================
-- STEP 3: Add venue_id to courses table
-- ============================================================================

-- Add the new column (nullable initially)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS venue_id UUID;

-- Create foreign key relationship
ALTER TABLE courses
  ADD CONSTRAINT fk_courses_venue
  FOREIGN KEY (venue_id) REFERENCES venues(id);

-- Populate venue_id by matching venue names
UPDATE courses c
SET venue_id = v.id
FROM venues v
WHERE c.venue = v.name;

-- Verify all courses have venue_id
DO $$
DECLARE
  courses_total INTEGER;
  courses_with_venue INTEGER;
BEGIN
  SELECT COUNT(*) INTO courses_total FROM courses;
  SELECT COUNT(*) INTO courses_with_venue FROM courses WHERE venue_id IS NOT NULL;

  IF courses_total = courses_with_venue THEN
    RAISE NOTICE '✅ All % courses linked to venues', courses_total;
  ELSE
    RAISE WARNING '⚠️  Only %/% courses linked to venues', courses_with_venue, courses_total;
  END IF;
END $$;

-- Make venue_id NOT NULL after data migration
ALTER TABLE courses ALTER COLUMN venue_id SET NOT NULL;

-- Add index
CREATE INDEX IF NOT EXISTS idx_courses_venue ON courses(venue_id);

-- ============================================================================
-- STEP 4: Update meets table
-- ============================================================================

-- Add venue_id column (nullable initially)
ALTER TABLE meets ADD COLUMN IF NOT EXISTS venue_id UUID;

-- Create foreign key relationship
ALTER TABLE meets
  ADD CONSTRAINT fk_meets_venue
  FOREIGN KEY (venue_id) REFERENCES venues(id);

-- If meets already have course_id, derive venue_id from courses
UPDATE meets m
SET venue_id = c.venue_id
FROM courses c
WHERE m.course_id = c.id
AND m.venue_id IS NULL;

-- Add index
CREATE INDEX IF NOT EXISTS idx_meets_venue ON meets(venue_id);

-- Drop the old course_id foreign key constraint and column
-- Note: Only if course_id exists
DO $$
BEGIN
  -- Drop foreign key constraint if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'meets_course_id_fkey'
    AND table_name = 'meets'
  ) THEN
    ALTER TABLE meets DROP CONSTRAINT meets_course_id_fkey;
    RAISE NOTICE '✅ Dropped meets.course_id foreign key constraint';
  END IF;

  -- Drop the column if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meets'
    AND column_name = 'course_id'
  ) THEN
    ALTER TABLE meets DROP COLUMN course_id;
    RAISE NOTICE '✅ Dropped meets.course_id column';
  END IF;
END $$;

-- ============================================================================
-- STEP 5: Add course_id to races table
-- ============================================================================

-- Add course_id column (nullable initially, since we'll populate during import)
ALTER TABLE races ADD COLUMN IF NOT EXISTS course_id UUID;

-- Create foreign key relationship
ALTER TABLE races
  ADD CONSTRAINT fk_races_course
  FOREIGN KEY (course_id) REFERENCES courses(id);

-- Add index
CREATE INDEX IF NOT EXISTS idx_races_course ON races(course_id);

COMMENT ON COLUMN races.course_id IS 'The specific course run in this race (a venue can have multiple courses)';

-- ============================================================================
-- STEP 6: Enable RLS for venues table
-- ============================================================================

ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access" ON venues FOR SELECT USING (TRUE);

-- ============================================================================
-- STEP 7: Clean up - keep venue column in courses for reference during import
-- ============================================================================

-- We'll keep courses.venue as TEXT for now to help with CSV import validation
-- It can be dropped later after confirming all imports work correctly

COMMENT ON COLUMN courses.venue IS 'DEPRECATED: Use venue_id instead. Kept for import validation.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  venue_count INTEGER;
  course_count INTEGER;
  meet_count INTEGER;
  race_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO venue_count FROM venues;
  SELECT COUNT(*) INTO course_count FROM courses WHERE venue_id IS NOT NULL;
  SELECT COUNT(*) INTO meet_count FROM meets;
  SELECT COUNT(*) INTO race_count FROM races;

  RAISE NOTICE '';
  RAISE NOTICE '================================================================================';
  RAISE NOTICE 'MIGRATION VERIFICATION';
  RAISE NOTICE '================================================================================';
  RAISE NOTICE 'Venues created: %', venue_count;
  RAISE NOTICE 'Courses with venue_id: %', course_count;
  RAISE NOTICE 'Meets total: %', meet_count;
  RAISE NOTICE 'Races total: %', race_count;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Migration complete! Schema is ready for CSV import.';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Disable RLS for import (run DISABLE_RLS_FOR_IMPORT.sql)';
  RAISE NOTICE '2. Run CSV import scripts in order:';
  RAISE NOTICE '   - csv_import_01_venues.py';
  RAISE NOTICE '   - csv_import_02_courses.py';
  RAISE NOTICE '   - csv_import_03_athletes.py';
  RAISE NOTICE '   - csv_import_04_meets.py';
  RAISE NOTICE '   - csv_import_05_races.py';
  RAISE NOTICE '   - csv_import_06_results.py';
  RAISE NOTICE '3. Re-enable RLS (run ENABLE_RLS_AFTER_IMPORT.sql)';
  RAISE NOTICE '================================================================================';
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================

-- To rollback this migration, run:
/*
BEGIN;
ALTER TABLE courses DROP CONSTRAINT IF EXISTS fk_courses_venue;
ALTER TABLE courses DROP COLUMN IF EXISTS venue_id;
ALTER TABLE meets DROP CONSTRAINT IF EXISTS fk_meets_venue;
ALTER TABLE meets DROP COLUMN IF EXISTS venue_id;
ALTER TABLE meets ADD COLUMN course_id UUID REFERENCES courses(id);
ALTER TABLE races DROP CONSTRAINT IF EXISTS fk_races_course;
ALTER TABLE races DROP COLUMN IF EXISTS course_id;
DROP TABLE IF EXISTS venues CASCADE;
COMMIT;
*/
