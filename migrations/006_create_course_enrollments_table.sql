-- Migration: Create course_enrollments table
-- Description: Track student enrollment in courses
-- Phase: 2A - Course Discovery + Templates

-- Create course_enrollments table
CREATE TABLE IF NOT EXISTS course_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,               -- Allow soft delete (unenroll)

  -- Prevent duplicate enrollments
  CONSTRAINT unique_enrollment UNIQUE(user_id, course_id)
);

-- Add indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_active ON course_enrollments(is_active) WHERE is_active = TRUE;

-- Enable Row Level Security
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view enrollments for courses they're in (to see classmates)
CREATE POLICY "Users can view enrollments in their courses"
  ON course_enrollments FOR SELECT
  TO authenticated
  USING (
    -- User can see their own enrollments
    auth.uid() = user_id
    OR
    -- User can see other enrollments in courses they're enrolled in
    EXISTS (
      SELECT 1 FROM course_enrollments AS my_enrollment
      WHERE my_enrollment.user_id = auth.uid()
        AND my_enrollment.course_id = course_enrollments.course_id
        AND my_enrollment.is_active = TRUE
    )
  );

-- Users can enroll themselves in courses
CREATE POLICY "Users can enroll themselves in courses"
  ON course_enrollments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own enrollments (to unenroll)
CREATE POLICY "Users can update their own enrollments"
  ON course_enrollments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own enrollments
CREATE POLICY "Users can delete their own enrollments"
  ON course_enrollments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to notify users when someone joins their course
CREATE OR REPLACE FUNCTION notify_course_enrollment()
RETURNS TRIGGER AS $$
DECLARE
  course_record RECORD;
  enrollee_name TEXT;
BEGIN
  -- Get course details
  SELECT course_code, course_name, institution
  INTO course_record
  FROM courses
  WHERE id = NEW.course_id;

  -- Get enrollee name
  SELECT COALESCE(full_name, email) INTO enrollee_name
  FROM profiles
  WHERE id = NEW.user_id;

  -- Create notifications for existing course members
  INSERT INTO notifications (user_id, type, title, message, related_id, related_user_id, action_url)
  SELECT
    ce.user_id,
    'course_join',
    'New Classmate',
    enrollee_name || ' joined ' || course_record.course_code || ' at ' || course_record.institution,
    NEW.course_id,
    NEW.user_id,
    '/dashboard/courses/' || NEW.course_id::TEXT
  FROM course_enrollments ce
  WHERE ce.course_id = NEW.course_id
    AND ce.user_id != NEW.user_id
    AND ce.is_active = TRUE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for enrollment notifications
CREATE TRIGGER on_course_enrollment
  AFTER INSERT ON course_enrollments
  FOR EACH ROW
  WHEN (NEW.is_active = TRUE)
  EXECUTE FUNCTION notify_course_enrollment();

-- Add comments for documentation
COMMENT ON TABLE course_enrollments IS 'Tracks student enrollment in courses';
COMMENT ON COLUMN course_enrollments.is_active IS 'FALSE when user unenrolls (soft delete)';
