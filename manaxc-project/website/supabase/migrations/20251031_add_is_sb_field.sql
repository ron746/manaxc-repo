-- Migration: Add is_sb field and update trigger to mark Season Bests and PRs
-- Date: 2025-10-31
-- Purpose: Track Season Best (SB) and Personal Record (PR) performances automatically

-- ============================================================================
-- PART 1: Add is_sb field to results table
-- ============================================================================

ALTER TABLE results
ADD COLUMN IF NOT EXISTS is_sb BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_results_is_sb ON results(is_sb) WHERE is_sb = TRUE;
CREATE INDEX IF NOT EXISTS idx_results_is_pr ON results(is_pr) WHERE is_pr = TRUE;

COMMENT ON COLUMN results.is_sb IS 'True if this result is the athlete''s season best (fastest normalized time for the season)';
COMMENT ON COLUMN results.is_pr IS 'True if this result is the athlete''s all-time personal record (fastest normalized time ever)';

-- ============================================================================
-- PART 2: Update trigger function to mark is_sb and is_pr
-- ============================================================================

CREATE OR REPLACE FUNCTION update_athlete_best_times()
RETURNS TRIGGER AS $$
DECLARE
  v_distance_meters INTEGER;
  v_difficulty_rating DECIMAL;
  v_course_id UUID;
  v_season_year INTEGER;
  v_normalized_cs INTEGER;
  v_is_season_best BOOLEAN := FALSE;
  v_is_alltime_best BOOLEAN := FALSE;
  v_current_season_best_normalized INTEGER;
  v_current_alltime_best_normalized INTEGER;
