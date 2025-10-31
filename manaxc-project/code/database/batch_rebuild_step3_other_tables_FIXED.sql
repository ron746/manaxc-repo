-- Step 3: Rebuild course_records, school_hall_of_fame, and school_course_records
-- Only for courses/schools involved in meet 254378
-- These tables are denormalized with metadata columns

-- =============================================================================
-- Part A: Rebuild course_records for affected courses
-- =============================================================================

-- Delete existing records for affected courses
DELETE FROM course_records
WHERE course_id IN (
    SELECT DISTINCT race.course_id
    FROM results r
    JOIN races race ON r.race_id = race.id
    WHERE r.meet_id = (SELECT id FROM meets WHERE athletic_net_id = '254378')
);

-- Insert new course records with all denormalized data
INSERT INTO course_records (
    course_id,
    result_id,
    athlete_id,
    gender,
    rank,
    time_cs,
    athlete_name,
    athlete_grad_year,
    school_id,
    school_name,
    meet_id,
    meet_name,
    meet_date,
    race_id
)
SELECT
    ranked.course_id,
    ranked.result_id,
    ranked.athlete_id,
    ranked.gender,
    ranked.rank,
    ranked.time_cs,
    ranked.athlete_name,
    ranked.athlete_grad_year,
    ranked.school_id,
    ranked.school_name,
    ranked.meet_id,
    ranked.meet_name,
    ranked.meet_date,
    ranked.race_id
FROM (
    SELECT
        c.id as course_id,
        r.id as result_id,
        r.athlete_id,
        a.gender,
        r.time_cs,
        a.name as athlete_name,
        a.grad_year as athlete_grad_year,
        a.school_id,
        s.name as school_name,
        m.id as meet_id,
        m.name as meet_name,
        m.meet_date,
        race.id as race_id,
        ROW_NUMBER() OVER (PARTITION BY c.id, a.gender ORDER BY r.time_cs) as rank
    FROM results r
    JOIN races race ON r.race_id = race.id
    JOIN courses c ON race.course_id = c.id
    JOIN athletes a ON r.athlete_id = a.id
    JOIN meets m ON r.meet_id = m.id
    LEFT JOIN schools s ON a.school_id = s.id
    WHERE r.time_cs IS NOT NULL
    AND c.id IN (
        SELECT DISTINCT race2.course_id
        FROM results r2
        JOIN races race2 ON r2.race_id = race2.id
        WHERE r2.meet_id = (SELECT id FROM meets WHERE athletic_net_id = '254378')
    )
) ranked
WHERE ranked.rank <= 100;

-- =============================================================================
-- Part B: Rebuild school_hall_of_fame for affected schools
-- =============================================================================

-- Delete existing records for affected schools
DELETE FROM school_hall_of_fame
WHERE school_id IN (
    SELECT DISTINCT a.school_id
    FROM results r
    JOIN athletes a ON r.athlete_id = a.id
    WHERE r.meet_id = (SELECT id FROM meets WHERE athletic_net_id = '254378')
    AND a.school_id IS NOT NULL
);

-- Insert new hall of fame records with all denormalized data
-- Use DISTINCT ON to ensure only one result per athlete (their best normalized time)
INSERT INTO school_hall_of_fame (
    school_id,
    result_id,
    athlete_id,
    gender,
    rank,
    time_cs,
    normalized_time_cs,
    athlete_name,
    athlete_grad_year,
    course_id,
    course_name,
    meet_id,
    meet_name,
    meet_date,
    race_id,
    season_year
)
SELECT
    ranked.school_id,
    ranked.result_id,
    ranked.athlete_id,
    ranked.gender,
    ranked.rank,
    ranked.time_cs,
    ranked.normalized_time_cs,
    ranked.athlete_name,
    ranked.athlete_grad_year,
    ranked.course_id,
    ranked.course_name,
    ranked.meet_id,
    ranked.meet_name,
    ranked.meet_date,
    ranked.race_id,
    ranked.season_year
