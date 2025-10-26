-- ManaXC Database Schema - Part 2: Results with Migration System
-- Run this AFTER Part 1 (01-core-tables.sql)

-- Results Table (WITH MIGRATION TRACKING)
CREATE TABLE results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Links
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  meet_id UUID NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
  race_id UUID REFERENCES races(id) ON DELETE CASCADE,

  -- Performance data (CENTISECONDS - ADR-001)
  time_cs INTEGER NOT NULL CHECK (time_cs > 0),
  standardized_mile_cs INTEGER,

  -- Placements
  place_overall INTEGER CHECK (place_overall > 0),
  place_gender INTEGER CHECK (place_gender > 0),
  place_team INTEGER CHECK (place_team > 0),

  -- Flags
  scored BOOLEAN DEFAULT TRUE,
  is_pr BOOLEAN DEFAULT FALSE,

  -- MIGRATION SYSTEM (ADR-002)
  data_source TEXT NOT NULL DEFAULT 'excel_import' CHECK (
    data_source IN ('excel_import', 'athletic_net', 'manual_import', 'scraper')
  ),
  is_legacy_data BOOLEAN DEFAULT FALSE,
  is_complete_results BOOLEAN DEFAULT FALSE,

  -- Validation tracking
  validation_status TEXT CHECK (
    validation_status IN ('pending', 'confirmed', 'discrepancy', 'replaced', 'needs_review')
  ),
  replaced_by UUID REFERENCES results(id),
  validated_at TIMESTAMPTZ,
  validated_by UUID,

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

-- Result Validations Table
CREATE TABLE result_validations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legacy_result_id UUID NOT NULL REFERENCES results(id) ON DELETE CASCADE,
  new_result_id UUID REFERENCES results(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id),
  meet_id UUID NOT NULL REFERENCES meets(id),
  time_diff_cs INTEGER,
  place_diff INTEGER,
  has_discrepancy BOOLEAN DEFAULT FALSE,
  discrepancy_notes TEXT[],
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'confirmed_match', 'confirmed_change', 'needs_review', 'resolved')
  ),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_validations_pending ON result_validations(status) WHERE status = 'pending';
CREATE INDEX idx_validations_needs_review ON result_validations(status) WHERE status = 'needs_review';
CREATE INDEX idx_validations_athlete ON result_validations(athlete_id);
CREATE INDEX idx_validations_meet ON result_validations(meet_id);

-- Migration Progress Table
CREATE TABLE migration_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meet_id UUID NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
  season_year INTEGER NOT NULL,
  has_legacy_data BOOLEAN DEFAULT FALSE,
  has_complete_data BOOLEAN DEFAULT FALSE,
  validation_status TEXT DEFAULT 'not_started' CHECK (
    validation_status IN ('not_started', 'in_progress', 'needs_review', 'completed')
  ),
  legacy_results_count INTEGER DEFAULT 0,
  complete_results_count INTEGER DEFAULT 0,
  validated_count INTEGER DEFAULT 0,
  discrepancy_count INTEGER DEFAULT 0,
  completion_percentage DECIMAL(5,2),
  last_validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(meet_id)
);

CREATE INDEX idx_migration_status ON migration_progress(validation_status);
CREATE INDEX idx_migration_season ON migration_progress(season_year);
CREATE INDEX idx_migration_completion ON migration_progress(completion_percentage);

-- Success message
SELECT 'Results and migration tables created successfully!' as status;
