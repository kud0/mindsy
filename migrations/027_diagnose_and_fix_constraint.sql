-- Migration: Diagnose and fix jobs constraint
-- Description: Check current constraint and force update
-- Date: 2025-10-21

-- ============================================================================
-- STEP 1: DIAGNOSE - See what the current constraint is
-- ============================================================================

-- Run this first to see what constraint exists:
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'jobs'::regclass
  AND conname = 'at_least_one_file_required';

-- ============================================================================
-- STEP 2: FIX - Force drop and recreate constraint
-- ============================================================================

-- Drop the constraint (even if it doesn't exist)
ALTER TABLE jobs
  DROP CONSTRAINT IF EXISTS at_least_one_file_required;

-- Add the correct constraint (without youtube_url since that column doesn't exist yet)
ALTER TABLE jobs
  ADD CONSTRAINT at_least_one_file_required CHECK (
    audio_file_path IS NOT NULL OR
    document_paths IS NOT NULL
  );

-- ============================================================================
-- STEP 3: VERIFY - Confirm the new constraint is correct
-- ============================================================================

-- Run this to verify the fix worked:
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'jobs'::regclass
  AND conname = 'at_least_one_file_required';

-- You should see:
-- CHECK (((audio_file_path IS NOT NULL) OR (document_paths IS NOT NULL)))
-- Note: youtube_url excluded because that column doesn't exist yet
