-- Add Tristan Scott's second time (from CSV) and flag as potential duplicate
-- Meet: 267582 (STAL #2)
-- Athlete: Tristan Scott (Westmont)
-- Race: Mens 2.74 Miles Reserves
-- Existing time: 123280 cs (20:32.80)
-- CSV time: 129810 cs (21:38.10)
-- Difference: 6530 cs (65.30 sec)

-- Step 0: Disable custom triggers to avoid course_records conflicts
ALTER TABLE results DISABLE TRIGGER USER;

-- Step 1: Already have the correct unique constraint from previous fix
-- (results_athlete_id_meet_id_race_id_time_cs_data_source_key)

-- Step 2: Insert the CSV time (if not already exists)
INSERT INTO results (
    meet_id,
    race_id,
    athlete_id,
    time_cs,
    data_source
)
SELECT
    'b36c804a-a0c5-49ce-a614-cb52f14e9e5d'::UUID, -- meet 267582
    '13b7d0e1-29f3-4d8d-acf5-ef0df8b40cfb'::UUID, -- race Mens 2.74 Miles Reserves
    '385a7f65-e6e2-4424-be27-3098b1debf0a'::UUID, -- Tristan Scott
    129810, -- 21:38.10 from CSV
    'athletic_net'
WHERE NOT EXISTS (
    SELECT 1 FROM results
    WHERE athlete_id = '385a7f65-e6e2-4424-be27-3098b1debf0a'::UUID
    AND meet_id = 'b36c804a-a0c5-49ce-a614-cb52f14e9e5d'::UUID
    AND race_id = '13b7d0e1-29f3-4d8d-acf5-ef0df8b40cfb'::UUID
    AND time_cs = 129810
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
    '385a7f65-e6e2-4424-be27-3098b1debf0a'::UUID,
    'b36c804a-a0c5-49ce-a614-cb52f14e9e5d'::UUID,
    '13b7d0e1-29f3-4d8d-acf5-ef0df8b40cfb'::UUID,
    'different_times_same_athlete_race',
    r1.time_cs,
    r2.time_cs,
    ABS(r2.time_cs - r1.time_cs),
    'pending'
FROM results r1
CROSS JOIN results r2
WHERE r1.athlete_id = '385a7f65-e6e2-4424-be27-3098b1debf0a'::UUID
AND r1.meet_id = 'b36c804a-a0c5-49ce-a614-cb52f14e9e5d'::UUID
AND r1.race_id = '13b7d0e1-29f3-4d8d-acf5-ef0df8b40cfb'::UUID
AND r2.athlete_id = '385a7f65-e6e2-4424-be27-3098b1debf0a'::UUID
AND r2.meet_id = 'b36c804a-a0c5-49ce-a614-cb52f14e9e5d'::UUID
AND r2.race_id = '13b7d0e1-29f3-4d8d-acf5-ef0df8b40cfb'::UUID
AND r1.time_cs = 123280  -- Original time
AND r2.time_cs = 129810  -- CSV time
ON CONFLICT (result_id_1, result_id_2) DO NOTHING;

-- Step 4: Re-enable custom triggers
ALTER TABLE results ENABLE TRIGGER USER;

-- Summary
SELECT 'Added Tristan Scott duplicate times!' AS status,
    (SELECT COUNT(*) FROM results
     WHERE athlete_id = '385a7f65-e6e2-4424-be27-3098b1debf0a'::UUID
     AND meet_id = 'b36c804a-a0c5-49ce-a614-cb52f14e9e5d'::UUID) as tristan_scott_results,
    (SELECT COUNT(*) FROM potential_duplicates
     WHERE athlete_id = '385a7f65-e6e2-4424-be27-3098b1debf0a'::UUID) as potential_duplicates_flagged;
