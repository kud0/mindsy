-- Migration: Fix Active Course Logic - Use Folder IDs
-- Description: Replace active_year number with active_folder_id pointing to year/semester folder
-- Date: 2025-10-21
-- Feature: Active Course Widget - Proper Folder Integration

-- ============================================================================
-- MODIFY: course_enrollments table
-- Replace active_year with active_folder_id
-- ============================================================================

-- Add active_folder_id column (points to year/semester parent folder)
ALTER TABLE course_enrollments
ADD COLUMN IF NOT EXISTS active_folder_id UUID REFERENCES user_folders(id) ON DELETE SET NULL;

COMMENT ON COLUMN course_enrollments.active_folder_id IS 'Parent folder representing active year/semester (e.g., "Primer curso", "Year 2")';

-- Drop old active_year column (we'll use folder instead)
-- ALTER TABLE course_enrollments DROP COLUMN IF EXISTS active_year;
-- Actually, keep it for backward compatibility during migration, but make it optional
ALTER TABLE course_enrollments ALTER COLUMN active_year DROP NOT NULL;

-- ============================================================================
-- UPDATE: toggle_active_course function
-- Update to handle active_folder_id
-- ============================================================================

-- Drop the old function first (signature changed)
DROP FUNCTION IF EXISTS toggle_active_course(UUID, UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION toggle_active_course(
  p_user_id UUID,
  p_course_id UUID,
  p_set_active BOOLEAN,
  p_active_folder_id UUID DEFAULT NULL
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

    -- If setting active, require active_folder_id
    IF p_active_folder_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'active_folder_id required when activating course'
      );
    END IF;
  END IF;

  -- Update the enrollment
  UPDATE course_enrollments
  SET
    is_active_course = p_set_active,
    active_folder_id = CASE WHEN p_set_active THEN p_active_folder_id ELSE NULL END
  WHERE user_id = p_user_id AND course_id = p_course_id;

  RETURN jsonb_build_object(
    'success', true,
    'is_active', p_set_active,
    'active_folder_id', p_active_folder_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATE: get_active_courses function
-- Include active_folder_id and folder name
-- ============================================================================

-- Drop the old function first (signature changed)
DROP FUNCTION IF EXISTS get_active_courses(UUID);

CREATE OR REPLACE FUNCTION get_active_courses(p_user_id UUID)
RETURNS TABLE (
  course_id UUID,
  course_code TEXT,
  course_name TEXT,
  institution TEXT,
  active_folder_id UUID,
  active_folder_name TEXT,
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
    ce.active_folder_id,
    uf.folder_name as active_folder_name,
    c.total_years,
    ce.id as enrollment_id
  FROM course_enrollments ce
  JOIN courses c ON c.id = ce.course_id
  LEFT JOIN user_folders uf ON uf.id = ce.active_folder_id
  WHERE ce.user_id = p_user_id
    AND ce.is_active_course = true
    AND ce.is_active = true  -- Also enrolled (not soft-deleted)
  ORDER BY ce.enrolled_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_active_courses IS 'Returns user active courses with folder information';

-- ============================================================================
-- HELPER FUNCTION: Get year/semester folders for a course
-- Returns top-level folders for course (year/semester selection)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_course_year_folders(
  p_user_id UUID,
  p_course_id UUID
)
RETURNS TABLE (
  folder_id UUID,
  folder_name TEXT,
  folder_order INTEGER,
  child_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    uf.id as folder_id,
    uf.folder_name,
    uf.folder_order,
    (SELECT COUNT(*) FROM user_folders WHERE parent_folder_id = uf.id)::INTEGER as child_count
  FROM user_folders uf
  WHERE uf.user_id = p_user_id
    AND uf.course_id = p_course_id
    AND uf.parent_folder_id IS NULL  -- Top-level folders only
  ORDER BY uf.folder_order ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_course_year_folders IS 'Returns top-level folders for year/semester selection';

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================

-- This migration fixes the active course logic:
-- 1. Adds active_folder_id to point to actual year/semester folder
-- 2. Updates toggle_active_course() to require folder_id
-- 3. Updates get_active_courses() to return folder info
-- 4. Adds get_course_year_folders() to fetch selectable folders

-- Migration path for existing data:
-- If you have existing active_year data, you'll need to map it to folders
-- Example: UPDATE course_enrollments SET active_folder_id = (folder matching year)

-- Usage:
-- SELECT * FROM get_course_year_folders(auth.uid(), 'course-uuid');
-- SELECT toggle_active_course(auth.uid(), 'course-uuid', true, 'folder-uuid');
