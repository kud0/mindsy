-- Migration: Add course folder references to jobs and study_sessions
-- This migration adds user_folder_id columns to integrate with the new course folder system

-- Add user_folder_id to jobs table (lectures)
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS user_folder_id UUID REFERENCES user_folders(id) ON DELETE SET NULL;

-- Add user_folder_id to study_sessions table
ALTER TABLE study_sessions
ADD COLUMN IF NOT EXISTS user_folder_id UUID REFERENCES user_folders(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_jobs_user_folder_id ON jobs(user_folder_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_folder_id ON study_sessions(user_folder_id);

-- Note: user_folder_id is nullable to support the hybrid approach
-- Lectures can optionally be assigned to course folders but can also exist independently
