-- Migration: Add course metadata fields
-- Description: Add type_of_study and year to courses table for better AI folder generation
-- Phase: 2A - Course Discovery + Templates Enhancement

-- Add type_of_study column to courses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'type_of_study'
  ) THEN
    ALTER TABLE courses ADD COLUMN type_of_study TEXT;
  END IF;
END $$;

-- Add year column to courses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'year'
  ) THEN
    ALTER TABLE courses ADD COLUMN year TEXT;
  END IF;
END $$;

-- Add index for type_of_study for filtering
CREATE INDEX IF NOT EXISTS idx_courses_type_of_study ON courses(type_of_study);

-- Add comments
COMMENT ON COLUMN courses.type_of_study IS 'Type of educational institution (e.g., University, Professional School, Online Course, Bootcamp)';
COMMENT ON COLUMN courses.year IS 'Academic year or term (e.g., 2024, Fall 2024) - optional';
