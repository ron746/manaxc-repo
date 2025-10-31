-- Create table to track potential duplicate/ambiguous athlete matches
-- This tracks cases where athlete name matching is ambiguous (e.g., "Miguel Rodriguez" vs "Miguel A. Rodriguez")

CREATE TABLE IF NOT EXISTS potential_duplicate_athletes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- The athletes in question
    athlete_id_1 UUID REFERENCES athletes(id) ON DELETE CASCADE,
    athlete_id_2 UUID, -- May be NULL if athlete doesn't exist yet

    -- Context
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    meet_id UUID REFERENCES meets(id) ON DELETE CASCADE, -- Optional: which meet surfaced this

    -- Details about the conflict
    name_1 VARCHAR(255) NOT NULL, -- e.g., "Miguel A. Rodriguez"
    name_2 VARCHAR(255) NOT NULL, -- e.g., "Miguel Rodriguez"
    conflict_type VARCHAR(50) DEFAULT 'name_variation', -- 'name_variation', 'middle_initial_difference', etc.

    -- Additional context
    grad_year_1 INTEGER,
    grad_year_2 INTEGER,
    gender_1 VARCHAR(1),
    gender_2 VARCHAR(1),

    -- CSV data that couldn't be imported
    csv_data JSONB, -- Store the full CSV row that couldn't be matched

    -- Admin resolution
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'same_person', 'different_people', 'ignored'
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by VARCHAR(255),

    -- Metadata
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure we don't record the same pair twice
    UNIQUE(athlete_id_1, name_2, school_id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_potential_duplicate_athletes_status ON potential_duplicate_athletes(status);
CREATE INDEX IF NOT EXISTS idx_potential_duplicate_athletes_school ON potential_duplicate_athletes(school_id);
CREATE INDEX IF NOT EXISTS idx_potential_duplicate_athletes_meet ON potential_duplicate_athletes(meet_id);

-- Add comments
COMMENT ON TABLE potential_duplicate_athletes IS 'Tracks cases where athlete name matching is ambiguous during import. Examples: "Miguel Rodriguez" vs "Miguel A. Rodriguez", same name with different grad years, etc.';

COMMENT ON COLUMN potential_duplicate_athletes.athlete_id_1 IS 'Existing athlete in database that may be a match';
COMMENT ON COLUMN potential_duplicate_athletes.athlete_id_2 IS 'Second athlete ID if both exist, NULL if CSV athlete not yet imported';
COMMENT ON COLUMN potential_duplicate_athletes.name_1 IS 'Name of existing athlete (from database)';
COMMENT ON COLUMN potential_duplicate_athletes.name_2 IS 'Name from CSV/import that did not match';
COMMENT ON COLUMN potential_duplicate_athletes.csv_data IS 'Full CSV row data that could not be imported, for admin review';
