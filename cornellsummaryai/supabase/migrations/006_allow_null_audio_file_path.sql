-- Migration: Allow NULL audio_file_path for document-only uploads
-- Date: 2025-08-10
-- Description: Modify the jobs table to allow NULL values for audio_file_path 
--              to support document-only Mindsy Notes generation

-- Drop the NOT NULL constraint from audio_file_path column
ALTER TABLE public.jobs ALTER COLUMN audio_file_path DROP NOT NULL;

-- Add a check constraint to ensure at least one file type is provided
-- Either audio_file_path OR pdf_file_path must be provided
ALTER TABLE public.jobs 
ADD CONSTRAINT at_least_one_file_required 
CHECK (audio_file_path IS NOT NULL OR pdf_file_path IS NOT NULL);

-- Add comment explaining the change
COMMENT ON COLUMN public.jobs.audio_file_path IS 'Path to audio file in storage. Can be NULL for document-only uploads.';
COMMENT ON CONSTRAINT at_least_one_file_required ON public.jobs IS 'Ensures at least one input file (audio or document) is provided for processing.';