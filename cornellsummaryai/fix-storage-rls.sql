-- Fix Storage RLS Policy Violation
-- This SQL script fixes the Row Level Security policies for Supabase storage
-- Run this in the Supabase SQL Editor

-- First, ensure RLS is enabled on storage.objects
ALTER TABLE IF EXISTS storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own generated notes" ON storage.objects;

-- Recreate storage policies with proper authentication checks
-- Policy for uploading files to user-uploads bucket
CREATE POLICY "Users can upload to own folder" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'user-uploads' 
        AND auth.uid() IS NOT NULL
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Policy for viewing files in user-uploads bucket
CREATE POLICY "Users can view own uploads" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'user-uploads' 
        AND auth.uid() IS NOT NULL
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Policy for deleting files in user-uploads bucket
CREATE POLICY "Users can delete own uploads" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'user-uploads' 
        AND auth.uid() IS NOT NULL
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Policy for viewing generated notes
CREATE POLICY "Users can view own generated notes" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'generated-notes' 
        AND auth.uid() IS NOT NULL
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Allow service role to insert into generated-notes (for backend API)
CREATE POLICY "Service role can insert generated notes" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'generated-notes'
        AND auth.role() = 'service_role'
    );

-- Additional debugging: Create a more permissive temporary policy if needed
-- Uncomment this ONLY for debugging, then remove it once the issue is fixed
-- CREATE POLICY "Temporary debug upload policy" ON storage.objects
--     FOR INSERT WITH CHECK (
--         bucket_id = 'user-uploads' 
--         AND auth.uid() IS NOT NULL
--     );

-- Verify that the buckets exist
DO $$
BEGIN
    -- Check if user-uploads bucket exists
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'user-uploads') THEN
        INSERT INTO storage.buckets (id, name, public) 
        VALUES ('user-uploads', 'user-uploads', false);
        RAISE NOTICE 'Created user-uploads bucket';
    ELSE
        RAISE NOTICE 'user-uploads bucket already exists';
    END IF;

    -- Check if generated-notes bucket exists
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'generated-notes') THEN
        INSERT INTO storage.buckets (id, name, public) 
        VALUES ('generated-notes', 'generated-notes', false);
        RAISE NOTICE 'Created generated-notes bucket';
    ELSE
        RAISE NOTICE 'generated-notes bucket already exists';
    END IF;
END $$;

-- Show current policies for verification
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'objects' 
    AND schemaname = 'storage'
ORDER BY policyname;