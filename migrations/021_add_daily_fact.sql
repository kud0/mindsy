-- Add daily fact feature columns to profiles table
-- This migration adds columns for storing daily AI-generated study facts

DO $$
BEGIN
  -- Add daily_fact_text column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'daily_fact_text'
  ) THEN
    ALTER TABLE profiles ADD COLUMN daily_fact_text TEXT;
  END IF;

  -- Add daily_fact_date column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'daily_fact_date'
  ) THEN
    ALTER TABLE profiles ADD COLUMN daily_fact_date DATE;
  END IF;

  -- Add daily_fact_dismissed column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'daily_fact_dismissed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN daily_fact_dismissed BOOLEAN DEFAULT false;
  END IF;

  -- Add daily_fact_collapsed column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'daily_fact_collapsed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN daily_fact_collapsed BOOLEAN DEFAULT false;
  END IF;

  -- Add daily_fact_language column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'daily_fact_language'
  ) THEN
    ALTER TABLE profiles ADD COLUMN daily_fact_language TEXT;
  END IF;
END $$;

-- Comment on new columns
COMMENT ON COLUMN profiles.daily_fact_text IS 'The current daily study fact text';
COMMENT ON COLUMN profiles.daily_fact_date IS 'Date when the current fact was generated';
COMMENT ON COLUMN profiles.daily_fact_dismissed IS 'Whether user dismissed the fact for today';
COMMENT ON COLUMN profiles.daily_fact_collapsed IS 'Whether user minimized the fact box';
COMMENT ON COLUMN profiles.daily_fact_language IS 'Language of the generated fact';
