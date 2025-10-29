-- Migration: Add school performance caching tables
-- Date: 2025-10-28
-- Purpose: Optimize school records and hall of fame pages
--
-- TABLES CREATED:
-- 1. school_hall_of_fame: Top 100 unique athletes per school per gender (all-time best)
-- 2. school_course_records: Best time per grade per course per gender per school
--
-- PERFORMANCE BENEFIT:
-- - School hall of fame: 10,000+ results → 200 records (50x faster)
-- - School course records by grade: 10,000+ results → ~32 records per course (300x faster)
--   (4 grades × 2 genders × ~4 courses = ~32 records)

-- ============================================================================
-- TABLE 1: school_hall_of_fame
-- Purpose: Top 100 fastest unique athletes per school per gender (all-time)
-- ============================================================================

CREATE TABLE IF NOT EXISTS school_hall_of_fame (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  gender TEXT NOT NULL CHECK (gender IN ('M', 'F')),

  -- Athlete info
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  athlete_name TEXT NOT NULL,
  athlete_grad_year INTEGER NOT NULL,

  -- Best result info
  result_id UUID NOT NULL REFERENCES results(id) ON DELETE CASCADE,
  time_cs INTEGER NOT NULL,
  normalized_time_cs INTEGER NOT NULL,  -- For fair comparison across courses

  -- Context (denormalized for fast display)
  course_id UUID NOT NULL REFERENCES courses(id),
  course_name TEXT NOT NULL,
  meet_id UUID NOT NULL REFERENCES meets(id),
  meet_name TEXT NOT NULL,
  meet_date DATE NOT NULL,
  race_id UUID NOT NULL REFERENCES races(id),
  season_year INTEGER NOT NULL,

  -- Pre-computed rank
  rank INTEGER NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One record per athlete per school per gender (their all-time best)
  UNIQUE(school_id, gender, athlete_id),
  -- No duplicate ranks
  UNIQUE(school_id, gender, rank)
);

CREATE INDEX idx_school_hall_of_fame_school_gender_rank ON school_hall_of_fame(school_id, gender, rank);
CREATE INDEX idx_school_hall_of_fame_athlete ON school_hall_of_fame(athlete_id);
CREATE INDEX idx_school_hall_of_fame_normalized ON school_hall_of_fame(school_id, gender, normalized_time_cs);

COMMENT ON TABLE school_hall_of_fame IS 'Top 100 all-time fastest athletes per school per gender based on normalized times';

-- ============================================================================
-- TABLE 2: school_course_records
-- Purpose: Best time per grade (9-12) per course per gender per school
-- ============================================================================

CREATE TABLE IF NOT EXISTS school_course_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  gender TEXT NOT NULL CHECK (gender IN ('M', 'F')),
  grade INTEGER NOT NULL CHECK (grade >= 9 AND grade <= 12),

  -- Result info
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  result_id UUID NOT NULL REFERENCES results(id) ON DELETE CASCADE,
  time_cs INTEGER NOT NULL,

  -- Context (denormalized for fast display)
  athlete_name TEXT NOT NULL,
  athlete_grad_year INTEGER NOT NULL,
  meet_id UUID NOT NULL REFERENCES meets(id),
  meet_name TEXT NOT NULL,
  meet_date DATE NOT NULL,
  race_id UUID NOT NULL REFERENCES races(id),
  season_year INTEGER NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One record per school per course per gender per grade (best time for that grade)
  UNIQUE(school_id, course_id, gender, grade)
);

CREATE INDEX idx_school_course_records_school_course ON school_course_records(school_id, course_id, gender);
CREATE INDEX idx_school_course_records_athlete ON school_course_records(athlete_id);
CREATE INDEX idx_school_course_records_grade ON school_course_records(school_id, gender, grade);

COMMENT ON TABLE school_course_records IS 'Best time per grade level per course for each school - updated automatically';

-- ============================================================================
-- TRIGGERS: Maintain school_hall_of_fame
-- ============================================================================

CREATE OR REPLACE FUNCTION maintain_school_hall_of_fame()
RETURNS TRIGGER AS $$
DECLARE
  v_school_id UUID;
  v_gender TEXT;
  v_course_id UUID;
  v_athlete_name TEXT;
  v_athlete_grad_year INTEGER;
  v_course_name TEXT;
  v_meet_id UUID;
  v_meet_name TEXT;
  v_meet_date DATE;
  v_race_id UUID;
  v_season_year INTEGER;
  v_normalized_cs INTEGER;
  v_existing_record RECORD;
  v_current_count INTEGER;
  v_slowest_normalized INTEGER;
