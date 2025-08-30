-- CRITICAL: Run this SQL in your Supabase SQL Editor to enable study time tracking
-- This adds the lecture_id column needed for Pomodoro study time tracking

-- Step 1: Add the lecture_id column to pomodoro_sessions table
ALTER TABLE pomodoro_sessions 
ADD COLUMN IF NOT EXISTS lecture_id TEXT;

-- Step 2: Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_lecture_id 
ON pomodoro_sessions(lecture_id);

-- Step 3: Add composite index for user + lecture queries
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_user_lecture 
ON pomodoro_sessions(user_id, lecture_id);

-- Step 4: Verify the column was added (optional check)
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'pomodoro_sessions' 
AND column_name = 'lecture_id';

-- Expected result: Should return one row with 'lecture_id'