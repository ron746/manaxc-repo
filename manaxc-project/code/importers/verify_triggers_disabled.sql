-- Verify that triggers are DISABLED and stay disabled
-- Run this in Supabase SQL Editor

-- 1. Check current trigger status
SELECT
    tgname as trigger_name,
    CASE
        WHEN tgenabled = 'O' THEN 'ENABLED'
        WHEN tgenabled = 'D' THEN 'DISABLED'
        ELSE tgenabled::text
    END as status
FROM pg_trigger
WHERE tgrelid = 'results'::regclass
AND tgname NOT LIKE 'RI_%'
ORDER BY tgname;

-- 2. If any show as ENABLED, run this to disable them:
-- ALTER TABLE results DISABLE TRIGGER USER;

-- 3. Verify they are disabled:
-- Run query #1 again to confirm all show DISABLED
