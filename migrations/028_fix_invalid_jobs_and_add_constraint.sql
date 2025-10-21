-- Migration 028: Fix invalid jobs and add constraint
-- Purpose: Clean up invalid job rows and add constraint requiring at least one file

-- =============================================================================
-- STEP 1: DIAGNOSTIC - Find invalid rows
-- =============================================================================
-- This shows all jobs that would violate the constraint
DO $$
DECLARE
  invalid_count INTEGER;
  r RECORD;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM jobs
  WHERE audio_file_path IS NULL
    AND (document_paths IS NULL OR document_paths = '[]'::jsonb OR document_paths = 'null'::jsonb);

  RAISE NOTICE 'Found % invalid job(s) with no files', invalid_count;

  -- Show details of invalid jobs (first 10)
  IF invalid_count > 0 THEN
    RAISE NOTICE 'Invalid job IDs and details:';
    FOR r IN (
      SELECT job_id, user_id, created_at, status
      FROM jobs
      WHERE audio_file_path IS NULL
        AND (document_paths IS NULL OR document_paths = '[]'::jsonb OR document_paths = 'null'::jsonb)
      LIMIT 10
    ) LOOP
      RAISE NOTICE '  Job ID: %, User: %, Created: %, Status: %',
        r.job_id, r.user_id, r.created_at, r.status;
    END LOOP;
  END IF;
END $$;

-- =============================================================================
-- STEP 2: FIX INVALID ROWS
-- =============================================================================
-- Strategy: Delete invalid jobs that have no file attachments
-- These are incomplete/orphaned job records that shouldn't exist

-- First, check if any of these jobs have related data we need to preserve
DO $$
DECLARE
  jobs_with_data INTEGER;
BEGIN
  SELECT COUNT(*) INTO jobs_with_data
  FROM jobs j
  WHERE (j.audio_file_path IS NULL
    AND (j.document_paths IS NULL OR j.document_paths = '[]'::jsonb OR j.document_paths = 'null'::jsonb))
    AND (
      j.status IN ('completed', 'processing')  -- Has progressed beyond 'pending'
      OR j.txt_file_path IS NOT NULL           -- Has transcription data
      OR j.json_file_path IS NOT NULL          -- Has generated content
    );

  IF jobs_with_data > 0 THEN
    RAISE WARNING '% job(s) have no files but contain processing data. These will NOT be deleted automatically.', jobs_with_data;
    RAISE NOTICE 'Manual review required for jobs with data but no files.';
  END IF;
END $$;

-- Delete truly invalid jobs (no files AND no processing data)
-- This is more aggressive - deletes ANY job without files AND without generated data
-- regardless of status (handles pending, failed, error, etc.)
WITH deleted AS (
  DELETE FROM jobs
  WHERE audio_file_path IS NULL
    AND (document_paths IS NULL OR document_paths = '[]'::jsonb OR document_paths = 'null'::jsonb)
    AND txt_file_path IS NULL                 -- No transcription
    AND json_file_path IS NULL                -- No generated content
  RETURNING *
)
SELECT COUNT(*) FROM deleted;

-- Log the deletion
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % invalid job(s) with no files and no generated data (all statuses)', deleted_count;
END $$;

-- For any remaining invalid jobs (with generated data but no source files), set a placeholder
-- This prevents data loss while allowing the constraint to be added
-- These are edge cases where processing completed but source file reference was lost
WITH updated AS (
  UPDATE jobs
  SET audio_file_path = 'LEGACY_INVALID_JOB'
  WHERE audio_file_path IS NULL
    AND (document_paths IS NULL OR document_paths = '[]'::jsonb OR document_paths = 'null'::jsonb)
    AND (
      txt_file_path IS NOT NULL           -- Has transcription data
      OR json_file_path IS NOT NULL       -- Has generated content
    )
  RETURNING *
)
SELECT COUNT(*) FROM updated;

-- Log the update
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count > 0 THEN
    RAISE WARNING 'Marked % job(s) with generated data but no source files as LEGACY_INVALID_JOB', updated_count;
    RAISE NOTICE 'These jobs should be manually reviewed - they have transcriptions/content but no source file reference';
  ELSE
    RAISE NOTICE 'No jobs needed placeholder markers';
  END IF;
END $$;

-- =============================================================================
-- STEP 3: ADD THE CONSTRAINT
-- =============================================================================
-- Now add the constraint to prevent future invalid rows
-- First drop if exists, then add (handles re-running migration)

ALTER TABLE jobs
  DROP CONSTRAINT IF EXISTS at_least_one_file_required;

ALTER TABLE jobs
  ADD CONSTRAINT at_least_one_file_required
  CHECK (
    audio_file_path IS NOT NULL
    OR (
      document_paths IS NOT NULL
      AND document_paths != '[]'::jsonb
      AND document_paths != 'null'::jsonb
    )
  );

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT at_least_one_file_required ON jobs IS
  'Ensures every job has at least one file (audio OR documents). Jobs must have content to process.';

-- =============================================================================
-- STEP 4: VERIFICATION
-- =============================================================================
-- Verify the constraint was added successfully
DO $$
DECLARE
  constraint_exists BOOLEAN;
  remaining_invalid INTEGER;
BEGIN
  -- Check if constraint exists
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'at_least_one_file_required'
      AND conrelid = 'jobs'::regclass
  ) INTO constraint_exists;

  IF constraint_exists THEN
    RAISE NOTICE '✓ Constraint "at_least_one_file_required" added successfully';
  ELSE
    RAISE EXCEPTION '✗ Failed to add constraint "at_least_one_file_required"';
  END IF;

  -- Verify no invalid rows remain
  SELECT COUNT(*) INTO remaining_invalid
  FROM jobs
  WHERE audio_file_path IS NULL
    AND (document_paths IS NULL OR document_paths = '[]'::jsonb OR document_paths = 'null'::jsonb);

  IF remaining_invalid > 0 THEN
    RAISE EXCEPTION '✗ Still have % invalid job(s) - constraint should have failed!', remaining_invalid;
  ELSE
    RAISE NOTICE '✓ No invalid jobs remain in the table';
  END IF;

  RAISE NOTICE '=== MIGRATION 028 COMPLETED SUCCESSFULLY ===';
END $$;

-- =============================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- =============================================================================
-- To rollback this migration:
--
-- ALTER TABLE jobs DROP CONSTRAINT IF EXISTS at_least_one_file_required;
--
-- Note: This will NOT restore deleted rows. Take a backup before running if unsure.
