-- Migration: Update jobs table constraint to support document uploads
-- Description: Fixes constraint to accept document_paths as valid input source
-- Depends on: 025_add_document_paths_to_jobs.sql (adds document_paths column)
-- Date: 2025-10-21

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

COMMENT ON CONSTRAINT at_least_one_file_required ON jobs IS
  'Ensures at least one input source is provided: audio file, YouTube URL, or document paths';

-- ============================================================================
-- DOWN MIGRATION (for rollback)
-- ============================================================================

-- To rollback this migration, run:
-- ALTER TABLE jobs DROP CONSTRAINT IF EXISTS at_least_one_file_required;
-- ALTER TABLE jobs ADD CONSTRAINT at_least_one_file_required CHECK (audio_file_path IS NOT NULL);
