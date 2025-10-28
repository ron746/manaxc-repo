-- Fix Supabase Schema to Match Correct Architecture
--
-- Architecture:
-- - Meets are at Venues (not courses)
-- - Courses are at Venues
-- - Races are on Courses
-- - All have Athletic.net IDs

-- ==============================================================================
-- 1. Add athletic_net_id to venues table
-- ==============================================================================

ALTER TABLE venues
ADD COLUMN IF NOT EXISTS athletic_net_id TEXT UNIQUE;

COMMENT ON COLUMN venues.athletic_net_id IS 'Athletic.net venue ID';


-- ==============================================================================
-- 2. Fix meets table - change from course_id to venue_id
-- ==============================================================================

-- Add venue_id column
ALTER TABLE meets
ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES venues(id);

-- Copy existing course → venue relationships (if any data exists)
-- Only run if course_id column exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='meets' AND column_name='course_id') THEN
        UPDATE meets m
        SET venue_id = c.venue_id
        FROM courses c
        WHERE m.course_id = c.id
        AND m.venue_id IS NULL;
    END IF;
END $$;

-- Remove host_school_id (not needed per Ron's clarification)
ALTER TABLE meets
DROP COLUMN IF EXISTS host_school_id;

-- Remove course_id if it exists (meets should reference venues, not courses)
ALTER TABLE meets
DROP COLUMN IF EXISTS course_id;

-- Make venue_id NOT NULL after data migration
-- (Comment out if you want to keep it nullable during transition)
-- ALTER TABLE meets ALTER COLUMN venue_id SET NOT NULL;

COMMENT ON COLUMN meets.venue_id IS 'Venue where meet took place';


-- ==============================================================================
-- 3. Ensure courses.athletic_net_id exists and is unique
-- ==============================================================================

-- Add if not exists
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS athletic_net_id TEXT UNIQUE;

COMMENT ON COLUMN courses.athletic_net_id IS 'Athletic.net course ID';


-- ==============================================================================
-- 4. Rename ath_net_id to athletic_net_id for consistency (all tables)
-- ==============================================================================

-- Schools
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='schools' AND column_name='ath_net_id') THEN
        ALTER TABLE schools RENAME COLUMN ath_net_id TO athletic_net_id;
    END IF;
END $$;

-- Athletes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='athletes' AND column_name='ath_net_id') THEN
        ALTER TABLE athletes RENAME COLUMN ath_net_id TO athletic_net_id;
    END IF;
END $$;

-- Meets
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='meets' AND column_name='ath_net_id') THEN
        ALTER TABLE meets RENAME COLUMN ath_net_id TO athletic_net_id;
    END IF;
END $$;

-- Races - add athletic_net_race_id if it doesn't exist
ALTER TABLE races
ADD COLUMN IF NOT EXISTS athletic_net_race_id TEXT;

-- Rename from ath_net_race_id if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='races' AND column_name='ath_net_race_id') THEN
        -- Copy data first
        UPDATE races SET athletic_net_race_id = ath_net_race_id WHERE athletic_net_race_id IS NULL;
        -- Drop old column
        ALTER TABLE races DROP COLUMN ath_net_race_id;
    END IF;
END $$;


-- ==============================================================================
-- 5. Add indexes for Athletic.net IDs (performance)
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_venues_athletic_net_id
ON venues(athletic_net_id);

CREATE INDEX IF NOT EXISTS idx_courses_athletic_net_id
ON courses(athletic_net_id);

CREATE INDEX IF NOT EXISTS idx_schools_athletic_net_id
ON schools(athletic_net_id);

CREATE INDEX IF NOT EXISTS idx_athletes_athletic_net_id
ON athletes(athletic_net_id);

CREATE INDEX IF NOT EXISTS idx_meets_athletic_net_id
ON meets(athletic_net_id);

CREATE INDEX IF NOT EXISTS idx_races_athletic_net_race_id
ON races(athletic_net_race_id) WHERE athletic_net_race_id IS NOT NULL;


-- ==============================================================================
-- 6. Verify schema
-- ==============================================================================

-- Show final structure
SELECT
    'venues' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'venues'
  AND column_name IN ('id', 'name', 'athletic_net_id', 'city', 'state')
ORDER BY ordinal_position;

SELECT
    'courses' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'courses'
  AND column_name IN ('id', 'name', 'venue_id', 'athletic_net_id', 'distance_meters', 'difficulty_rating')
ORDER BY ordinal_position;

SELECT
    'meets' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'meets'
  AND column_name IN ('id', 'name', 'venue_id', 'athletic_net_id', 'meet_date', 'season_year')
ORDER BY ordinal_position;

SELECT
    'races' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'races'
  AND column_name IN ('id', 'name', 'meet_id', 'athletic_net_race_id', 'gender')
ORDER BY ordinal_position;