FROM (
    SELECT DISTINCT ON (a.school_id, a.gender, r.athlete_id)
        a.school_id,
        r.id as result_id,
        r.athlete_id,
        a.gender,
        r.time_cs,
        r.normalized_time_cs,
        a.name as athlete_name,
        a.grad_year as athlete_grad_year,
        c.id as course_id,
        c.name as course_name,
        m.id as meet_id,
        m.name as meet_name,
        m.meet_date,
        race.id as race_id,
        m.season_year,
        ROW_NUMBER() OVER (PARTITION BY a.school_id, a.gender ORDER BY r.normalized_time_cs, r.athlete_id) as rank
    FROM results r
    JOIN athletes a ON r.athlete_id = a.id
    JOIN races race ON r.race_id = race.id
    JOIN courses c ON race.course_id = c.id
    JOIN meets m ON r.meet_id = m.id
    WHERE r.normalized_time_cs IS NOT NULL
    AND a.school_id IN (
        SELECT DISTINCT a2.school_id
        FROM results r2
        JOIN athletes a2 ON r2.athlete_id = a2.id
        WHERE r2.meet_id = (SELECT id FROM meets WHERE athletic_net_id = '254378')
        AND a2.school_id IS NOT NULL
    )
    ORDER BY a.school_id, a.gender, r.athlete_id, r.normalized_time_cs
) ranked
WHERE ranked.rank <= 100;

-- =============================================================================
-- Part C: Rebuild school_course_records for affected schools and courses
-- =============================================================================

-- Delete existing records for affected schools and courses
DELETE FROM school_course_records
WHERE school_id IN (
    SELECT DISTINCT a.school_id
    FROM results r
    JOIN athletes a ON r.athlete_id = a.id
    WHERE r.meet_id = (SELECT id FROM meets WHERE athletic_net_id = '254378')
    AND a.school_id IS NOT NULL
)
AND course_id IN (
    SELECT DISTINCT race.course_id
    FROM results r
    JOIN races race ON r.race_id = race.id
    WHERE r.meet_id = (SELECT id FROM meets WHERE athletic_net_id = '254378')
);

-- Insert new school course records with all denormalized data
INSERT INTO school_course_records (
    school_id,
    course_id,
    result_id,
    athlete_id,
    grade,
    gender,
    time_cs,
    athlete_name,
    athlete_grad_year,
    meet_id,
    meet_name,
    meet_date,
    race_id,
    season_year
)
SELECT DISTINCT ON (a.school_id, c.id, a.gender, (12 - (a.grad_year - m.season_year)))
    a.school_id,
    c.id as course_id,
    r.id as result_id,
    r.athlete_id,
    (12 - (a.grad_year - m.season_year)) as grade,
    a.gender,
    r.time_cs,
    a.name as athlete_name,
    a.grad_year as athlete_grad_year,
    m.id as meet_id,
    m.name as meet_name,
    m.meet_date,
    race.id as race_id,
    m.season_year
FROM results r
JOIN athletes a ON r.athlete_id = a.id
JOIN races race ON r.race_id = race.id
JOIN courses c ON race.course_id = c.id
JOIN meets m ON r.meet_id = m.id
WHERE r.time_cs IS NOT NULL
AND a.school_id IN (
    SELECT DISTINCT a2.school_id
    FROM results r2
    JOIN athletes a2 ON r2.athlete_id = a2.id
    WHERE r2.meet_id = (SELECT id FROM meets WHERE athletic_net_id = '254378')
    AND a2.school_id IS NOT NULL
)
AND c.id IN (
    SELECT DISTINCT race2.course_id
    FROM results r2
    JOIN races race2 ON r2.race_id = race2.id
    WHERE r2.meet_id = (SELECT id FROM meets WHERE athletic_net_id = '254378')
)
AND (12 - (a.grad_year - m.season_year)) BETWEEN 9 AND 12
ORDER BY a.school_id, c.id, a.gender, (12 - (a.grad_year - m.season_year)), r.time_cs;

-- =============================================================================
-- Summary
-- =============================================================================

SELECT 'Step 3 complete!' AS status;