BEGIN
  -- Get course and meet info
  SELECT
    c.distance_meters,
    c.difficulty_rating,
    c.id,
    m.season_year
  INTO
    v_distance_meters,
    v_difficulty_rating,
    v_course_id,
    v_season_year
  FROM races r
  JOIN courses c ON r.course_id = c.id
  JOIN meets m ON r.meet_id = m.id
  WHERE r.id = NEW.race_id;

  -- Calculate normalized time
  v_normalized_cs := calculate_normalized_time(
    NEW.time_cs,
    v_distance_meters,
    v_difficulty_rating
  );

  -- Update results table with normalized time
  NEW.normalized_time_cs := v_normalized_cs;

  -- Get current best times for this athlete (if they exist)
  SELECT
    season_best_normalized_cs,
    alltime_best_normalized_cs
  INTO
    v_current_season_best_normalized,
    v_current_alltime_best_normalized
  FROM athlete_best_times
  WHERE athlete_id = NEW.athlete_id
    AND season_year = v_season_year;

  -- Determine if this is a season best or all-time best
  IF v_current_season_best_normalized IS NULL OR v_normalized_cs < v_current_season_best_normalized THEN
    v_is_season_best := TRUE;
  END IF;

  IF v_current_alltime_best_normalized IS NULL OR v_normalized_cs < v_current_alltime_best_normalized THEN
    v_is_alltime_best := TRUE;
  END IF;

  -- Set the flags on the result
  NEW.is_sb := v_is_season_best;
  NEW.is_pr := v_is_alltime_best;

  -- Clear is_sb flag from previous season best if this is a new season best
  IF v_is_season_best THEN
    UPDATE results
    SET is_sb = FALSE
    WHERE athlete_id = NEW.athlete_id
      AND is_sb = TRUE
      AND id != NEW.id
      AND id IN (
        SELECT r.id
        FROM results r
        JOIN races ra ON r.race_id = ra.id
        JOIN meets m ON ra.meet_id = m.id
        WHERE r.athlete_id = NEW.athlete_id
          AND m.season_year = v_season_year
      );
  END IF;

  -- Clear is_pr flag from previous PR if this is a new PR
  IF v_is_alltime_best THEN
    UPDATE results
    SET is_pr = FALSE
    WHERE athlete_id = NEW.athlete_id
      AND is_pr = TRUE
      AND id != NEW.id;
  END IF;

  -- Update or insert into athlete_best_times
  INSERT INTO athlete_best_times (
    athlete_id,
    season_year,
    season_best_time_cs,
    season_best_normalized_cs,
    season_best_result_id,
    season_best_course_id,
    season_best_race_distance_meters,
    alltime_best_time_cs,
    alltime_best_normalized_cs,
    alltime_best_result_id,
    alltime_best_course_id,
    alltime_best_race_distance_meters
  )
  VALUES (
    NEW.athlete_id,
    v_season_year,
    NEW.time_cs,
    v_normalized_cs,
    NEW.id,
    v_course_id,
    v_distance_meters,
    NEW.time_cs,
    v_normalized_cs,
    NEW.id,
    v_course_id,
    v_distance_meters
  )
  ON CONFLICT (athlete_id, season_year) DO UPDATE
  SET
    -- Update season best if this time is better
    season_best_time_cs = CASE
      WHEN v_normalized_cs < athlete_best_times.season_best_normalized_cs
      THEN NEW.time_cs
      ELSE athlete_best_times.season_best_time_cs
    END,
    season_best_normalized_cs = CASE
      WHEN v_normalized_cs < athlete_best_times.season_best_normalized_cs
      THEN v_normalized_cs
      ELSE athlete_best_times.season_best_normalized_cs
    END,
    season_best_result_id = CASE
      WHEN v_normalized_cs < athlete_best_times.season_best_normalized_cs
      THEN NEW.id
      ELSE athlete_best_times.season_best_result_id
    END,
    season_best_course_id = CASE
      WHEN v_normalized_cs < athlete_best_times.season_best_normalized_cs
      THEN v_course_id
      ELSE athlete_best_times.season_best_course_id
    END,
    season_best_race_distance_meters = CASE
      WHEN v_normalized_cs < athlete_best_times.season_best_normalized_cs
      THEN v_distance_meters
      ELSE athlete_best_times.season_best_race_distance_meters
    END,
    -- Update all-time best if this time is better
    alltime_best_time_cs = CASE
      WHEN v_normalized_cs < athlete_best_times.alltime_best_normalized_cs
      THEN NEW.time_cs
      ELSE athlete_best_times.alltime_best_time_cs
    END,
    alltime_best_normalized_cs = CASE
      WHEN v_normalized_cs < athlete_best_times.alltime_best_normalized_cs
      THEN v_normalized_cs
      ELSE athlete_best_times.alltime_best_normalized_cs
    END,
    alltime_best_result_id = CASE
      WHEN v_normalized_cs < athlete_best_times.alltime_best_normalized_cs
      THEN NEW.id
      ELSE athlete_best_times.alltime_best_result_id
    END,
    alltime_best_course_id = CASE
      WHEN v_normalized_cs < athlete_best_times.alltime_best_normalized_cs
      THEN v_course_id
      ELSE athlete_best_times.alltime_best_course_id
    END,
    alltime_best_race_distance_meters = CASE
      WHEN v_normalized_cs < athlete_best_times.alltime_best_normalized_cs
      THEN v_distance_meters
      ELSE athlete_best_times.alltime_best_race_distance_meters
    END,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_athlete_best_times IS 'Automatically maintains athlete_best_times table and marks is_sb/is_pr flags when results are inserted/updated';

-- ============================================================================
-- PART 3: Backfill is_sb and is_pr flags for existing results
-- ============================================================================

-- Mark season bests
UPDATE results r
SET is_sb = TRUE
FROM athlete_best_times abt
WHERE r.id = abt.season_best_result_id;

-- Mark all-time PRs
UPDATE results r
SET is_pr = TRUE
FROM athlete_best_times abt
WHERE r.id = abt.alltime_best_result_id;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Count results with is_sb flag
SELECT
  COUNT(*) FILTER (WHERE is_sb = TRUE) as season_bests_count,
  COUNT(*) FILTER (WHERE is_pr = TRUE) as personal_records_count,
  COUNT(*) as total_results
FROM results;

-- Sample athletes with their SB and PR results
SELECT
  a.name,
  m.name as meet_name,
  m.season_year,
  r.time_cs,
  r.normalized_time_cs,
  r.is_sb,
  r.is_pr
FROM results r
JOIN athletes a ON r.athlete_id = a.id
JOIN meets m ON r.meet_id = m.id
WHERE r.is_sb = TRUE OR r.is_pr = TRUE
ORDER BY r.normalized_time_cs ASC
LIMIT 20;

SELECT 'Migration completed successfully! is_sb and is_pr flags are now automatically maintained.' as status;
