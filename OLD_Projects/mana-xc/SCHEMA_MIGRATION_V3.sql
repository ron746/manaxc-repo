-- Mana XC Schema Migration V3
-- Complete database refactor based on 2024 import analysis
-- Date: October 19, 2025
-- Purpose: Implement all improvements identified in DATA_MODEL_OBSERVATIONS.md

-- ============================================================================
-- STEP 1: Clean slate - Delete all existing data
-- ============================================================================

DELETE FROM results;
DELETE FROM races;
DELETE FROM meets;
DELETE FROM athletes;
DELETE FROM schools;
DELETE FROM course_rating_defaults;
DELETE FROM courses;  -- Will be renamed to venues

-- ============================================================================
-- STEP 2: Remove unused/incorrect fields
-- ============================================================================

-- MEETS: Remove duplicate and unused fields
ALTER TABLE meets DROP COLUMN IF EXISTS ath_net_id;  -- Duplicate of athletic_net_id
ALTER TABLE meets DROP COLUMN IF EXISTS host_school_id;  -- Rarely known, not additive

-- RACES: Remove unused category field, will move xc_time_rating to courses
ALTER TABLE races DROP COLUMN IF EXISTS category;
ALTER TABLE races DROP COLUMN IF EXISTS ath_net_id;  -- Will use athletic_net_id only

-- ============================================================================
-- STEP 3: Rename COURSES → VENUES (semantic correctness)
-- ============================================================================

ALTER TABLE courses RENAME TO venues;
ALTER TABLE venues DROP COLUMN IF EXISTS distance_meters;  -- Belongs in courses table

-- Update foreign key references
ALTER TABLE course_rating_defaults RENAME COLUMN course_id TO venue_id;

-- ============================================================================
-- STEP 4: Create new COURSES table (venue + distance + layout)
-- ============================================================================

CREATE TABLE IF NOT EXISTS courses (
  id SERIAL PRIMARY KEY,
  venue_id INTEGER REFERENCES venues(id) ON DELETE CASCADE,
  distance_meters INTEGER NOT NULL,

  -- Course versioning for layout changes over time
  layout_version TEXT DEFAULT 'standard',
  layout_description TEXT,
  active_from DATE,
  active_to DATE,

  -- Course characteristics
  elevation_gain_meters INTEGER,
  surface_type TEXT,  -- 'grass', 'dirt', 'mixed', 'paved'
  xc_time_rating NUMERIC(5,3) DEFAULT 1.000,  -- Moved from races table

  -- Course records (per layout version)
  boys_course_record_cs INTEGER,
  boys_record_holder_id INTEGER REFERENCES athletes(id),
  boys_record_date DATE,
  girls_course_record_cs INTEGER,
  girls_record_holder_id INTEGER REFERENCES athletes(id),
  girls_record_date DATE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Composite unique constraint
  UNIQUE(venue_id, distance_meters, layout_version)
);

CREATE INDEX idx_courses_venue ON courses(venue_id);
CREATE INDEX idx_courses_distance ON courses(distance_meters);
CREATE INDEX idx_courses_rating ON courses(xc_time_rating);

-- Remove xc_time_rating from races (now in courses)
ALTER TABLE races DROP COLUMN IF EXISTS xc_time_rating;

-- ============================================================================
-- STEP 5: Enhance ATHLETES table
-- ============================================================================

-- Critical missing data
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS graduation_year INTEGER;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS name_verified BOOLEAN DEFAULT false;

-- Performance optimization - denormalized PRs
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS xc_time_pr_cs INTEGER;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS xc_time_pr_race_id INTEGER REFERENCES races(id);
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS xc_time_pr_updated_at TIMESTAMP;

-- Athletic.net linking (future feature)
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS ath_net_id TEXT;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS ath_net_verified BOOLEAN DEFAULT false;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS ath_net_last_synced TIMESTAMP;

-- Timestamps
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

CREATE INDEX idx_athletes_graduation_year ON athletes(graduation_year);
CREATE INDEX idx_athletes_pr ON athletes(xc_time_pr_cs) WHERE xc_time_pr_cs IS NOT NULL;
CREATE INDEX idx_athletes_full_name ON athletes(full_name);

