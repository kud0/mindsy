-- Check the data type of file_size_mb column
SELECT 
    column_name,
    data_type,
    numeric_precision,
    numeric_scale
FROM information_schema.columns
WHERE table_name = 'jobs' 
AND column_name IN ('duration_minutes', 'file_size_mb');