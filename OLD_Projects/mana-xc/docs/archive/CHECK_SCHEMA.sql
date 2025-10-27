-- Quick check of existing table schemas
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name IN ('courses', 'venues', 'athletes', 'schools', 'meets', 'races', 'results')
ORDER BY table_name, ordinal_position;
