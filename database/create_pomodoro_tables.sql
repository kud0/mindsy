-- Pomodoro system tables for study time tracking
-- Based on the enhanced design from PomodoroContext

-- Pomodoro settings table
CREATE TABLE IF NOT EXISTS pomodoro_settings (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  focus_duration INTEGER NOT NULL DEFAULT 25,
  short_break_duration INTEGER NOT NULL DEFAULT 5,
  long_break_duration INTEGER NOT NULL DEFAULT 15,
  auto_start_breaks BOOLEAN NOT NULL DEFAULT false,
  auto_start_focus BOOLEAN NOT NULL DEFAULT false,
  sound_enabled BOOLEAN NOT NULL DEFAULT true,
  daily_goal INTEGER NOT NULL DEFAULT 8,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pomodoro sessions table - tracks individual study sessions
CREATE TABLE IF NOT EXISTS pomodoro_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('focus', 'shortBreak', 'longBreak')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration INTEGER NOT NULL DEFAULT 0, -- duration in minutes
  note TEXT,
  was_completed BOOLEAN NOT NULL DEFAULT false,
  lecture_id UUID REFERENCES jobs(job_id) ON DELETE SET NULL, -- NEW: Track which lecture was studied
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pomodoro_settings_user_id ON pomodoro_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_user_id ON pomodoro_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_type ON pomodoro_sessions(type);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_started_at ON pomodoro_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_lecture_id ON pomodoro_sessions(lecture_id);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_user_type_completed ON pomodoro_sessions(user_id, type, was_completed);

-- Enable RLS
ALTER TABLE pomodoro_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomodoro_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pomodoro_settings
CREATE POLICY "Users can only see their own pomodoro settings" ON pomodoro_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own pomodoro settings" ON pomodoro_settings  
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own pomodoro settings" ON pomodoro_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own pomodoro settings" ON pomodoro_settings
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for pomodoro_sessions
CREATE POLICY "Users can only see their own pomodoro sessions" ON pomodoro_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own pomodoro sessions" ON pomodoro_sessions  
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own pomodoro sessions" ON pomodoro_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own pomodoro sessions" ON pomodoro_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Optional: Create a view for easy querying of study time by lecture
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