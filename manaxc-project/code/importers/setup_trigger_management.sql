-- ============================================================================
-- Setup Trigger Management for Bulk Imports
-- ============================================================================
-- This SQL creates a helper function that allows Python import scripts to
-- disable/enable triggers during bulk imports for better performance.
--
-- Run this ONCE in Supabase Dashboard > SQL Editor before using the import scripts
-- ============================================================================

-- Create exec_sql function for trigger management
CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

COMMENT ON FUNCTION exec_sql IS 'Executes dynamic SQL. Used by import scripts to manage triggers during bulk imports.';

-- Optional: Create a helper function to get flag counts
CREATE OR REPLACE FUNCTION get_flag_counts()
RETURNS TABLE (
  sb_count BIGINT,
  pr_count BIGINT,
  total_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE is_sb = TRUE) as sb_count,
    COUNT(*) FILTER (WHERE is_pr = TRUE) as pr_count,
    COUNT(*) as total_count
  FROM results;
END;
$$;

COMMENT ON FUNCTION get_flag_counts IS 'Returns counts of SB/PR flags for verification after import';

-- Verify setup
SELECT 'Trigger management setup complete! You can now run import scripts.' as status;
