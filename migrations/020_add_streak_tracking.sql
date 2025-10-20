-- Migration: Add Study Streak Tracking
-- Description: Adds daily study streak tracking based on quiz completion
-- Date: 2025-10-20

-- Add streak tracking columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS study_streak INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_quiz_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_study_streak ON profiles(study_streak DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_last_quiz_date ON profiles(last_quiz_date);

-- Add comments for documentation
COMMENT ON COLUMN profiles.study_streak IS 'Current consecutive days of quiz completion';
COMMENT ON COLUMN profiles.last_quiz_date IS 'Last date user completed a quiz (for streak calculation)';
COMMENT ON COLUMN profiles.longest_streak IS 'Longest streak ever achieved by user';

-- Verification query (run after migration)
-- SELECT id, study_streak, last_quiz_date, longest_streak FROM profiles LIMIT 5;
