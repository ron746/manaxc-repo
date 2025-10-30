-- Add result_count column to meets table
-- This stores the total number of results for each meet, avoiding the 1000 row query limit

-- Step 1: Add the column with default value of 0
ALTER TABLE meets
ADD COLUMN result_count INTEGER NOT NULL DEFAULT 0;

-- Step 2: Update all existing meets with their current result counts
UPDATE meets m
SET result_count = (
    SELECT COUNT(*)
    FROM results r
    WHERE r.meet_id = m.id
);

-- Step 3: Create a function to recalculate all meet result counts (for batch operations)
CREATE OR REPLACE FUNCTION recalculate_all_meet_result_counts()
RETURNS TABLE (
    updated_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    UPDATE meets m
    SET result_count = (
        SELECT COUNT(*)
        FROM results r
        WHERE r.meet_id = m.id
    );

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    RETURN QUERY SELECT v_updated_count;
END;
$$;

-- Step 4: Create a trigger to automatically update result_count when results are added/deleted
CREATE OR REPLACE FUNCTION update_meet_result_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE meets
        SET result_count = result_count + 1
        WHERE id = NEW.meet_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE meets
        SET result_count = result_count - 1
        WHERE id = OLD.meet_id;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- If the meet_id changed, update both old and new meets
        IF OLD.meet_id != NEW.meet_id THEN
            UPDATE meets
            SET result_count = result_count - 1
            WHERE id = OLD.meet_id;
            UPDATE meets
            SET result_count = result_count + 1
            WHERE id = NEW.meet_id;
        END IF;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger (but it will be disabled during bulk imports)
CREATE TRIGGER maintain_meet_result_count
AFTER INSERT OR DELETE OR UPDATE ON results
FOR EACH ROW
EXECUTE FUNCTION update_meet_result_count();

-- Step 5: Add index for sorting performance on meets page
CREATE INDEX IF NOT EXISTS idx_meets_result_count ON meets(result_count DESC);

-- Add comment for documentation
COMMENT ON COLUMN meets.result_count IS 'Cached count of results for this meet. Maintained by trigger and batch operations.';
