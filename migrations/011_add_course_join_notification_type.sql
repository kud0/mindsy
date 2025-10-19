-- Migration: Add course_join notification type
-- Description: Allow notifications when users join courses
-- Fixes: enrollment error with "notifications_type_check" constraint

-- Update the notifications type constraint to include course_join
DO $$
BEGIN
  -- Drop old constraint
  ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

  -- Add updated constraint with course_join
  ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
    CHECK (type IN (
      'friend_request',
      'friend_accepted',
      'share',
      'achievement',
      'system',
      'course_join'  -- Added for course enrollment notifications
    ));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON CONSTRAINT notifications_type_check ON notifications IS 'Allowed notification types: friend_request, friend_accepted, share, achievement, system, course_join';
