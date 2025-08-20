-- Create storage buckets for Cornell Summary AI
-- Run this in the Supabase SQL Editor

-- Create the user-uploads bucket for MP3 and PDF files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user-uploads', 'user-uploads', false);

-- Create the generated-notes bucket for output PDFs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('generated-notes', 'generated-notes', false);

-- Storage policies for user-uploads bucket
-- Allow users to upload to their own folder
CREATE POLICY "Users can upload to own folder" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'user-uploads' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Allow users to view their own uploads
CREATE POLICY "Users can view own uploads" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'user-uploads' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own uploads" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'user-uploads' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Storage policies for generated-notes bucket
-- Allow users to view their own generated notes
CREATE POLICY "Users can view own generated notes" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'generated-notes' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Note: Only the backend/API should be able to write to generated-notes bucket
-- So we don't create an INSERT policy for users 