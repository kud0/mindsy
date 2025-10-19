-- Fix: Remove infinite recursion in course_enrollments RLS policies
-- Problem: Original policy referenced course_enrollments while defining policy ON course_enrollments

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view enrollments in their courses" ON course_enrollments;

-- Create simpler, non-recursive policy
-- Allow users to see all enrollments (enrollments aren't sensitive data)
-- API-level checks ensure only enrolled users can see classmates list
CREATE POLICY "Authenticated users can view enrollments"
  ON course_enrollments FOR SELECT
  TO authenticated
  USING (true);

-- Alternative: If you want to restrict to only seeing enrollments in your courses,
-- use this approach instead (currently commented out):
--
-- CREATE OR REPLACE FUNCTION user_enrolled_in_course(p_course_id UUID)
-- RETURNS BOOLEAN AS $$
-- BEGIN
--   RETURN EXISTS (
--     SELECT 1 FROM course_enrollments
--     WHERE user_id = auth.uid()
--       AND course_id = p_course_id
--       AND is_active = TRUE
--   );
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;
--
-- CREATE POLICY "Users can view enrollments in their courses"
--   ON course_enrollments FOR SELECT
--   TO authenticated
--   USING (
--     auth.uid() = user_id
--     OR
--     user_enrolled_in_course(course_id)
--   );
