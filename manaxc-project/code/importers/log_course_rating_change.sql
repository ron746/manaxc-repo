-- Course Rating Change Logging System
-- Run this in Supabase SQL Editor to create the logging table and function

-- 1. Create course_rating_history table (if not exists)
CREATE TABLE IF NOT EXISTS course_rating_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    course_name TEXT NOT NULL,
    old_difficulty_rating NUMERIC,
    new_difficulty_rating NUMERIC NOT NULL,
    change_reason TEXT,
    season_year INTEGER,  -- Track if change is season-specific
    analysis_data JSONB,  -- Store statistical analysis (mean error, sample size, etc.)
    changed_by TEXT,      -- Username or 'system'
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- 2. Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_course_rating_history_course_id
ON course_rating_history(course_id);

CREATE INDEX IF NOT EXISTS idx_course_rating_history_changed_at
ON course_rating_history(changed_at DESC);

-- 3. Create function to log course rating changes
CREATE OR REPLACE FUNCTION log_course_rating_change(
    p_course_id UUID,
    p_new_difficulty NUMERIC,
    p_reason TEXT DEFAULT 'Manual update',
    p_season_year INTEGER DEFAULT NULL,
    p_analysis_data JSONB DEFAULT NULL,
    p_changed_by TEXT DEFAULT 'admin',
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_old_difficulty NUMERIC;
    v_course_name TEXT;
    v_log_id UUID;
BEGIN
    -- Get current difficulty and course name
    SELECT difficulty_rating, name
    INTO v_old_difficulty, v_course_name
    FROM courses
    WHERE id = p_course_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Course not found: %', p_course_id;
    END IF;

    -- Insert log entry
    INSERT INTO course_rating_history (
        course_id,
        course_name,
        old_difficulty_rating,
        new_difficulty_rating,
        change_reason,
        season_year,
        analysis_data,
        changed_by,
        notes
    ) VALUES (
        p_course_id,
        v_course_name,
        v_old_difficulty,
        p_new_difficulty,
        p_reason,
        p_season_year,
        p_analysis_data,
        p_changed_by,
        p_notes
    )
    RETURNING id INTO v_log_id;

    -- Update the course difficulty
    UPDATE courses
    SET
        difficulty_rating = p_new_difficulty,
        updated_at = NOW()
    WHERE id = p_course_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Example usage:
-- SELECT log_course_rating_change(
--     p_course_id := 'course-uuid-here',
--     p_new_difficulty := 1.208,
--     p_reason := 'Statistical analysis of 67 overlapping athletes',
--     p_season_year := NULL,
--     p_analysis_data := '{"mean_error_cs": 450, "sample_size": 67, "std_dev": 1200}'::jsonb,
--     p_changed_by := 'claude_analysis',
--     p_notes := 'Compared Montgomery Hill 2.74 vs Crystal Springs 2.95'
-- );

-- 5. View rating change history for a course
-- SELECT
--     changed_at,
--     old_difficulty_rating,
--     new_difficulty_rating,
--     new_difficulty_rating - old_difficulty_rating as change,
--     change_reason,
--     season_year,
--     analysis_data->>'sample_size' as sample_size,
--     changed_by,
--     notes
-- FROM course_rating_history
-- WHERE course_id = 'your-course-id'
-- ORDER BY changed_at DESC;
