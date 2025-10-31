-- Allow name_1 to be NULL for cases where there's no existing athlete match
-- This handles truly new athletes that need to be created

ALTER TABLE potential_duplicate_athletes
ALTER COLUMN name_1 DROP NOT NULL;

COMMENT ON COLUMN potential_duplicate_athletes.name_1 IS 'Name of existing athlete (from database), NULL if no existing match found';
