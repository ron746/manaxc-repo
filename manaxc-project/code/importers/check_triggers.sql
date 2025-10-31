-- Check trigger status for results table
SELECT
    tgname as trigger_name,
    CASE
        WHEN tgenabled = 'O' THEN 'ENABLED'
        WHEN tgenabled = 'D' THEN 'DISABLED'
        ELSE tgenabled::text
    END as status
FROM pg_trigger
WHERE tgrelid = 'results'::regclass
AND tgname NOT LIKE 'RI_%'  -- Exclude system triggers
ORDER BY tgname;
