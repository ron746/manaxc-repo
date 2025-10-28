-- Add subleague and cif_division fields to schools table

ALTER TABLE schools
ADD COLUMN IF NOT EXISTS subleague TEXT,
ADD COLUMN IF NOT EXISTS cif_division TEXT;

-- Add indexes for filtering
CREATE INDEX IF NOT EXISTS idx_schools_league ON schools(league);
CREATE INDEX IF NOT EXISTS idx_schools_subleague ON schools(subleague);
CREATE INDEX IF NOT EXISTS idx_schools_cif_division ON schools(cif_division);
