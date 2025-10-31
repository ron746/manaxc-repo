-- Add Ariel Hung's second time (from CSV) and flag as potential duplicate
-- This temporarily drops the unique constraint, adds both records, then recreates it

-- Step 0: Disable custom triggers to avoid course_records conflicts
-- (We can't disable system triggers, only user-defined ones)
ALTER TABLE results DISABLE TRIGGER USER;

-- Step 1: Drop the unique constraint temporarily
ALTER TABLE results DROP CONSTRAINT IF EXISTS results_athlete_id_meet_id_race_id_data_source_key;

-- Step 2: Insert the corrected time (if not already exists)
INSERT INTO results (
    meet_id,
    race_id,
    athlete_id,
    time_cs,
    data_source
)
SELECT
    '06637eee-c2b7-4b0f-95da-a7743209562d'::UUID, -- meet 270614
    '6671f6f8-6fd2-4fc7-98bc-6efe6da0ded3'::UUID, -- race 1077801
    '0c60c483-c64a-407c-962d-431819bd7339'::UUID, -- Ariel Hung
    207460, -- 34:34.60 from CSV
    'athletic_net'
WHERE NOT EXISTS (
    SELECT 1 FROM results
    WHERE athlete_id = '0c60c483-c64a-407c-962d-431819bd7339'::UUID
    AND meet_id = '06637eee-c2b7-4b0f-95da-a7743209562d'::UUID
    AND race_id = '6671f6f8-6fd2-4fc7-98bc-6efe6da0ded3'::UUID
    AND time_cs = 207460
);

-- Step 3: Create the potential duplicate record
INSERT INTO potential_duplicates (
    result_id_1,
    result_id_2,
    athlete_id,
    meet_id,
    race_id,
    conflict_type,
    time_1_cs,
    time_2_cs,
    time_difference_cs,
    status
)
SELECT
    r1.id,
    r2.id,
    '0c60c483-c64a-407c-962d-431819bd7339'::UUID,
    '06637eee-c2b7-4b0f-95da-a7743209562d'::UUID,
    '6671f6f8-6fd2-4fc7-98bc-6efe6da0ded3'::UUID,
    'different_times_same_athlete_race',
    r1.time_cs,
    r2.time_cs,
    ABS(r2.time_cs - r1.time_cs),
    'pending'
FROM results r1
CROSS JOIN results r2
WHERE r1.athlete_id = '0c60c483-c64a-407c-962d-431819bd7339'::UUID
AND r1.meet_id = '06637eee-c2b7-4b0f-95da-a7743209562d'::UUID
AND r1.race_id = '6671f6f8-6fd2-4fc7-98bc-6efe6da0ded3'::UUID
AND r2.athlete_id = '0c60c483-c64a-407c-962d-431819bd7339'::UUID
AND r2.meet_id = '06637eee-c2b7-4b0f-95da-a7743209562d'::UUID
AND r2.race_id = '6671f6f8-6fd2-4fc7-98bc-6efe6da0ded3'::UUID
AND r1.time_cs = 158420  -- Original time
AND r2.time_cs = 207460  -- CSV time
ON CONFLICT (result_id_1, result_id_2) DO NOTHING;

-- Step 4: Recreate the unique constraint to only prevent EXACT duplicates (same athlete, race, AND time)
-- This allows multiple different times for the same athlete in the same race
ALTER TABLE results ADD CONSTRAINT results_athlete_id_meet_id_race_id_time_cs_data_source_key
    UNIQUE (athlete_id, meet_id, race_id, time_cs, data_source);

-- Step 5: Re-enable custom triggers
ALTER TABLE results ENABLE TRIGGER USER;

-- Summary
SELECT 'Added Ariel Hung duplicate times!' AS status,
    (SELECT COUNT(*) FROM results
     WHERE athlete_id = '0c60c483-c64a-407c-962d-431819bd7339'::UUID
     AND meet_id = '06637eee-c2b7-4b0f-95da-a7743209562d'::UUID) as ariel_hung_results,
    (SELECT COUNT(*) FROM potential_duplicates
     WHERE athlete_id = '0c60c483-c64a-407c-962d-431819bd7339'::UUID) as potential_duplicates_flagged;
