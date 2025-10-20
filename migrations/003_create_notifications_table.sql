-- Create notifications table for real-time user notifications
-- Supports friend requests, shares, achievements, and more

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add missing columns if they don't exist (for existing tables)
DO $$
BEGIN
  -- Add related_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'related_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN related_id UUID;
  END IF;

  -- Add related_user_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'related_user_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN related_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Add action_url column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'action_url'
  ) THEN
    ALTER TABLE notifications ADD COLUMN action_url TEXT;
  END IF;

  -- Add read_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'read_at'
  ) THEN
    ALTER TABLE notifications ADD COLUMN read_at TIMESTAMPTZ;
  END IF;

  -- Add metadata column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE notifications ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Update type constraint to include all notification types
DO $$
BEGIN
  -- Drop old constraint if exists
  ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

  -- Add new constraint
  ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
    CHECK (type IN (
      'friend_request',
      'friend_accepted',
      'content_shared',
      'battle_turn',
      'battle_round_ready',
      'battle_accepted',
      'battle_declined',
      'battle_complete',
      'achievement',
      'system'
    ));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_related ON notifications(related_id);

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;

-- Policy: Users can only view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
  ON notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: System can insert notifications (no RLS for INSERT)
-- This allows API to create notifications for users
CREATE POLICY "System can create notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (true);

-- Function to automatically mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.read = true AND OLD.read = false THEN
    NEW.read_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set read_at timestamp
DROP TRIGGER IF EXISTS mark_notification_read_trigger ON notifications;

CREATE TRIGGER mark_notification_read_trigger
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION mark_notification_read();

-- Function to create notification (helper for other triggers)
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_related_id UUID DEFAULT NULL,
  p_related_user_id UUID DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    related_id,
    related_user_id,
    action_url,
    metadata
  ) VALUES (
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_related_id,
    p_related_user_id,
    p_action_url,
    p_metadata
  ) RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Send notification when friend request is created
CREATE OR REPLACE FUNCTION notify_friend_request()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  recipient_id UUID;
BEGIN
  -- Only notify on new pending requests
  IF NEW.status = 'pending' THEN
    -- Get sender's name
    SELECT COALESCE(
      raw_user_meta_data->>'full_name',
      raw_user_meta_data->>'name',
      email
    ) INTO sender_name
    FROM auth.users
    WHERE id = NEW.requested_by;

    -- Determine recipient (the one who didn't send the request)
    IF NEW.requested_by = NEW.user_id THEN
      recipient_id := NEW.friend_id;
    ELSE
      recipient_id := NEW.user_id;
    END IF;

    -- Create notification
    PERFORM create_notification(
      recipient_id,
      'friend_request',
      'New Friend Request',
      sender_name || ' sent you a friend request',
      NEW.id,
      NEW.requested_by,
      '/dashboard/social?tab=friends',
      jsonb_build_object('connection_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_friend_request_trigger ON user_connections;

CREATE TRIGGER notify_friend_request_trigger
  AFTER INSERT ON user_connections
  FOR EACH ROW
  EXECUTE FUNCTION notify_friend_request();

-- Trigger: Send notification when friend request is accepted
CREATE OR REPLACE FUNCTION notify_friend_accepted()
RETURNS TRIGGER AS $$
DECLARE
  accepter_name TEXT;
  other_user_id UUID;
BEGIN
  -- Only notify when status changes from pending to accepted
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    -- Get accepter's name (the one who accepted)
    -- Determine who accepted (it's NOT the one who requested)
    IF NEW.requested_by = NEW.user_id THEN
      other_user_id := NEW.friend_id;

      SELECT COALESCE(
        raw_user_meta_data->>'full_name',
        raw_user_meta_data->>'name',
        email
      ) INTO accepter_name
      FROM auth.users
      WHERE id = NEW.friend_id;
    ELSE
      other_user_id := NEW.user_id;

      SELECT COALESCE(
        raw_user_meta_data->>'full_name',
        raw_user_meta_data->>'name',
        email
      ) INTO accepter_name
      FROM auth.users
      WHERE id = NEW.user_id;
    END IF;

    -- Notify the requester
    PERFORM create_notification(
      NEW.requested_by,
      'friend_accepted',
      'Friend Request Accepted',
      accepter_name || ' accepted your friend request',
      NEW.id,
      other_user_id,
      '/dashboard/social?tab=friends',
      jsonb_build_object('connection_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_friend_accepted_trigger ON user_connections;

CREATE TRIGGER notify_friend_accepted_trigger
  AFTER UPDATE ON user_connections
  FOR EACH ROW
  EXECUTE FUNCTION notify_friend_accepted();

-- Comment on table
COMMENT ON TABLE notifications IS 'Real-time notifications for users - friend requests, shares, achievements, etc.';
COMMENT ON COLUMN notifications.type IS 'Type of notification: friend_request, friend_accepted, share, achievement, system';
COMMENT ON COLUMN notifications.related_id IS 'ID of related entity (connection_id, shared_content_id, etc.)';
COMMENT ON COLUMN notifications.related_user_id IS 'User who triggered this notification';
COMMENT ON COLUMN notifications.metadata IS 'Extensible JSON metadata for additional context';
