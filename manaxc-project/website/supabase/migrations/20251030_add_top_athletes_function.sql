-- Function to get top N athletes per school for race projections
-- This is much more efficient than loading all athletes and filtering client-side

CREATE OR REPLACE FUNCTION get_top_athletes_per_school(
  p_race_type text,
  p_gender text DEFAULT NULL,
  p_cif_section text DEFAULT NULL,
  p_cif_divisions text[] DEFAULT NULL,
  p_league text DEFAULT NULL,
  p_subleague text DEFAULT NULL,
  p_school_ids uuid[] DEFAULT NULL,
  p_season_years int[] DEFAULT NULL,
  p_is_alltime boolean DEFAULT false,
  p_top_n int DEFAULT 7
)
RETURNS TABLE (
  athlete_id uuid,
  athlete_name text,
  athlete_gender text,
  school_id uuid,
  school_name text,
  school_cif_section text,
  school_cif_division text,
  school_league text,
  school_subleague text,
  season_year int,
  season_best_cs int,
  normalized_time_cs int,
  race_distance_meters int,
  row_num bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered_schools AS (
    SELECT s.id, s.name, s.cif_section, s.cif_division, s.league, s.subleague
    FROM schools s
    WHERE
      CASE p_race_type
        WHEN 'california' THEN s.cif_section IS NOT NULL
        WHEN 'section' THEN s.cif_section = p_cif_section
        WHEN 'league' THEN
          CASE
            WHEN p_subleague IS NOT NULL THEN s.subleague = p_subleague
            WHEN p_league IS NOT NULL THEN s.league = p_league
            ELSE false
          END
        WHEN 'custom' THEN s.id = ANY(p_school_ids)
        ELSE false
      END
      AND (p_cif_divisions IS NULL OR s.cif_division = ANY(p_cif_divisions))
  ),
  ranked_athletes AS (
    SELECT
      abt.athlete_id,
      a.name as athlete_name,
      a.gender as athlete_gender,
      fs.id as school_id,
      fs.name as school_name,
      fs.cif_section as school_cif_section,
      fs.cif_division as school_cif_division,
      fs.league as school_league,
      fs.subleague as school_subleague,
      CASE
        WHEN p_is_alltime THEN abt.season_year
        ELSE abt.season_year
      END as season_year,
      CASE
        WHEN p_is_alltime THEN abt.alltime_best_time_cs
        ELSE abt.season_best_time_cs
      END as season_best_cs,
      CASE
        WHEN p_is_alltime THEN abt.alltime_best_normalized_cs
        ELSE abt.season_best_normalized_cs
      END as normalized_time_cs,
      CASE
        WHEN p_is_alltime THEN abt.alltime_best_race_distance_meters
        ELSE abt.season_best_race_distance_meters
      END as race_distance_meters,
      ROW_NUMBER() OVER (
        PARTITION BY a.school_id, a.gender
        ORDER BY
          CASE
            WHEN p_is_alltime THEN abt.alltime_best_normalized_cs
            ELSE abt.season_best_normalized_cs
          END ASC
      ) as row_num
    FROM athlete_best_times abt
    INNER JOIN athletes a ON a.id = abt.athlete_id
    INNER JOIN filtered_schools fs ON fs.id = a.school_id
    WHERE
      (p_gender IS NULL OR a.gender = p_gender)
      AND (p_season_years IS NULL OR abt.season_year = ANY(p_season_years))
  )
  SELECT * FROM ranked_athletes
  WHERE row_num <= p_top_n
  ORDER BY school_name, athlete_gender, row_num;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_top_athletes_per_school TO anon, authenticated;
