-- ManaXC Database Schema v1.0
-- Created: October 22, 2025
-- Based on: ADR-001 (Centiseconds), ADR-002 (Migration Strategy)
-- Database: PostgreSQL 15+ (Supabase)

-- ============================================================================
-- SETUP: Extensions and Functions
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Schools Table
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  short_name TEXT,
  city TEXT,
  state TEXT DEFAULT 'CA',
  league TEXT, -- WCAL, PAL, etc.
  mascot TEXT,
  colors TEXT[], -- Array: ['blue', 'gold']
  website_url TEXT,
  athletic_net_id TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_schools_league ON schools(league);
CREATE INDEX idx_schools_state_city ON schools(state, city);

COMMENT ON TABLE schools IS 'High schools with XC programs';
COMMENT ON COLUMN schools.athletic_net_id IS 'Athletic.net school ID for scraping';

-- ============================================================================

-- Athletes Table
CREATE TABLE athletes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

  -- Name fields
  name TEXT NOT NULL, -- Full name
  first_name TEXT,
  last_name TEXT,

  -- Demographics
  grad_year INTEGER NOT NULL CHECK (grad_year >= 1966 AND grad_year <= 2035),
  gender TEXT NOT NULL CHECK (gender IN ('M', 'F')),

  -- Optional
  photo_url TEXT,
  bio TEXT,
  slug TEXT UNIQUE, -- URL-friendly: "sarah-johnson-2026"
  athletic_net_id TEXT,

  -- Status
  is_active BOOLEAN DEFAULT TRUE, -- FALSE for graduated

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_athletes_school ON athletes(school_id);
CREATE INDEX idx_athletes_grad_year ON athletes(grad_year);
CREATE INDEX idx_athletes_active ON athletes(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_athletes_slug ON athletes(slug);
CREATE INDEX idx_athletes_name ON athletes(name);

COMMENT ON TABLE athletes IS 'High school XC athletes';
COMMENT ON COLUMN athletes.slug IS 'SEO-friendly URL slug, auto-generated';

-- Auto-generate slug
CREATE OR REPLACE FUNCTION generate_athlete_slug()
RETURNS TRIGGER AS $$
BEGIN
  NEW.slug := lower(regexp_replace(
    NEW.first_name || '-' || NEW.last_name || '-' || NEW.grad_year,
    '[^a-z0-9]+', '-', 'gi'
  ));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER athlete_slug_trigger
BEFORE INSERT OR UPDATE ON athletes
FOR EACH ROW
EXECUTE FUNCTION generate_athlete_slug();

-- ============================================================================

-- Courses Table
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, -- "Crystal Springs 5K"
  location TEXT, -- "Belmont, CA"
  venue TEXT, -- "Crystal Springs Golf Course"

  -- Distance
  distance_meters INTEGER NOT NULL, -- 5000, 4828 (3 mile), etc.
  distance_display TEXT, -- "5K", "3 mile"

  -- Difficulty
  difficulty_rating DECIMAL(4,2) CHECK (difficulty_rating >= 1 AND difficulty_rating <= 10),
  elevation_gain_meters INTEGER,
  surface_type TEXT CHECK (surface_type IN ('grass', 'dirt', 'mixed', 'trail', 'paved')),
  terrain_description TEXT,

  -- Optional
  course_map_url TEXT,
  athletic_net_id TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(name, location)
);

CREATE INDEX idx_courses_difficulty ON courses(difficulty_rating);
CREATE INDEX idx_courses_distance ON courses(distance_meters);
CREATE INDEX idx_courses_name ON courses(name);

COMMENT ON TABLE courses IS 'XC race courses with difficulty ratings';
COMMENT ON COLUMN courses.difficulty_rating IS '1-10 scale, used for time standardization';

-- ============================================================================

