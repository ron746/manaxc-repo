-- Create table to track potential duplicate/conflicting results for admin review
-- This ONLY tracks cases where the SAME ATHLETE has multiple different times in the SAME RACE
-- (Two different athletes with the same time is a tie, not a duplicate)

CREATE TABLE IF NOT EXISTS potential_duplicates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- The conflicting results (must be same athlete)
    result_id_1 UUID REFERENCES results(id) ON DELETE CASCADE,
    result_id_2 UUID REFERENCES results(id) ON DELETE CASCADE,

    -- Context (both results must share these)
    athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE NOT NULL,
    meet_id UUID REFERENCES meets(id) ON DELETE CASCADE NOT NULL,
    race_id UUID REFERENCES races(id) ON DELETE CASCADE NOT NULL,

    -- Details about the conflict (times must be different)
    conflict_type VARCHAR(50) DEFAULT 'different_times_same_athlete_race',
    time_1_cs INTEGER NOT NULL,
    time_2_cs INTEGER NOT NULL,
    time_difference_cs INTEGER NOT NULL,

    -- Admin resolution
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'resolved', 'ignored'
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by VARCHAR(255),

    -- Metadata
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure we don't record the same duplicate pair twice
    UNIQUE(result_id_1, result_id_2),

    -- Ensure we only flag duplicates when times are actually different
    CHECK (time_1_cs != time_2_cs)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_potential_duplicates_status ON potential_duplicates(status);
CREATE INDEX IF NOT EXISTS idx_potential_duplicates_athlete ON potential_duplicates(athlete_id);
CREATE INDEX IF NOT EXISTS idx_potential_duplicates_meet ON potential_duplicates(meet_id);

-- Add comments
COMMENT ON TABLE potential_duplicates IS 'Tracks cases where the SAME ATHLETE has multiple DIFFERENT times in the same race. Does NOT track ties (different athletes with same time - that is normal and expected).';

COMMENT ON COLUMN potential_duplicates.athlete_id IS 'Both results must belong to this same athlete. Different athletes with the same time is a tie, not a duplicate.';

COMMENT ON COLUMN potential_duplicates.time_1_cs IS 'First recorded time for this athlete';
COMMENT ON COLUMN potential_duplicates.time_2_cs IS 'Second recorded time for this athlete (must be different from time_1)';
COMMENT ON COLUMN potential_duplicates.time_difference_cs IS 'Absolute difference between the two times';