BEGIN
  -- Get athlete and school info
  SELECT
    a.school_id,
    a.name,
    a.grad_year,
    a.gender,
    s.id
  INTO
    v_school_id,
    v_athlete_name,
    v_athlete_grad_year,
    v_gender,
    v_school_id
  FROM athletes a
  JOIN schools s ON a.school_id = s.id
  WHERE a.id = NEW.athlete_id;

  -- Get race, course, and meet info
  SELECT
    r.course_id,
    r.gender,
    r.id,
    r.meet_id,
    c.name,
    m.name,
    m.meet_date,
    m.season_year
  INTO
    v_course_id,
    v_gender,  -- Use race gender if available
    v_race_id,
    v_meet_id,
    v_course_name,
    v_meet_name,
    v_meet_date,
    v_season_year
  FROM races r
  JOIN courses c ON r.course_id = c.id
  JOIN meets m ON r.meet_id = m.id
  WHERE r.id = NEW.race_id;

  -- Use race gender if available, otherwise athlete gender
  v_gender := COALESCE(v_gender, (SELECT gender FROM athletes WHERE id = NEW.athlete_id));

  -- Get or calculate normalized time
  v_normalized_cs := COALESCE(NEW.normalized_time_cs,
    (SELECT normalized_time_cs FROM results WHERE id = NEW.id));

  -- Skip if normalized time is NULL (shouldn't happen but just in case)
  IF v_normalized_cs IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if athlete already in hall of fame for this school/gender
  SELECT * INTO v_existing_record
  FROM school_hall_of_fame
  WHERE school_id = v_school_id
    AND gender = v_gender
    AND athlete_id = NEW.athlete_id;

  IF FOUND THEN
    -- Athlete already in hall of fame
    IF v_normalized_cs < v_existing_record.normalized_time_cs THEN
      -- New time is faster - update record
      UPDATE school_hall_of_fame
      SET
        result_id = NEW.id,
        time_cs = NEW.time_cs,
        normalized_time_cs = v_normalized_cs,
        course_id = v_course_id,
        course_name = v_course_name,
        meet_id = v_meet_id,
        meet_name = v_meet_name,
        meet_date = v_meet_date,
        race_id = v_race_id,
        season_year = v_season_year,
        updated_at = NOW()
      WHERE id = v_existing_record.id;

      -- Recalculate ranks
      WITH ranked AS (
        SELECT
          id,
          ROW_NUMBER() OVER (ORDER BY normalized_time_cs ASC) as new_rank
        FROM school_hall_of_fame
        WHERE school_id = v_school_id AND gender = v_gender
      )
      UPDATE school_hall_of_fame shof
      SET rank = ranked.new_rank
      FROM ranked
      WHERE shof.id = ranked.id;
    END IF;
  ELSE
    -- Athlete not in hall of fame yet
    SELECT COUNT(*), MAX(normalized_time_cs)
    INTO v_current_count, v_slowest_normalized
    FROM school_hall_of_fame
    WHERE school_id = v_school_id AND gender = v_gender;

    IF v_current_count < 100 OR v_normalized_cs < v_slowest_normalized THEN
      -- Room for this athlete OR faster than current slowest

      -- Remove slowest if at capacity
      IF v_current_count >= 100 THEN
        DELETE FROM school_hall_of_fame
        WHERE id = (
          SELECT id
          FROM school_hall_of_fame
          WHERE school_id = v_school_id
            AND gender = v_gender
          ORDER BY normalized_time_cs DESC
          LIMIT 1
        );
      END IF;

      -- Insert new record
      INSERT INTO school_hall_of_fame (
        school_id,
        gender,
        athlete_id,
        athlete_name,
        athlete_grad_year,
        result_id,
        time_cs,
        normalized_time_cs,
        course_id,
        course_name,
        meet_id,
        meet_name,
        meet_date,
        race_id,
        season_year,
        rank
      ) VALUES (
        v_school_id,
        v_gender,
        NEW.athlete_id,
        v_athlete_name,
        v_athlete_grad_year,
        NEW.id,
        NEW.time_cs,
        v_normalized_cs,
        v_course_id,
        v_course_name,
        v_meet_id,
        v_meet_name,
        v_meet_date,
        v_race_id,
        v_season_year,
        1  -- Temporary, will be recalculated
      );

      -- Recalculate all ranks
      WITH ranked AS (
        SELECT
          id,
          ROW_NUMBER() OVER (ORDER BY normalized_time_cs ASC) as new_rank
        FROM school_hall_of_fame
        WHERE school_id = v_school_id AND gender = v_gender
      )
      UPDATE school_hall_of_fame shof
      SET rank = ranked.new_rank
      FROM ranked
      WHERE shof.id = ranked.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS maintain_school_hall_of_fame_trigger ON results;

CREATE TRIGGER maintain_school_hall_of_fame_trigger
AFTER INSERT OR UPDATE OF time_cs, normalized_time_cs ON results
FOR EACH ROW
EXECUTE FUNCTION maintain_school_hall_of_fame();

-- ============================================================================
-- TRIGGERS: Maintain school_course_records
-- ============================================================================

CREATE OR REPLACE FUNCTION maintain_school_course_records()
RETURNS TRIGGER AS $$
DECLARE
  v_school_id UUID;
  v_course_id UUID;
  v_gender TEXT;
  v_grade INTEGER;
  v_athlete_name TEXT;
  v_athlete_grad_year INTEGER;
  v_meet_id UUID;
  v_meet_name TEXT;
  v_meet_date DATE;
  v_race_id UUID;
  v_season_year INTEGER;
  v_existing_record RECORD;
BEGIN
  -- Get athlete and school info
  SELECT
    a.school_id,
    a.name,
    a.grad_year,
    a.gender
  INTO
    v_school_id,
    v_athlete_name,
    v_athlete_grad_year,
    v_gender
  FROM athletes a
  WHERE a.id = NEW.athlete_id;

  -- Get race and course info
  SELECT
    r.course_id,
    r.gender,
    r.id,
    r.meet_id,
    m.name,
    m.meet_date,
    m.season_year
  INTO
    v_course_id,
    v_gender,  -- Use race gender if available
    v_race_id,
    v_meet_id,
    v_meet_name,
    v_meet_date,
    v_season_year
  FROM races r
  JOIN meets m ON r.meet_id = m.id
  WHERE r.id = NEW.race_id;

  -- Use race gender if available, otherwise athlete gender
  v_gender := COALESCE(v_gender, (SELECT gender FROM athletes WHERE id = NEW.athlete_id));

  -- Calculate grade at time of race
  v_grade := 12 - (v_athlete_grad_year - v_season_year);

  -- Only track grades 9-12
  IF v_grade < 9 OR v_grade > 12 THEN
    RETURN NEW;
  END IF;

  -- Check if record exists for this school/course/gender/grade
  SELECT * INTO v_existing_record
  FROM school_course_records
  WHERE school_id = v_school_id
    AND course_id = v_course_id
    AND gender = v_gender
    AND grade = v_grade;

  IF FOUND THEN
    -- Record exists - update if new time is faster
    IF NEW.time_cs < v_existing_record.time_cs THEN
      UPDATE school_course_records
      SET
        athlete_id = NEW.athlete_id,
        result_id = NEW.id,
        time_cs = NEW.time_cs,
        athlete_name = v_athlete_name,
        athlete_grad_year = v_athlete_grad_year,
        meet_id = v_meet_id,
        meet_name = v_meet_name,
        meet_date = v_meet_date,
        race_id = v_race_id,
        season_year = v_season_year,
        updated_at = NOW()
      WHERE id = v_existing_record.id;
    END IF;
  ELSE
    -- No record yet - insert new one
    INSERT INTO school_course_records (
      school_id,
      course_id,
      gender,
      grade,
      athlete_id,
      result_id,
      time_cs,
      athlete_name,
      athlete_grad_year,
      meet_id,
      meet_name,
      meet_date,
      race_id,
      season_year
    ) VALUES (
      v_school_id,
      v_course_id,
      v_gender,
      v_grade,
      NEW.athlete_id,
      NEW.id,
      NEW.time_cs,
      v_athlete_name,
      v_athlete_grad_year,
      v_meet_id,
      v_meet_name,
      v_meet_date,
      v_race_id,
      v_season_year
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS maintain_school_course_records_trigger ON results;

CREATE TRIGGER maintain_school_course_records_trigger
AFTER INSERT OR UPDATE OF time_cs ON results
FOR EACH ROW
EXECUTE FUNCTION maintain_school_course_records();

-- ============================================================================
-- BACKFILL: Populate school_hall_of_fame
-- ============================================================================

INSERT INTO school_hall_of_fame (
  school_id,
  gender,
  athlete_id,
  athlete_name,
  athlete_grad_year,
  result_id,
  time_cs,
  normalized_time_cs,
  course_id,
  course_name,
  meet_id,
  meet_name,
  meet_date,
  race_id,
  season_year,
  rank
)
SELECT
  school_id,
  gender,
  athlete_id,
  athlete_name,
  athlete_grad_year,
  result_id,
  time_cs,
  normalized_time_cs,
  course_id,
  course_name,
  meet_id,
  meet_name,
  meet_date,
  race_id,
  season_year,
  rank
FROM (
  SELECT
    s.id as school_id,
    a.gender,
    a.id as athlete_id,
    a.name as athlete_name,
    a.grad_year as athlete_grad_year,
    r.id as result_id,
    r.time_cs,
    r.normalized_time_cs,
    c.id as course_id,
    c.name as course_name,
    m.id as meet_id,
    m.name as meet_name,
    m.meet_date,
    ra.id as race_id,
    m.season_year,
    ROW_NUMBER() OVER (
      PARTITION BY s.id, a.gender, a.id
      ORDER BY r.normalized_time_cs ASC
    ) as athlete_result_rank,
    ROW_NUMBER() OVER (
      PARTITION BY s.id, a.gender
      ORDER BY (
        SELECT MIN(r2.normalized_time_cs)
        FROM results r2
        WHERE r2.athlete_id = a.id
          AND r2.normalized_time_cs IS NOT NULL
      ) ASC
    ) as rank
  FROM results r
  JOIN athletes a ON r.athlete_id = a.id
  JOIN schools s ON a.school_id = s.id
  JOIN races ra ON r.race_id = ra.id
  JOIN courses c ON ra.course_id = c.id
  JOIN meets m ON ra.meet_id = m.id
  WHERE r.normalized_time_cs IS NOT NULL
) subquery
WHERE athlete_result_rank = 1  -- Only each athlete's best time
  AND rank <= 100  -- Top 100 per school per gender
ORDER BY school_id, gender, rank;

-- ============================================================================
-- BACKFILL: Populate school_course_records
-- ============================================================================

INSERT INTO school_course_records (
  school_id,
  course_id,
  gender,
  grade,
  athlete_id,
  result_id,
  time_cs,
  athlete_name,
  athlete_grad_year,
  meet_id,
  meet_name,
  meet_date,
  race_id,
  season_year
)
SELECT DISTINCT ON (school_id, course_id, gender, grade)
  s.id as school_id,
  c.id as course_id,
  COALESCE(ra.gender, a.gender) as gender,
  12 - (a.grad_year - m.season_year) as grade,
  a.id as athlete_id,
  r.id as result_id,
  r.time_cs,
  a.name as athlete_name,
  a.grad_year as athlete_grad_year,
  m.id as meet_id,
  m.name as meet_name,
  m.meet_date,
  ra.id as race_id,
  m.season_year
FROM results r
JOIN athletes a ON r.athlete_id = a.id
JOIN schools s ON a.school_id = s.id
JOIN races ra ON r.race_id = ra.id
JOIN courses c ON ra.course_id = c.id
JOIN meets m ON ra.meet_id = m.id
WHERE r.time_cs IS NOT NULL
  AND 12 - (a.grad_year - m.season_year) BETWEEN 9 AND 12
ORDER BY school_id, course_id, gender, grade, r.time_cs ASC;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check school hall of fame populations
SELECT
  s.name as school_name,
  shof.gender,
  COUNT(*) as athletes_in_hall_of_fame,
  MIN(shof.rank) as min_rank,
  MAX(shof.rank) as max_rank
FROM school_hall_of_fame shof
JOIN schools s ON shof.school_id = s.id
GROUP BY s.name, shof.gender
ORDER BY s.name, shof.gender;

-- Check school course records
SELECT
  s.name as school_name,
  c.name as course_name,
  scr.gender,
  COUNT(*) as grade_records,
  MIN(scr.grade) as min_grade,
  MAX(scr.grade) as max_grade
FROM school_course_records scr
JOIN schools s ON scr.school_id = s.id
JOIN courses c ON scr.course_id = c.id
GROUP BY s.name, c.name, scr.gender
ORDER BY s.name, c.name, scr.gender;

-- Verify no school has over 100 athletes per gender in hall of fame
SELECT
  school_id,
  gender,
  COUNT(*) as athlete_count
FROM school_hall_of_fame
GROUP BY school_id, gender
HAVING COUNT(*) > 100;
-- Should return 0 rows

SELECT 'Migration 003 completed successfully!' as status;
