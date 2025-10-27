-- Clean All Tables and Update Athletes Schema
-- Run this ONCE before importing with the new batch-import-v2 system

-- ============================================================================
-- STEP 1: Clean ALL data
-- ============================================================================
DELETE FROM results;
DELETE FROM races;
DELETE FROM meets;
DELETE FROM athletes;
DELETE FROM schools;
DELETE FROM courses;
DELETE FROM venues;

-- ============================================================================
-- STEP 2: Update athletes table - remove first_name and last_name
-- ============================================================================

-- Drop columns we no longer need
ALTER TABLE athletes DROP COLUMN IF EXISTS first_name;
ALTER TABLE athletes DROP COLUMN IF EXISTS last_name;
ALTER TABLE athletes DROP COLUMN IF EXISTS ath_net_id;

-- Ensure full_name column exists and is NOT NULL
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE athletes ALTER COLUMN full_name SET NOT NULL;

-- Ensure graduation_year exists
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS graduation_year INTEGER;

-- Update unique constraint to use full_name + school + graduation_year
ALTER TABLE athletes DROP CONSTRAINT IF EXISTS athletes_first_name_last_name_current_school_id_key;
ALTER TABLE athletes DROP CONSTRAINT IF EXISTS athletes_full_name_school_grad_key;

-- Create new unique constraint
ALTER TABLE athletes ADD CONSTRAINT athletes_full_name_school_grad_key
    UNIQUE (full_name, current_school_id, graduation_year);

-- Add index on full_name for faster searches
CREATE INDEX IF NOT EXISTS idx_athletes_full_name ON athletes(full_name);

-- ============================================================================
-- STEP 3: Show updated schema
-- ============================================================================

SELECT
    'Athletes Table Schema' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'athletes'
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 4: Verify all tables are empty
-- ============================================================================

SELECT 'Venues' as table_name, COUNT(*) as count FROM venues
UNION ALL
SELECT 'Courses', COUNT(*) FROM courses
UNION ALL
SELECT 'Schools', COUNT(*) FROM schools
UNION ALL
SELECT 'Meets', COUNT(*) FROM meets
UNION ALL
SELECT 'Races', COUNT(*) FROM races
UNION ALL
SELECT 'Athletes', COUNT(*) FROM athletes
UNION ALL
SELECT 'Results', COUNT(*) FROM results;

-- ============================================================================
-- All done! Database is clean and ready for batch-import-v2
-- ============================================================================
