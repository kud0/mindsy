-- Add course_name and course_url columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN course_name TEXT,
ADD COLUMN course_url TEXT;

-- These columns will store the course information for each user
-- Both are optional (nullable) fields 