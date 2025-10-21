-- Migration: Add Deadline Support to Study Sessions
-- Description: Track deadlines (essays, exams, assignments) linked to courses
-- Date: 2025-10-21
-- Feature: Active Course Widget - Upcoming Deadlines

-- ============================================================================
-- MODIFY: study_sessions table
-- Add course/folder references and deadline tracking
-- ============================================================================

-- Add course_id reference (if doesn't exist)
-- Links study session to a specific course
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'study_sessions' AND column_name = 'course_id'
  ) THEN
    ALTER TABLE study_sessions
    ADD COLUMN course_id UUID REFERENCES courses(id) ON DELETE SET NULL;

    -- Create index for course queries
    CREATE INDEX IF NOT EXISTS idx_study_sessions_course_id
    ON study_sessions(course_id);
  END IF;
END $$;

-- Add deadline type column
-- Specifies the type of deadline (essay, exam, assignment, quiz, project)
ALTER TABLE study_sessions
ADD COLUMN IF NOT EXISTS deadline_type VARCHAR(50)
CHECK (deadline_type IN ('essay', 'exam', 'assignment', 'quiz', 'project', 'presentation', 'lab', 'other'));

-- Add is_deadline flag
-- Quick boolean check to identify deadline sessions
ALTER TABLE study_sessions
ADD COLUMN IF NOT EXISTS is_deadline BOOLEAN DEFAULT false;

-- Add priority level for deadlines
ALTER TABLE study_sessions
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium'
CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- Add completion percentage for tracking partial work
ALTER TABLE study_sessions
ADD COLUMN IF NOT EXISTS completion_percentage INTEGER DEFAULT 0
CHECK (completion_percentage >= 0 AND completion_percentage <= 100);

-- Comments for documentation
COMMENT ON COLUMN study_sessions.course_id IS 'Course this session belongs to (for deadline tracking)';
COMMENT ON COLUMN study_sessions.deadline_type IS 'Type of deadline: essay, exam, assignment, quiz, project, etc.';
COMMENT ON COLUMN study_sessions.is_deadline IS 'True if this session represents an upcoming deadline';
COMMENT ON COLUMN study_sessions.priority IS 'Deadline priority: low, medium, high, urgent';
COMMENT ON COLUMN study_sessions.completion_percentage IS 'Progress on deadline task (0-100%)';

-- ============================================================================
-- INDEXES: Fast deadline queries
-- ============================================================================

-- Primary deadline index: Find user's upcoming deadlines for specific courses
CREATE INDEX IF NOT EXISTS idx_deadlines_user_course
ON study_sessions(user_id, course_id, is_deadline, start_time)
WHERE is_deadline = true;

-- Deadline priority index: Find high-priority upcoming deadlines
CREATE INDEX IF NOT EXISTS idx_deadlines_priority
ON study_sessions(user_id, priority, start_time)
WHERE is_deadline = true;

-- Incomplete deadlines index: Find pending work
CREATE INDEX IF NOT EXISTS idx_deadlines_incomplete
ON study_sessions(user_id, completion_percentage, start_time)
WHERE is_deadline = true AND completed = false;

-- Deadline type index: Find specific types (e.g., all exams)
CREATE INDEX IF NOT EXISTS idx_deadlines_type
ON study_sessions(user_id, deadline_type, start_time)
WHERE is_deadline = true;

-- ============================================================================
-- HELPER FUNCTION: Get upcoming deadlines
-- Returns deadlines for a user, optionally filtered by course
-- ============================================================================

