-- Fix audio_file_path constraint to allow document-only uploads
-- Run this directly in Supabase SQL editor or via psql

-- 1. Drop the NOT NULL constraint from audio_file_path column
ALTER TABLE public.jobs ALTER COLUMN audio_file_path DROP NOT NULL;

-- 2. Add a check constraint to ensure at least one file type is provided
ALTER TABLE public.jobs 
ADD CONSTRAINT at_least_one_file_required 
CHECK (audio_file_path IS NOT NULL OR pdf_file_path IS NOT NULL);

-- 3. Add helpful comments
COMMENT ON COLUMN public.jobs.audio_file_path IS 'Path to audio file in storage. Can be NULL for document-only uploads.';
COMMENT ON CONSTRAINT at_least_one_file_required ON public.jobs IS 'Ensures at least one input file (audio or document) is provided for processing.';

-- 4. Verify the change
SELECT 
    column_name, 
    is_nullable, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'jobs' 
AND column_name = 'audio_file_path';

-- 5. Show the new constraint
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conname = 'at_least_one_file_required';