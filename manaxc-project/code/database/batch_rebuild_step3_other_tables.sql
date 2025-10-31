-- Step 3: Rebuild course_records, school_hall_of_fame, and school_course_records
-- Only for courses/schools involved in meet 254378

-- First, identify affected courses and schools
WITH meet_courses AS (
    SELECT DISTINCT race.course_id
    FROM results r
    JOIN races race ON r.race_id = race.id
    WHERE r.meet_id = (SELECT id FROM meets WHERE athletic_net_id = '254378')
),
meet_schools AS (
    SELECT DISTINCT a.school_id
    FROM results r
    JOIN athletes a ON r.athlete_id = a.id
    WHERE r.meet_id = (SELECT id FROM meets WHERE athletic_net_id = '254378')
    AND a.school_id IS NOT NULL
)

-- Rebuild course_records for affected courses
, course_records_to_update AS (
    SELECT
        c.id as course_id,
        r.id as result_id,
        r.athlete_id,
        a.gender,
        ROW_NUMBER() OVER (PARTITION BY c.id, a.gender ORDER BY r.time_cs) as rank
    FROM results r
    JOIN races race ON r.race_id = race.id
    JOIN courses c ON race.course_id = c.id
    JOIN athletes a ON r.athlete_id = a.id
    WHERE r.time_cs IS NOT NULL
    AND c.id IN (SELECT course_id FROM meet_courses)
)
DELETE FROM course_records
WHERE course_id IN (SELECT course_id FROM meet_courses);

INSERT INTO course_records (course_id, result_id, athlete_id, gender, rank)
SELECT course_id, result_id, athlete_id, gender, rank
FROM (
    SELECT
        c.id as course_id,
        r.id as result_id,
        r.athlete_id,
        a.gender,
        ROW_NUMBER() OVER (PARTITION BY c.id, a.gender ORDER BY r.time_cs) as rank
    FROM results r
    JOIN races race ON r.race_id = race.id
    JOIN courses c ON race.course_id = c.id
    JOIN athletes a ON r.athlete_id = a.id
    WHERE r.time_cs IS NOT NULL
    AND c.id IN (SELECT DISTINCT race.course_id
                 FROM results r2
                 JOIN races race ON r2.race_id = race.id
                 WHERE r2.meet_id = (SELECT id FROM meets WHERE athletic_net_id = '254378'))
) ranked
WHERE ranked.rank <= 100;

-- Rebuild school_hall_of_fame for affected schools
DELETE FROM school_hall_of_fame
WHERE school_id IN (SELECT DISTINCT a.school_id
                    FROM results r
                    JOIN athletes a ON r.athlete_id = a.id
                    WHERE r.meet_id = (SELECT id FROM meets WHERE athletic_net_id = '254378')
                    AND a.school_id IS NOT NULL);

INSERT INTO school_hall_of_fame (school_id, result_id, athlete_id, gender, rank)
SELECT school_id, result_id, athlete_id, gender, rank
FROM (
    SELECT
        a.school_id,
        r.id as result_id,
        r.athlete_id,
        a.gender,
        ROW_NUMBER() OVER (PARTITION BY a.school_id, a.gender ORDER BY r.normalized_time_cs) as rank
    FROM results r
    JOIN athletes a ON r.athlete_id = a.id
    WHERE r.normalized_time_cs IS NOT NULL
    AND a.school_id IN (SELECT DISTINCT a2.school_id
                        FROM results r2
                        JOIN athletes a2 ON r2.athlete_id = a2.id
                        WHERE r2.meet_id = (SELECT id FROM meets WHERE athletic_net_id = '254378')
                        AND a2.school_id IS NOT NULL)
) ranked
WHERE ranked.rank <= 100;

-- Rebuild school_course_records for affected schools and courses
DELETE FROM school_course_records
WHERE school_id IN (SELECT DISTINCT a.school_id
                    FROM results r
                    JOIN athletes a ON r.athlete_id = a.id
                    WHERE r.meet_id = (SELECT id FROM meets WHERE athletic_net_id = '254378')
                    AND a.school_id IS NOT NULL)
AND course_id IN (SELECT DISTINCT race.course_id
                  FROM results r
                  JOIN races race ON r.race_id = race.id
                  WHERE r.meet_id = (SELECT id FROM meets WHERE athletic_net_id = '254378'));

INSERT INTO school_course_records (school_id, course_id, result_id, athlete_id, grade_level, gender)
SELECT DISTINCT ON (a.school_id, c.id, a.gender, (12 - (a.grad_year - m.season_year)))
    a.school_id,
    c.id as course_id,
    r.id as result_id,
    r.athlete_id,
    (12 - (a.grad_year - m.season_year)) as grade_level,
    a.gender
FROM results r
JOIN athletes a ON r.athlete_id = a.id
JOIN races race ON r.race_id = race.id
JOIN courses c ON race.course_id = c.id
JOIN meets m ON r.meet_id = m.id
WHERE r.time_cs IS NOT NULL
AND a.school_id IN (SELECT DISTINCT a2.school_id
                    FROM results r2
                    JOIN athletes a2 ON r2.athlete_id = a2.id
                    WHERE r2.meet_id = (SELECT id FROM meets WHERE athletic_net_id = '254378')
                    AND a2.school_id IS NOT NULL)
AND c.id IN (SELECT DISTINCT race2.course_id
             FROM results r2
             JOIN races race2 ON r2.race_id = race2.id
             WHERE r2.meet_id = (SELECT id FROM meets WHERE athletic_net_id = '254378'))
AND (12 - (a.grad_year - m.season_year)) BETWEEN 9 AND 12
ORDER BY a.school_id, c.id, a.gender, (12 - (a.grad_year - m.season_year)), r.time_cs;

SELECT 'Step 3 complete!' AS status;