CREATE OR REPLACE FUNCTION get_upcoming_deadlines(
  p_user_id UUID,
  p_course_id UUID DEFAULT NULL,
  p_days_ahead INTEGER DEFAULT 30,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  session_id UUID,
  course_id UUID,
  course_code TEXT,
  course_name TEXT,
  title TEXT,
  deadline_type VARCHAR(50),
  priority VARCHAR(20),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  days_until INTEGER,
  completion_percentage INTEGER,
  is_completed BOOLEAN,
  user_folder_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ss.id as session_id,
    ss.course_id,
    c.course_code,
    c.course_name,
    ss.title,
    ss.deadline_type,
    ss.priority,
    ss.start_time,
    ss.end_time,
    EXTRACT(DAY FROM (ss.start_time - NOW()))::INTEGER as days_until,
    ss.completion_percentage,
    ss.completed as is_completed,
    ss.user_folder_id
  FROM study_sessions ss
  LEFT JOIN courses c ON c.id = ss.course_id
  WHERE ss.user_id = p_user_id
    AND ss.is_deadline = true
    AND ss.start_time >= NOW()
    AND ss.start_time <= NOW() + (p_days_ahead || ' days')::INTERVAL
    AND (p_course_id IS NULL OR ss.course_id = p_course_id)
  ORDER BY
    CASE ss.priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
    END,
    ss.start_time ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_upcoming_deadlines IS 'Returns upcoming deadlines sorted by priority and date';

-- ============================================================================
-- HELPER FUNCTION: Get overdue deadlines
-- Returns missed deadlines that are not yet completed
-- ============================================================================

CREATE OR REPLACE FUNCTION get_overdue_deadlines(
  p_user_id UUID,
  p_course_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  session_id UUID,
  course_id UUID,
  course_code TEXT,
  course_name TEXT,
  title TEXT,
  deadline_type VARCHAR(50),
  priority VARCHAR(20),
  start_time TIMESTAMPTZ,
  days_overdue INTEGER,
  completion_percentage INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ss.id as session_id,
    ss.course_id,
    c.course_code,
    c.course_name,
    ss.title,
    ss.deadline_type,
    ss.priority,
    ss.start_time,
    EXTRACT(DAY FROM (NOW() - ss.start_time))::INTEGER as days_overdue,
    ss.completion_percentage
  FROM study_sessions ss
  LEFT JOIN courses c ON c.id = ss.course_id
  WHERE ss.user_id = p_user_id
    AND ss.is_deadline = true
    AND ss.start_time < NOW()
    AND ss.completed = false
    AND (p_course_id IS NULL OR ss.course_id = p_course_id)
  ORDER BY ss.start_time ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_overdue_deadlines IS 'Returns overdue incomplete deadlines';

-- ============================================================================
-- HELPER FUNCTION: Get deadline statistics
-- Returns summary stats for a user's deadlines
-- ============================================================================

CREATE OR REPLACE FUNCTION get_deadline_stats(
  p_user_id UUID,
  p_course_id UUID DEFAULT NULL
)
RETURNS TABLE (
  total_upcoming INTEGER,
  total_overdue INTEGER,
  urgent_count INTEGER,
  high_priority_count INTEGER,
  avg_completion_pct NUMERIC,
  next_deadline_days INTEGER,
  next_deadline_title TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Upcoming deadlines (next 30 days)
    (SELECT COUNT(*)::INTEGER
     FROM study_sessions
     WHERE user_id = p_user_id
       AND is_deadline = true
       AND start_time >= NOW()
       AND start_time <= NOW() + INTERVAL '30 days'
       AND (p_course_id IS NULL OR course_id = p_course_id)
    ) as total_upcoming,

    -- Overdue incomplete deadlines
    (SELECT COUNT(*)::INTEGER
     FROM study_sessions
     WHERE user_id = p_user_id
       AND is_deadline = true
       AND start_time < NOW()
       AND completed = false
       AND (p_course_id IS NULL OR course_id = p_course_id)
    ) as total_overdue,

    -- Urgent upcoming deadlines
    (SELECT COUNT(*)::INTEGER
     FROM study_sessions
     WHERE user_id = p_user_id
       AND is_deadline = true
       AND priority = 'urgent'
       AND start_time >= NOW()
       AND (p_course_id IS NULL OR course_id = p_course_id)
    ) as urgent_count,

    -- High priority upcoming deadlines
    (SELECT COUNT(*)::INTEGER
     FROM study_sessions
     WHERE user_id = p_user_id
       AND is_deadline = true
       AND priority = 'high'
       AND start_time >= NOW()
       AND (p_course_id IS NULL OR course_id = p_course_id)
    ) as high_priority_count,

    -- Average completion percentage
    (SELECT COALESCE(AVG(completion_percentage), 0)::NUMERIC(5,2)
     FROM study_sessions
     WHERE user_id = p_user_id
       AND is_deadline = true
       AND completed = false
       AND (p_course_id IS NULL OR course_id = p_course_id)
    ) as avg_completion_pct,

    -- Next upcoming deadline (days)
    (SELECT EXTRACT(DAY FROM (MIN(start_time) - NOW()))::INTEGER
     FROM study_sessions
     WHERE user_id = p_user_id
       AND is_deadline = true
       AND start_time >= NOW()
       AND (p_course_id IS NULL OR course_id = p_course_id)
    ) as next_deadline_days,

    -- Next upcoming deadline title
    (SELECT title
     FROM study_sessions
     WHERE user_id = p_user_id
       AND is_deadline = true
       AND start_time >= NOW()
       AND (p_course_id IS NULL OR course_id = p_course_id)
     ORDER BY start_time ASC
     LIMIT 1
    ) as next_deadline_title;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_deadline_stats IS 'Returns summary statistics for user deadlines';

-- ============================================================================
-- HELPER FUNCTION: Auto-link deadlines to active courses
-- Updates existing deadlines to link them to courses (migration helper)
-- ============================================================================

CREATE OR REPLACE FUNCTION link_deadlines_to_courses(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER := 0;
BEGIN
  -- Link deadlines to courses based on user_folder_id
  UPDATE study_sessions ss
  SET course_id = uf.course_id
  FROM user_folders uf
  WHERE ss.user_id = p_user_id
    AND ss.is_deadline = true
    AND ss.course_id IS NULL
    AND ss.user_folder_id = uf.id
    AND uf.course_id IS NOT NULL;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION link_deadlines_to_courses IS 'Helper to link existing deadlines to courses via folders';

-- ============================================================================
-- RLS UPDATES: Ensure proper access control
-- ============================================================================

-- Note: study_sessions table should already have RLS enabled
-- Verify and create policies if they don't exist

DO $$
BEGIN
  -- Enable RLS if not already enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'study_sessions'
      AND rowsecurity = true
  ) THEN
    ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own study sessions" ON study_sessions;
DROP POLICY IF EXISTS "Users can create their own study sessions" ON study_sessions;
DROP POLICY IF EXISTS "Users can update their own study sessions" ON study_sessions;
DROP POLICY IF EXISTS "Users can delete their own study sessions" ON study_sessions;

-- Policy: Users can view their own sessions
CREATE POLICY "Users can view their own study sessions"
  ON study_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can create their own sessions
CREATE POLICY "Users can create their own study sessions"
  ON study_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own sessions
CREATE POLICY "Users can update their own study sessions"
  ON study_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own sessions
CREATE POLICY "Users can delete their own study sessions"
  ON study_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================

-- This migration adds:
-- 1. course_id column to link sessions to courses
-- 2. deadline_type to categorize deadlines (essay, exam, assignment, etc.)
-- 3. is_deadline flag for quick filtering
-- 4. priority levels (low, medium, high, urgent)
-- 5. completion_percentage to track progress
-- 6. Optimized indexes for deadline queries
-- 7. Helper functions for getting upcoming/overdue deadlines and stats

-- Usage examples:
-- SELECT * FROM get_upcoming_deadlines(auth.uid(), NULL, 14, 5);
-- SELECT * FROM get_overdue_deadlines(auth.uid());
-- SELECT * FROM get_deadline_stats(auth.uid());
-- SELECT link_deadlines_to_courses(auth.uid());
