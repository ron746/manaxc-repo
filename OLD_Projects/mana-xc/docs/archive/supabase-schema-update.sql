-- Mana XC Database Schema Update
-- Run this in Supabase SQL Editor to add missing columns

-- 1. Update meets table
ALTER TABLE meets
ADD COLUMN IF NOT EXISTS athletic_net_id TEXT,
ADD COLUMN IF NOT EXISTS ath_net_id TEXT;

-- 2. Update courses table
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS distance_meters INTEGER DEFAULT 4409;

-- 3. Update races table
ALTER TABLE races
ADD COLUMN IF NOT EXISTS athletic_net_id TEXT,
ADD COLUMN IF NOT EXISTS distance_meters INTEGER,
ADD COLUMN IF NOT EXISTS xc_time_rating NUMERIC DEFAULT 1.000;

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_meets_athletic_net_id ON meets(athletic_net_id);
CREATE INDEX IF NOT EXISTS idx_races_athletic_net_id ON races(athletic_net_id);
CREATE INDEX IF NOT EXISTS idx_results_athlete_id ON results(athlete_id);
CREATE INDEX IF NOT EXISTS idx_results_race_id ON results(race_id);

-- 5. Create materialized view for athlete XC times (if not exists)
CREATE MATERIALIZED VIEW IF NOT EXISTS athlete_xc_times_v3 AS
SELECT
  r.athlete_id,
  MIN(r.time_cs * COALESCE(ra.xc_time_rating, 1.0)) as best_xc_time_cs
FROM results r
JOIN races ra ON ra.id = r.race_id
WHERE r.time_cs > 0
GROUP BY r.athlete_id;

-- 6. Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_athlete_xc_times_v3_athlete_id
ON athlete_xc_times_v3(athlete_id);

-- 7. Add season_year to results if missing
ALTER TABLE results
ADD COLUMN IF NOT EXISTS season_year INTEGER;

-- Success message
SELECT 'Schema update completed successfully!' as status;