-- Meets Table
CREATE TABLE meets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  meet_date DATE NOT NULL,
  season_year INTEGER NOT NULL, -- 2024, 2025, etc.

  course_id UUID REFERENCES courses(id),
  host_school_id UUID REFERENCES schools(id),

  -- Meet metadata
  meet_type TEXT CHECK (meet_type IN ('invitational', 'dual', 'league', 'championship', 'scrimmage')),
  weather_conditions TEXT,
  temperature_f INTEGER,

  -- Links
  results_url TEXT,
  athletic_net_url TEXT,
  athletic_net_id TEXT, -- For duplicate detection

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meets_date ON meets(meet_date DESC);
CREATE INDEX idx_meets_course ON meets(course_id);
CREATE INDEX idx_meets_season ON meets(season_year DESC);
CREATE INDEX idx_meets_athletic_net_id ON meets(athletic_net_id) WHERE athletic_net_id IS NOT NULL;

COMMENT ON TABLE meets IS 'XC meets/competitions';
COMMENT ON COLUMN meets.athletic_net_id IS 'Used for duplicate detection when scraping';

-- ============================================================================

-- Races Table (NEW - individual races within a meet)
CREATE TABLE races (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meet_id UUID NOT NULL REFERENCES meets(id) ON DELETE CASCADE,

  name TEXT NOT NULL, -- "Varsity Boys", "JV Girls", etc.
  gender TEXT NOT NULL CHECK (gender IN ('M', 'F')),
  division TEXT, -- "Varsity", "JV", "Frosh/Soph"

  distance_meters INTEGER NOT NULL,

  -- Optional
  athletic_net_id TEXT,
  start_time TIME,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(meet_id, name, gender)
);

CREATE INDEX idx_races_meet ON races(meet_id);
CREATE INDEX idx_races_gender ON races(gender);

COMMENT ON TABLE races IS 'Individual races within a meet (Varsity Boys, JV Girls, etc.)';

-- ============================================================================

-- Results Table (WITH MIGRATION TRACKING - ADR-002)
CREATE TABLE results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Links
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  meet_id UUID NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
  race_id UUID REFERENCES races(id) ON DELETE CASCADE,

  -- Performance data (ADR-001: CENTISECONDS)
  time_cs INTEGER NOT NULL CHECK (time_cs > 0),
  standardized_mile_cs INTEGER, -- Calculated by course difficulty algorithm

  -- Placements
  place_overall INTEGER CHECK (place_overall > 0),
  place_gender INTEGER CHECK (place_gender > 0),
  place_team INTEGER CHECK (place_team > 0),

  -- Flags
  scored BOOLEAN DEFAULT TRUE, -- Counted for team score?
  is_pr BOOLEAN DEFAULT FALSE,

  -- MIGRATION SYSTEM (ADR-002)
  data_source TEXT NOT NULL DEFAULT 'excel_import' CHECK (
    data_source IN ('excel_import', 'athletic_net', 'manual_import', 'scraper')
  ),
  is_legacy_data BOOLEAN DEFAULT FALSE, -- Old Excel data (Westmont only)
  is_complete_results BOOLEAN DEFAULT FALSE, -- Full race results (all schools)

  -- Validation tracking
  validation_status TEXT CHECK (
    validation_status IN ('pending', 'confirmed', 'discrepancy', 'replaced', 'needs_review')
  ),
  replaced_by UUID REFERENCES results(id), -- Link to newer result
  validated_at TIMESTAMPTZ,
  validated_by UUID, -- Will reference auth.users(id) later

  -- Audit
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent exact duplicates
  UNIQUE(athlete_id, meet_id, race_id, data_source)
);

CREATE INDEX idx_results_athlete ON results(athlete_id);
CREATE INDEX idx_results_meet ON results(meet_id);
CREATE INDEX idx_results_race ON results(race_id);
CREATE INDEX idx_results_time ON results(time_cs);
CREATE INDEX idx_results_standardized ON results(standardized_mile_cs) WHERE standardized_mile_cs IS NOT NULL;
CREATE INDEX idx_results_validation ON results(validation_status) WHERE validation_status IS NOT NULL;
CREATE INDEX idx_results_legacy ON results(is_legacy_data) WHERE is_legacy_data = TRUE;
CREATE INDEX idx_results_source ON results(data_source);

