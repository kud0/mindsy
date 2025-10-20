-- Add user settings columns to profiles table
-- This migration adds notification preferences and display settings

DO $$
BEGIN
  -- Add email_notifications column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email_notifications'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email_notifications BOOLEAN DEFAULT true;
  END IF;

  -- Add study_reminders column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'study_reminders'
  ) THEN
    ALTER TABLE profiles ADD COLUMN study_reminders BOOLEAN DEFAULT true;
  END IF;

  -- Add friend_notifications column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'friend_notifications'
  ) THEN
    ALTER TABLE profiles ADD COLUMN friend_notifications BOOLEAN DEFAULT true;
  END IF;

  -- Add theme preference column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'theme'
  ) THEN
    ALTER TABLE profiles ADD COLUMN theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system'));
  END IF;

  -- Add display_name column (separate from full_name)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN display_name TEXT;
    -- Copy existing full_name to display_name for existing users
    UPDATE profiles SET display_name = full_name WHERE display_name IS NULL;
  END IF;

  -- Add subscription_tier column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'student', 'premium'));
  END IF;
END $$;

-- Comment on new columns
COMMENT ON COLUMN profiles.email_notifications IS 'Whether user wants email notifications';
COMMENT ON COLUMN profiles.study_reminders IS 'Whether user wants study reminder notifications';
COMMENT ON COLUMN profiles.friend_notifications IS 'Whether user wants friend request notifications';
COMMENT ON COLUMN profiles.theme IS 'User theme preference: light, dark, or system';
COMMENT ON COLUMN profiles.display_name IS 'User chosen display name (editable)';
COMMENT ON COLUMN profiles.subscription_tier IS 'User subscription level: free, student, or premium';
