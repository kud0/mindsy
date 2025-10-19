-- Migration: Create courses table
-- Description: Course catalog with code, institution, and semester tracking
-- Phase: 2A - Course Discovery + Templates

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_code TEXT NOT NULL,                    -- e.g., "CS 101", "MATH 201"
  course_name TEXT,                             -- e.g., "Introduction to Programming"
  institution TEXT NOT NULL,                    -- e.g., "Stanford University"
  semester TEXT,                                -- e.g., "Fall 2024" (optional)
  description TEXT,                             -- Course description (optional)
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prevent duplicate courses: same code + institution + semester
-- Use unique index instead of constraint to support COALESCE expression
CREATE UNIQUE INDEX unique_course_idx
  ON courses(course_code, institution, COALESCE(semester, ''));

-- Add indexes for fast searching
CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(course_code);
CREATE INDEX IF NOT EXISTS idx_courses_institution ON courses(institution);
CREATE INDEX IF NOT EXISTS idx_courses_semester ON courses(semester);
CREATE INDEX IF NOT EXISTS idx_courses_created_by ON courses(created_by);

-- Enable Row Level Security
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Courses are publicly readable, anyone can create
CREATE POLICY "Courses are viewable by everyone"
  ON courses FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create courses"
  ON courses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Course creators can update their courses"
  ON courses FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_courses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION update_courses_updated_at();

-- Add comments for documentation
COMMENT ON TABLE courses IS 'Course catalog with institution-specific courses';
COMMENT ON COLUMN courses.course_code IS 'Course code (e.g., CS 101, MATH 201)';
COMMENT ON COLUMN courses.institution IS 'Institution name (e.g., Stanford University)';
COMMENT ON COLUMN courses.semester IS 'Optional semester (e.g., Fall 2024)';
