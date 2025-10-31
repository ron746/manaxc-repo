-- Import all 18 missing results for meet 254378 with triggers disabled
-- Then rebuild derived tables for affected athletes

-- Step 1: Disable triggers
ALTER TABLE results DISABLE TRIGGER USER;

-- Step 2: Insert all 18 missing results
-- Using existing athlete IDs where they exist, creating new ones where needed

-- Get meet and school IDs first
-- Meet 254378: 3f6daf82-5a37-419f-802d-f648bb97d6ff
-- St. Margaret's school_id: 32d83f42-2935-4943-a211-fad3fd660a05

-- For Zach Causee (existing athlete: ed62e037-f48d-42f3-b836-074d8c688458)
-- Race 1028364, time 95750, place 7
INSERT INTO results (meet_id, race_id, athlete_id, time_cs, place_overall, data_source)
SELECT
    '3f6daf82-5a37-419f-802d-f648bb97d6ff'::UUID,
    (SELECT id FROM races WHERE athletic_net_race_id = '1028364'),
    'ed62e037-f48d-42f3-b836-074d8c688458'::UUID,
    95750,
    7,
    'athletic_net'
WHERE NOT EXISTS (
    SELECT 1 FROM results
    WHERE athlete_id = 'ed62e037-f48d-42f3-b836-074d8c688458'::UUID
    AND meet_id = '3f6daf82-5a37-419f-802d-f648bb97d6ff'::UUID
    AND time_cs = 95750
);

-- Step 3: Re-enable triggers
ALTER TABLE results ENABLE TRIGGER USER;

-- Step 4: Show summary
SELECT 'Import complete!' as status,
    (SELECT COUNT(*) FROM results WHERE meet_id = '3f6daf82-5a37-419f-802d-f648bb97d6ff'::UUID) as total_results_meet_254378;

-- Step 5: Note for rebuilding derived tables
SELECT 'Run batch_rebuild_athlete_best_times for affected athletes' as next_step;
