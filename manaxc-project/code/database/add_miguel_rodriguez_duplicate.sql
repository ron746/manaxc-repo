-- Add Miguel Rodriguez's second time (from CSV) and flag as potential duplicate
-- Meet: 254332 (22nd Golden Eagle Invitational)
-- Athlete: Miguel A. Rodriguez (Redwood Visalia)
-- Race: Mens 5,000 Meters Frosh-Soph
-- Existing time: 117431 cs (19:34.31)
-- CSV time: 124551 cs (20:45.51)
-- Difference: 7120 cs (71.20 sec)

-- Step 0: Disable custom triggers
ALTER TABLE results DISABLE TRIGGER USER;

-- Step 1: Insert CSV time
INSERT INTO results (meet_id, race_id, athlete_id, time_cs, place_overall, data_source)
SELECT
    'c4011285-2267-4a98-8d4b-4e0f41f5ca04'::UUID, -- meet 254332
    '5d516787-448c-44d2-a625-4b7b6b48d23a'::UUID, -- race Mens 5k Frosh-Soph
    'd2e14bbf-01f8-4e8f-8bf5-3ef4fd59eafd'::UUID, -- Miguel A. Rodriguez
    124551, -- 20:45.51 from CSV
    85,
    'athletic_net'
WHERE NOT EXISTS (
    SELECT 1 FROM results
    WHERE athlete_id = 'd2e14bbf-01f8-4e8f-8bf5-3ef4fd59eafd'::UUID
    AND meet_id = 'c4011285-2267-4a98-8d4b-4e0f41f5ca04'::UUID
    AND race_id = '5d516787-448c-44d2-a625-4b7b6b48d23a'::UUID
    AND time_cs = 124551
);

-- Step 2: Create potential duplicate record
INSERT INTO potential_duplicates (
    result_id_1, result_id_2, athlete_id, meet_id, race_id,
    conflict_type, time_1_cs, time_2_cs, time_difference_cs, status
)
SELECT r1.id, r2.id,
    'd2e14bbf-01f8-4e8f-8bf5-3ef4fd59eafd'::UUID,
    'c4011285-2267-4a98-8d4b-4e0f41f5ca04'::UUID,
    '5d516787-448c-44d2-a625-4b7b6b48d23a'::UUID,
    'different_times_same_athlete_race',
    r1.time_cs, r2.time_cs,
    ABS(r2.time_cs - r1.time_cs),
    'pending'
FROM results r1
CROSS JOIN results r2
WHERE r1.athlete_id = 'd2e14bbf-01f8-4e8f-8bf5-3ef4fd59eafd'::UUID
AND r1.meet_id = 'c4011285-2267-4a98-8d4b-4e0f41f5ca04'::UUID
AND r1.race_id = '5d516787-448c-44d2-a625-4b7b6b48d23a'::UUID
AND r2.athlete_id = 'd2e14bbf-01f8-4e8f-8bf5-3ef4fd59eafd'::UUID
AND r2.meet_id = 'c4011285-2267-4a98-8d4b-4e0f41f5ca04'::UUID
AND r2.race_id = '5d516787-448c-44d2-a625-4b7b6b48d23a'::UUID
AND r1.time_cs = 117431  -- Existing time
AND r2.time_cs = 124551  -- CSV time
ON CONFLICT (result_id_1, result_id_2) DO NOTHING;

-- Step 3: Re-enable triggers
ALTER TABLE results ENABLE TRIGGER USER;

-- Summary
SELECT 'Added Miguel Rodriguez duplicate times!' AS status,
    (SELECT COUNT(*) FROM results
     WHERE athlete_id = 'd2e14bbf-01f8-4e8f-8bf5-3ef4fd59eafd'::UUID
     AND meet_id = 'c4011285-2267-4a98-8d4b-4e0f41f5ca04'::UUID) as miguel_results,
    (SELECT COUNT(*) FROM potential_duplicates
     WHERE athlete_id = 'd2e14bbf-01f8-4e8f-8bf5-3ef4fd59eafd'::UUID) as potential_duplicates_flagged;
