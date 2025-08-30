-- Add lecture_id column to pomodoro_sessions table for study time tracking
-- This allows tracking which lecture was being studied during each focus session

ALTER TABLE pomodoro_sessions 
ADD COLUMN IF NOT EXISTS lecture_id TEXT;

-- Add index for better query performance when filtering by lecture_id
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_lecture_id 
ON pomodoro_sessions(lecture_id);

-- Add index for user_id + lecture_id combination queries
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_user_lecture 
ON pomodoro_sessions(user_id, lecture_id);

-- Optional: Add foreign key constraint to jobs table (if you want referential integrity)
-- ALTER TABLE pomodoro_sessions 
-- ADD CONSTRAINT fk_pomodoro_sessions_lecture_id 
-- FOREIGN KEY (lecture_id) REFERENCES jobs(job_id) ON DELETE SET NULL;