-- Add cif_section field to schools table

ALTER TABLE schools
ADD COLUMN IF NOT EXISTS cif_section TEXT;

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_schools_cif_section ON schools(cif_section);

-- Add comment
COMMENT ON COLUMN schools.cif_section IS 'CIF Section (e.g., Central Coast Section, Sac-Joaquin Section)';
