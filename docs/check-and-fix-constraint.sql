-- ============================================================================
-- DIAGNOSIS: Check current constraint on jobs table
-- ============================================================================
-- Run this in Supabase SQL Editor to diagnose the issue

-- 1. Check all constraints on jobs table
SELECT
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'jobs' AND table_schema = 'public';

-- 2. Check the exact CHECK constraint definition
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = con.connamespace
WHERE rel.relname = 'jobs'
  AND nsp.nspname = 'public'
  AND con.contype = 'c';  -- c = check constraint

-- 3. Check what columns actually exist in jobs table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'jobs' AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================================================
-- FIX: Apply migration 025 manually if it wasn't applied
-- ============================================================================

-- Drop old constraint if exists
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS at_least_one_file_required;

-- Ensure document_paths column exists
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS document_paths JSONB DEFAULT NULL;

-- Add updated constraint that works with documents
ALTER TABLE jobs ADD CONSTRAINT at_least_one_file_required CHECK (
  audio_file_path IS NOT NULL OR
  youtube_url IS NOT NULL OR
  (document_paths IS NOT NULL AND jsonb_array_length(document_paths) > 0)
);

-- Add index for document paths
CREATE INDEX IF NOT EXISTS idx_jobs_document_paths
  ON jobs USING gin(document_paths)
  WHERE document_paths IS NOT NULL;

-- Add comment
COMMENT ON CONSTRAINT at_least_one_file_required ON jobs IS
  'Ensures at least one input source is provided: audio file, YouTube URL, or non-empty document paths array';

-- ============================================================================
-- TEST: Verify the fix works
-- ============================================================================

-- This should FAIL (no files provided)
-- INSERT INTO jobs (user_id, lecture_title, status)
-- VALUES ('test-user-id', 'Test Lecture', 'uploading');

-- This should SUCCEED (document_paths with array)
-- INSERT INTO jobs (user_id, lecture_title, status, document_paths)
-- VALUES ('test-user-id', 'Test Lecture', 'uploading', '["path/to/doc.pdf"]'::jsonb);