COMMENT ON TABLE results IS 'Individual athlete race results with migration tracking';
COMMENT ON COLUMN results.time_cs IS 'Time in CENTISECONDS (19:30.45 = 117045) - ADR-001';
COMMENT ON COLUMN results.is_legacy_data IS 'TRUE for old Excel data (Westmont only) - ADR-002';
COMMENT ON COLUMN results.is_complete_results IS 'TRUE for full race results (all schools) - ADR-002';

-- ============================================================================

-- Result Validations Table (ADR-002)
CREATE TABLE result_validations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Links
  legacy_result_id UUID NOT NULL REFERENCES results(id) ON DELETE CASCADE,
  new_result_id UUID REFERENCES results(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id),
  meet_id UUID NOT NULL REFERENCES meets(id),

  -- Discrepancies
  time_diff_cs INTEGER, -- Difference in centiseconds
  place_diff INTEGER,
  has_discrepancy BOOLEAN DEFAULT FALSE,
  discrepancy_notes TEXT[],

  -- Resolution
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'confirmed_match', 'confirmed_change', 'needs_review', 'resolved')
  ),
  reviewed_by UUID, -- Will reference auth.users(id)
  reviewed_at TIMESTAMPTZ,
  resolution_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_validations_pending ON result_validations(status) WHERE status = 'pending';
CREATE INDEX idx_validations_needs_review ON result_validations(status) WHERE status = 'needs_review';
CREATE INDEX idx_validations_athlete ON result_validations(athlete_id);
CREATE INDEX idx_validations_meet ON result_validations(meet_id);

COMMENT ON TABLE result_validations IS 'Tracks validation of legacy vs complete results - ADR-002';

-- ============================================================================

-- Migration Progress Table (ADR-002)
CREATE TABLE migration_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  meet_id UUID NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
  season_year INTEGER NOT NULL,

  -- Status
  has_legacy_data BOOLEAN DEFAULT FALSE,
  has_complete_data BOOLEAN DEFAULT FALSE,
  validation_status TEXT DEFAULT 'not_started' CHECK (
    validation_status IN ('not_started', 'in_progress', 'needs_review', 'completed')
  ),

  -- Counts
  legacy_results_count INTEGER DEFAULT 0,
  complete_results_count INTEGER DEFAULT 0,
  validated_count INTEGER DEFAULT 0,
  discrepancy_count INTEGER DEFAULT 0,

  -- Progress
  completion_percentage DECIMAL(5,2),
  last_validated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(meet_id)
);

CREATE INDEX idx_migration_status ON migration_progress(validation_status);
CREATE INDEX idx_migration_season ON migration_progress(season_year);
CREATE INDEX idx_migration_completion ON migration_progress(completion_percentage);

COMMENT ON TABLE migration_progress IS 'Tracks migration from legacy to complete results - ADR-002';

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Format centiseconds to display time (117045 → "19:30.45")
CREATE OR REPLACE FUNCTION format_time_cs(cs INTEGER)
RETURNS TEXT AS $$
DECLARE
  total_seconds INTEGER;
  minutes INTEGER;
  seconds INTEGER;
  centis INTEGER;
BEGIN
  IF cs IS NULL OR cs <= 0 THEN
    RETURN NULL;
  END IF;

  total_seconds := cs / 100;
  minutes := total_seconds / 60;
  seconds := total_seconds % 60;
  centis := cs % 100;

  RETURN LPAD(minutes::TEXT, 2, '0') || ':' ||
         LPAD(seconds::TEXT, 2, '0') || '.' ||
         LPAD(centis::TEXT, 2, '0');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION format_time_cs IS 'Convert centiseconds to MM:SS.CC format';

