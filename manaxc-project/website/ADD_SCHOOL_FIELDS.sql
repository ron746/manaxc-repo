-- Run this in Supabase SQL Editor to add League/Subleague/Division fields to schools

ALTER TABLE schools
ADD COLUMN IF NOT EXISTS subleague TEXT,
ADD COLUMN IF NOT EXISTS cif_division TEXT;

-- Add indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_schools_league ON schools(league);
CREATE INDEX IF NOT EXISTS idx_schools_subleague ON schools(subleague);
CREATE INDEX IF NOT EXISTS idx_schools_cif_division ON schools(cif_division);

-- Verify the changes
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'schools'
AND column_name IN ('league', 'subleague', 'cif_division');
