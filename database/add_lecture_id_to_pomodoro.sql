-- Add lecture_id column to pomodoro_sessions table for study time tracking
-- This enables tracking which lecture was being studied during each focus session

-- Add the lecture_id column
ALTER TABLE pomodoro_sessions 
ADD COLUMN IF NOT EXISTS lecture_id UUID REFERENCES jobs(job_id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_lecture_id ON pomodoro_sessions(lecture_id);

-- Update the composite index for better query performance
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_user_type_completed_lecture 
ON pomodoro_sessions(user_id, type, was_completed, lecture_id);

-- Optional: Create or replace the study time view
CREATE OR REPLACE VIEW study_time_by_lecture AS
SELECT 
  lecture_id,
  user_id,
  COUNT(*) as session_count,
  SUM(duration) as total_minutes,
  MAX(started_at) as last_studied,
  MIN(started_at) as first_studied
FROM pomodoro_sessions 
WHERE 
  type = 'focus' 
  AND was_completed = true 
  AND lecture_id IS NOT NULL
GROUP BY lecture_id, user_id;