-- Alternative Fix for Storage RLS Policy Violation
-- This approach uses Supabase dashboard's built-in policy management
-- Run this in Supabase SQL Editor with simpler approach

-- First, let's try to create policies without dropping existing ones
-- This should work even with limited permissions

-- Create a more permissive upload policy for user-uploads
CREATE POLICY IF NOT EXISTS "Authenticated users can upload to user-uploads" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'user-uploads' 
        AND auth.uid() IS NOT NULL
    );

-- Create a basic view policy for user-uploads  
CREATE POLICY IF NOT EXISTS "Authenticated users can view in user-uploads" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'user-uploads' 
        AND auth.uid() IS NOT NULL
    );

-- Create view policy for generated-notes
CREATE POLICY IF NOT EXISTS "Authenticated users can view generated-notes" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'generated-notes' 
        AND auth.uid() IS NOT NULL
    );

-- Allow service role full access to generated-notes (for backend)
CREATE POLICY IF NOT EXISTS "Service role full access to generated-notes" ON storage.objects
    FOR ALL USING (
        bucket_id = 'generated-notes'
        AND auth.role() = 'service_role'
    )
    WITH CHECK (
        bucket_id = 'generated-notes'
        AND auth.role() = 'service_role'
    );

-- Verify buckets exist (should not fail even with limited permissions)
SELECT id, name, public FROM storage.buckets WHERE id IN ('user-uploads', 'generated-notes');