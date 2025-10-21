-- Migration: Add Active Course Support
-- Description: Enable users to mark up to 2 courses as "active" with year tracking
-- Date: 2025-10-21
-- Feature: Active Course Widget

-- ============================================================================
-- MODIFY: course_enrollments table
-- Add active course tracking with year progression
-- ============================================================================

-- Add is_active column for marking active enrollments
-- Note: This is different from the existing is_active (enrollment status)
-- We'll use a different name to avoid confusion
ALTER TABLE course_enrollments
ADD COLUMN IF NOT EXISTS is_active_course BOOLEAN DEFAULT false;

-- Add current year tracking for multi-year programs
ALTER TABLE course_enrollments
ADD COLUMN IF NOT EXISTS active_year INTEGER DEFAULT 1 CHECK (active_year >= 1);

-- Add comments for clarity
COMMENT ON COLUMN course_enrollments.is_active_course IS 'User-selected active course (max 2 per user)';
COMMENT ON COLUMN course_enrollments.active_year IS 'Current year in multi-year program (e.g., Year 1, Year 2)';

-- ============================================================================
-- MODIFY: courses table
-- Add total years to support multi-year degree programs
-- ============================================================================

ALTER TABLE courses
ADD COLUMN IF NOT EXISTS total_years INTEGER DEFAULT 1 CHECK (total_years >= 1 AND total_years <= 10);

COMMENT ON COLUMN courses.total_years IS 'Total years in program (e.g., 4 for Bachelor, 2 for Master)';

-- ============================================================================
-- INDEXES: Fast queries for active courses
-- ============================================================================

-- Index for finding user's active courses quickly
CREATE INDEX IF NOT EXISTS idx_active_courses_user
ON course_enrollments(user_id, is_active_course)
WHERE is_active_course = true;

-- Composite index for active courses with year
CREATE INDEX IF NOT EXISTS idx_active_courses_user_year
ON course_enrollments(user_id, is_active_course, active_year)
WHERE is_active_course = true;

-- ============================================================================
-- CONSTRAINT: Enforce max 2 active courses per user
-- Using a function + constraint for validation
-- ============================================================================

-- Function to check active course limit
CREATE OR REPLACE FUNCTION check_active_course_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_active_count INTEGER;
BEGIN
  -- Only check if setting to active
  IF NEW.is_active_course = true THEN
    -- Count current active courses for this user (excluding current row on update)
    SELECT COUNT(*) INTO v_active_count
    FROM course_enrollments
    WHERE user_id = NEW.user_id
      AND is_active_course = true
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);

    -- Enforce limit of 2 active courses
    IF v_active_count >= 2 THEN
      RAISE EXCEPTION 'Cannot have more than 2 active courses. Please deactivate another course first.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce limit on insert/update
DROP TRIGGER IF EXISTS enforce_active_course_limit ON course_enrollments;
CREATE TRIGGER enforce_active_course_limit
  BEFORE INSERT OR UPDATE ON course_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION check_active_course_limit();

-- ============================================================================
-- HELPER FUNCTION: Toggle active course status
-- Provides safe way to activate/deactivate courses
-- ============================================================================

CREATE OR REPLACE FUNCTION toggle_active_course(
  p_user_id UUID,
  p_course_id UUID,
  p_set_active BOOLEAN
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_active_count INTEGER;
BEGIN
  -- Check if enrollment exists
  IF NOT EXISTS (
    SELECT 1 FROM course_enrollments
    WHERE user_id = p_user_id AND course_id = p_course_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Enrollment not found'
    );
  END IF;

  -- If activating, check limit
  IF p_set_active = true THEN
    SELECT COUNT(*) INTO v_active_count
    FROM course_enrollments
    WHERE user_id = p_user_id
      AND is_active_course = true
      AND course_id != p_course_id;

    IF v_active_count >= 2 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Maximum 2 active courses allowed'
      );
    END IF;
  END IF;

  -- Update the enrollment
  UPDATE course_enrollments
  SET
    is_active_course = p_set_active,
    active_year = CASE WHEN p_set_active THEN COALESCE(active_year, 1) ELSE active_year END
  WHERE user_id = p_user_id AND course_id = p_course_id;

  RETURN jsonb_build_object(
    'success', true,
    'is_active', p_set_active
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION toggle_active_course IS 'Safely toggle active course status with limit validation';

-- ============================================================================
-- HELPER FUNCTION: Get user's active courses
-- Returns active course info with progress tracking
-- ============================================================================

CREATE OR REPLACE FUNCTION get_active_courses(p_user_id UUID)
RETURNS TABLE (
  course_id UUID,
  course_code TEXT,
  course_name TEXT,
  institution TEXT,
  current_year INTEGER,
  total_years INTEGER,
  enrollment_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id as course_id,
    c.course_code,
    c.course_name,
    c.institution,
    ce.active_year as current_year,
    c.total_years,
    ce.id as enrollment_id
  FROM course_enrollments ce
  JOIN courses c ON c.id = ce.course_id
  WHERE ce.user_id = p_user_id
    AND ce.is_active_course = true
    AND ce.is_active = true  -- Also enrolled (not soft-deleted)
  ORDER BY ce.active_year DESC, c.course_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_active_courses IS 'Returns user active courses with year progression';

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================

-- This migration adds:
-- 1. is_active_course column to mark user's current active courses (max 2)
-- 2. active_year column to track progression in multi-year programs
-- 3. total_years column in courses table for degree programs
-- 4. Trigger-based constraint to enforce 2 active course limit
-- 5. Helper functions for safe course activation and retrieval

-- Usage example:
-- SELECT toggle_active_course(auth.uid(), 'course-uuid', true);
-- SELECT * FROM get_active_courses(auth.uid());
