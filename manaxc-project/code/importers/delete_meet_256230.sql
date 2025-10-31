-- Delete meet 256230 (77th Annual Mt. SAC) in stages to avoid timeout
-- Run these commands in Supabase SQL Editor

-- Step 1: Get meet ID
SELECT id, name, result_count FROM meets WHERE athletic_net_id = '256230';
-- Copy the meet ID for use below

-- Step 2: Delete from derived tables first (replace MEET_ID_HERE with actual ID)
DELETE FROM athlete_best_times 
WHERE season_best_result_id IN (
  SELECT id FROM results WHERE meet_id = 'MEET_ID_HERE'
) OR alltime_best_result_id IN (
  SELECT id FROM results WHERE meet_id = 'MEET_ID_HERE'
);

-- Step 3: Delete results in batches (run this multiple times until 0 rows)
DELETE FROM results 
WHERE meet_id = 'MEET_ID_HERE' 
AND id IN (
  SELECT id FROM results WHERE meet_id = 'MEET_ID_HERE' LIMIT 1000
);
-- Repeat until it returns "DELETE 0"

-- Step 4: Delete races
DELETE FROM races WHERE meet_id = 'MEET_ID_HERE';

-- Step 5: Delete the meet
DELETE FROM meets WHERE id = 'MEET_ID_HERE';

-- Step 6: Verify deletion
SELECT COUNT(*) FROM results WHERE meet_id = 'MEET_ID_HERE';
-- Should return 0

