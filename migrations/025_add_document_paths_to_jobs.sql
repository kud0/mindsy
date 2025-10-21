-- Migration: Add document paths storage to jobs table
-- Description: Enables storing uploaded document file paths for display in Files tab
-- Date: 2025-10-21

-- ============================================================================
-- ALTER TABLE: jobs
-- Add document_paths JSONB column to store array of uploaded document paths
-- ============================================================================

-- Add column for document file paths
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS document_paths JSONB DEFAULT NULL;

-- Add index for querying jobs with documents
CREATE INDEX IF NOT EXISTS idx_jobs_document_paths
  ON jobs USING gin(document_paths)
  WHERE document_paths IS NOT NULL;

-- ============================================================================
-- UPDATE CONSTRAINT: Support document uploads
-- ============================================================================

-- Drop old constraint that only checked audio_file_path OR youtube_url
ALTER TABLE jobs
  DROP CONSTRAINT IF EXISTS at_least_one_file_required;

-- Add updated constraint that includes document_paths
-- Note: youtube_url column doesn't exist yet, so only check audio_file_path and document_paths
ALTER TABLE jobs
  ADD CONSTRAINT at_least_one_file_required CHECK (
    audio_file_path IS NOT NULL OR
    document_paths IS NOT NULL
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN jobs.document_paths IS 'Array of uploaded document file paths in Supabase Storage (e.g., ["user123/123_doc0_file.pdf", "user123/123_doc1_file.docx"])';

COMMENT ON CONSTRAINT at_least_one_file_required ON jobs IS
  'Ensures at least one input source is provided: audio file, YouTube URL, or document paths';

-- ============================================================================
-- DOWN MIGRATION (for rollback)
-- ============================================================================

-- To rollback this migration, run:
-- ALTER TABLE jobs DROP CONSTRAINT IF EXISTS at_least_one_file_required;
-- ALTER TABLE jobs ADD CONSTRAINT at_least_one_file_required CHECK (audio_file_path IS NOT NULL);
-- DROP INDEX IF EXISTS idx_jobs_document_paths;
-- ALTER TABLE jobs DROP COLUMN IF EXISTS document_paths;
