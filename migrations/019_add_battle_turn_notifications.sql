-- Add battle turn notification types
-- Enables real-time notifications when it's a player's turn in async battles

-- Update notification type constraint to include battle turn notifications
DO $$
BEGIN
  -- Drop old constraint if exists
  ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

  -- Add new constraint with all notification types including battle turns
  ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
    CHECK (type IN (
      'friend_request',
      'friend_accepted',
      'share',
      'achievement',
      'system',
      'course_join',
      'battle_challenge',
      'battle_result',
      'battle_turn',
      'battle_round_ready'
    ));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Comments
COMMENT ON CONSTRAINT notifications_type_check ON notifications IS
  'Allowed notification types including battle turn notifications for async gameplay';
