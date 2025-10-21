-- Migration: 029_simple_fix_constraint.sql
-- Purpose: Delete invalid jobs and add constraint to ensure at least one file exists
-- Date: 2025-10-21

-- Step 1: Delete all invalid jobs (no audio file AND no documents)
DELETE FROM jobs
WHERE audio_file_path IS NULL
  AND (document_paths IS NULL OR document_paths = '[]'::jsonb OR document_paths = 'null'::jsonb);

-- Step 2: Drop existing constraint if it exists
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS at_least_one_file_required;

-- Step 3: Add constraint to ensure at least one file exists
ALTER TABLE jobs ADD CONSTRAINT at_least_one_file_required CHECK (
  audio_file_path IS NOT NULL OR
  (document_paths IS NOT NULL AND document_paths != '[]'::jsonb AND document_paths != 'null'::jsonb)
);

-- Step 4: Verify - should return 0 invalid jobs
SELECT COUNT(*) as remaining_invalid_jobs
FROM jobs
WHERE audio_file_path IS NULL
  AND (document_paths IS NULL OR document_paths = '[]'::jsonb OR document_paths = 'null'::jsonb);

-- Success message
COMMENT ON CONSTRAINT at_least_one_file_required ON jobs IS
  'Ensures every job has at least one file (audio or documents). Added 2025-10-21.';