-- Parse time string to centiseconds ("19:30.45" → 117045)
CREATE OR REPLACE FUNCTION parse_time_to_cs(time_str TEXT)
RETURNS INTEGER AS $$
DECLARE
  parts TEXT[];
  time_parts TEXT[];
  minutes INTEGER;
  seconds INTEGER;
  centiseconds INTEGER;
BEGIN
  IF time_str IS NULL OR time_str = '' THEN
    RETURN NULL;
  END IF;

  -- Split on colon
  parts := STRING_TO_ARRAY(time_str, ':');
  IF array_length(parts, 1) < 2 THEN
    RETURN NULL;
  END IF;

  minutes := parts[1]::INTEGER;

  -- Split seconds on dot
  time_parts := STRING_TO_ARRAY(parts[2], '.');
  seconds := time_parts[1]::INTEGER;
  centiseconds := COALESCE(time_parts[2]::INTEGER, 0);

  -- Calculate total centiseconds
  RETURN (minutes * 60 * 100) + (seconds * 100) + centiseconds;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION parse_time_to_cs IS 'Convert MM:SS.CC format to centiseconds';

-- ============================================================================
-- SAMPLE DATA
-- ============================================================================

-- Insert Westmont High School
INSERT INTO schools (name, short_name, city, state, league, athletic_net_id)
VALUES (
  'Westmont High School',
  'Westmont',
  'Campbell',
  'CA',
  'WCAL',
  '1076'
) ON CONFLICT (name) DO NOTHING;

-- Insert sample courses
INSERT INTO courses (name, location, venue, distance_meters, distance_display, difficulty_rating, elevation_gain_meters, surface_type, terrain_description)
VALUES
  ('Crystal Springs 5K', 'Belmont, CA', 'Crystal Springs Golf Course', 5000, '5K', 8.0, 150, 'grass', 'Very hilly with significant elevation changes'),
  ('Baylands 5K', 'Sunnyvale, CA', 'Baylands Park', 5000, '5K', 3.0, 20, 'mixed', 'Flat and fast on paved paths and grass'),
  ('Toro Park 3 Mile', 'Salinas, CA', 'Toro Regional Park', 4828, '3 mile', 7.5, 120, 'dirt', 'Rolling hills on dirt trails')
ON CONFLICT (name, location) DO NOTHING;

-- ============================================================================
-- ROW LEVEL SECURITY (Basic setup for now)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE meets ENABLE ROW LEVEL SECURITY;
ALTER TABLE races ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE result_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_progress ENABLE ROW LEVEL SECURITY;

-- Public read access (everyone can view)
CREATE POLICY "Public read access" ON schools FOR SELECT USING (TRUE);
CREATE POLICY "Public read access" ON athletes FOR SELECT USING (TRUE);
CREATE POLICY "Public read access" ON courses FOR SELECT USING (TRUE);
CREATE POLICY "Public read access" ON meets FOR SELECT USING (TRUE);
CREATE POLICY "Public read access" ON races FOR SELECT USING (TRUE);
CREATE POLICY "Public read access" ON results FOR SELECT USING (TRUE);

-- Admin-only access for validation tables (for now, allow all inserts - will tighten later)
CREATE POLICY "Allow inserts" ON result_validations FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Allow selects" ON result_validations FOR SELECT USING (TRUE);
CREATE POLICY "Allow inserts" ON migration_progress FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Allow selects" ON migration_progress FOR SELECT USING (TRUE);
CREATE POLICY "Allow updates" ON migration_progress FOR UPDATE USING (TRUE);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test time functions
DO $$
BEGIN
  ASSERT format_time_cs(117045) = '19:30.45', 'format_time_cs failed';
  ASSERT parse_time_to_cs('19:30.45') = 117045, 'parse_time_to_cs failed';
  RAISE NOTICE '✅ Time functions working correctly';
END $$;

-- Show created tables
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================================
-- SCHEMA VERSION
-- ============================================================================

COMMENT ON SCHEMA public IS 'ManaXC Schema v1.0 - October 22, 2025';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
