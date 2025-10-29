-- Fix athlete slug generation to include school name to prevent collisions
-- This addresses the issue where athletes from different schools with the same name and grad year
-- were causing unique constraint violations

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS athlete_slug_trigger ON athletes;
DROP FUNCTION IF EXISTS generate_athlete_slug();

-- Create new slug generation function that includes school name
CREATE OR REPLACE FUNCTION generate_athlete_slug()
RETURNS TRIGGER AS $$
DECLARE
  school_slug TEXT;
BEGIN
  -- Get the school's name and slugify it
  SELECT lower(regexp_replace(
    COALESCE(name, ''),
    '[^a-z0-9]+', '-', 'gi'
  ))
  INTO school_slug
  FROM schools
  WHERE id = NEW.school_id;

  -- Generate slug: {first_name}-{last_name}-{school_slug}-{grad_year}
  NEW.slug := lower(regexp_replace(
    COALESCE(NEW.first_name, '') || '-' ||
    COALESCE(NEW.last_name, '') || '-' ||
    COALESCE(school_slug, 'unknown') || '-' ||
    NEW.grad_year,
    '[^a-z0-9]+', '-', 'gi'
  ));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER athlete_slug_trigger
BEFORE INSERT OR UPDATE ON athletes
FOR EACH ROW
EXECUTE FUNCTION generate_athlete_slug();

-- Regenerate all existing athlete slugs with the new format
-- This will temporarily disable the unique constraint check
DO $$
DECLARE
  athlete_record RECORD;
  school_slug TEXT;
  new_slug TEXT;
BEGIN
  -- Drop the unique constraint temporarily
  ALTER TABLE athletes DROP CONSTRAINT IF EXISTS athletes_slug_key;

  -- Update all slugs
  FOR athlete_record IN SELECT id, first_name, last_name, grad_year, school_id FROM athletes LOOP
    -- Get school slug
    SELECT lower(regexp_replace(
      COALESCE(name, ''),
      '[^a-z0-9]+', '-', 'gi'
    ))
    INTO school_slug
    FROM schools
    WHERE id = athlete_record.school_id;

    -- Generate new slug
    new_slug := lower(regexp_replace(
      COALESCE(athlete_record.first_name, '') || '-' ||
      COALESCE(athlete_record.last_name, '') || '-' ||
      COALESCE(school_slug, 'unknown') || '-' ||
      athlete_record.grad_year,
      '[^a-z0-9]+', '-', 'gi'
    ));

    -- Update the athlete
    UPDATE athletes SET slug = new_slug WHERE id = athlete_record.id;
  END LOOP;

  -- Re-add the unique constraint
  ALTER TABLE athletes ADD CONSTRAINT athletes_slug_key UNIQUE (slug);
END $$;

-- Verify the changes
SELECT
  'Total athletes' as metric,
  COUNT(*) as count
FROM athletes
UNION ALL
SELECT
  'Unique slugs' as metric,
  COUNT(DISTINCT slug) as count
FROM athletes;