-- ============================================================================
-- STEP 6: Create ATHLETE_SEASONAL_PRS table
-- ============================================================================

CREATE TABLE IF NOT EXISTS athlete_seasonal_prs (
  id SERIAL PRIMARY KEY,
  athlete_id INTEGER REFERENCES athletes(id) ON DELETE CASCADE,
  season_year INTEGER NOT NULL,
  xc_time_pr_cs INTEGER,
  xc_time_pr_race_id INTEGER REFERENCES races(id),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(athlete_id, season_year)
);

CREATE INDEX idx_seasonal_prs_ranking ON athlete_seasonal_prs(season_year, xc_time_pr_cs);
CREATE INDEX idx_seasonal_prs_athlete ON athlete_seasonal_prs(athlete_id);

-- ============================================================================
-- STEP 7: Create PR_RECALC_QUEUE table
-- ============================================================================

CREATE TABLE IF NOT EXISTS pr_recalc_queue (
  athlete_id INTEGER PRIMARY KEY REFERENCES athletes(id) ON DELETE CASCADE,
  queued_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- STEP 8: Enhance RESULTS table with audit trail
-- ============================================================================

-- Verification status
ALTER TABLE results ADD COLUMN IF NOT EXISTS official BOOLEAN DEFAULT true;
ALTER TABLE results ADD COLUMN IF NOT EXISTS verified_by_coach BOOLEAN DEFAULT false;
ALTER TABLE results ADD COLUMN IF NOT EXISTS verified_by_timer BOOLEAN DEFAULT false;
ALTER TABLE results ADD COLUMN IF NOT EXISTS disputed BOOLEAN DEFAULT false;

-- Original values (preserved when corrections are made)
ALTER TABLE results ADD COLUMN IF NOT EXISTS orig_athlete_id INTEGER REFERENCES athletes(id);
ALTER TABLE results ADD COLUMN IF NOT EXISTS orig_time_cs INTEGER;
ALTER TABLE results ADD COLUMN IF NOT EXISTS orig_place_overall INTEGER;

-- Audit trail
ALTER TABLE results ADD COLUMN IF NOT EXISTS modified_by_user_id UUID;
ALTER TABLE results ADD COLUMN IF NOT EXISTS modification_date TIMESTAMP;
ALTER TABLE results ADD COLUMN IF NOT EXISTS modification_reason TEXT;
ALTER TABLE results ADD COLUMN IF NOT EXISTS verified_by_user_id UUID;
ALTER TABLE results ADD COLUMN IF NOT EXISTS verification_date TIMESTAMP;

-- Timestamps
ALTER TABLE results ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE results ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

CREATE INDEX idx_results_official ON results(official) WHERE official = true;
CREATE INDEX idx_results_disputed ON results(disputed) WHERE disputed = true;

-- ============================================================================
-- STEP 9: Create RESULT_DISPUTES table
-- ============================================================================

CREATE TABLE IF NOT EXISTS result_disputes (
  id SERIAL PRIMARY KEY,
  result_id INTEGER REFERENCES results(id) ON DELETE CASCADE,
  dispute_type TEXT,  -- 'wrong_athlete', 'missing_result', 'wrong_time', 'should_not_count'

  -- Disputing party
  submitted_by_user_id UUID,
  submitted_by_athlete_id INTEGER REFERENCES athletes(id),

  -- Dispute details
  current_value TEXT,
  requested_value TEXT,
  reason TEXT,
  supporting_evidence TEXT,

  -- Resolution
  status TEXT DEFAULT 'pending',  -- 'pending', 'approved', 'rejected', 'needs_info'
  resolved_by_user_id UUID,
  resolution_notes TEXT,
  resolved_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_disputes_status ON result_disputes(status);
CREATE INDEX idx_disputes_result ON result_disputes(result_id);

-- ============================================================================
-- STEP 10: Create RESULT_CORRECTIONS table
-- ============================================================================

CREATE TABLE IF NOT EXISTS result_corrections (
  id SERIAL PRIMARY KEY,
  result_id INTEGER REFERENCES results(id) ON DELETE CASCADE,
  correction_type TEXT,

  -- What changed
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,

  -- Who and why
  corrected_by_user_id UUID,
  correction_reason TEXT,

  -- Authority level
  approved_by_coach BOOLEAN DEFAULT false,
  approved_by_timer BOOLEAN DEFAULT false,
  approved_by_admin BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_corrections_result ON result_corrections(result_id);

-- ============================================================================
-- STEP 11: Enhance SCHOOLS table
-- ============================================================================

-- Ensure ath_net_id exists
ALTER TABLE schools ADD COLUMN IF NOT EXISTS ath_net_id TEXT;

-- Coach management
ALTER TABLE schools ADD COLUMN IF NOT EXISTS managed_by_user_id UUID;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false;

-- Auto-sync configuration
ALTER TABLE schools ADD COLUMN IF NOT EXISTS auto_sync_enabled BOOLEAN DEFAULT false;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS next_scheduled_sync TIMESTAMP;

-- Metadata (coach-entered or scraped)
ALTER TABLE schools ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'CA';
ALTER TABLE schools ADD COLUMN IF NOT EXISTS league_name TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS mascot TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS colors TEXT;

-- Contact info
ALTER TABLE schools ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS xc_coach_name TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS xc_coach_email TEXT;

-- Timestamps
ALTER TABLE schools ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE schools ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

CREATE INDEX idx_schools_ath_net_id ON schools(ath_net_id) WHERE ath_net_id IS NOT NULL;

-- ============================================================================
-- STEP 12: Create TRACKED_SCHOOLS table
-- ============================================================================

CREATE TABLE IF NOT EXISTS tracked_schools (
  id SERIAL PRIMARY KEY,
  school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  ath_net_school_id TEXT,

  -- Scraping schedule
  auto_sync_enabled BOOLEAN DEFAULT true,
  sync_frequency TEXT DEFAULT 'weekly',  -- 'daily', 'weekly', 'monthly', 'manual'
  last_scraped_at TIMESTAMP,
  next_scheduled_scrape TIMESTAMP,

  -- Season awareness
  active_season_start DATE DEFAULT '08-01',
  active_season_end DATE DEFAULT '11-30',

  -- Status
  last_sync_status TEXT,  -- 'success', 'no_new_data', 'error'
  last_sync_details JSONB,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(school_id)
);

-- ============================================================================
-- STEP 13: Create NAME_REVIEW_QUEUE table
-- ============================================================================

CREATE TABLE IF NOT EXISTS name_review_queue (
  id SERIAL PRIMARY KEY,
  athlete_id INTEGER REFERENCES athletes(id) ON DELETE CASCADE,
  full_name TEXT,
  parsed_first_name TEXT,
  parsed_last_name TEXT,
  needs_review BOOLEAN DEFAULT true,
  reviewed_by_user_id UUID,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_name_review_needs_review ON name_review_queue(needs_review) WHERE needs_review = true;

-- ============================================================================
-- STEP 14: Refresh materialized view (if exists)
-- ============================================================================

DROP MATERIALIZED VIEW IF EXISTS athlete_xc_times_v3;

CREATE MATERIALIZED VIEW athlete_xc_times_v3 AS
SELECT
  r.athlete_id,
  MIN(r.time_cs * c.xc_time_rating) as best_xc_time_cs
FROM results r
JOIN races ra ON ra.id = r.race_id
JOIN courses c ON c.id = ra.course_id
WHERE r.time_cs > 0
  AND r.official = true
  AND r.disputed = false
GROUP BY r.athlete_id;

CREATE UNIQUE INDEX idx_athlete_xc_times_v3_athlete ON athlete_xc_times_v3(athlete_id);
CREATE INDEX idx_athlete_xc_times_v3_time ON athlete_xc_times_v3(best_xc_time_cs);

-- ============================================================================
-- STEP 15: Verify schema
-- ============================================================================

-- Show table counts (should all be 0 after cleanup)
SELECT 'Meets' as table_name, COUNT(*) as count FROM meets
UNION ALL
SELECT 'Venues', COUNT(*) FROM venues
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
SELECT 'Seasonal PRs', COUNT(*) FROM athlete_seasonal_prs;

-- ============================================================================
-- Migration complete! Ready for import with new schema.
-- ============================================================================
