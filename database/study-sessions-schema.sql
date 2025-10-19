-- Create study_sessions table for study schedule feature
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('lecture', 'study', 'review', 'exam-prep', 'break')),
  subject TEXT,
  description TEXT,
  lecture_id TEXT, -- Reference to job_id from jobs table if applicable
  user_folder_id UUID, -- Reference to user_folders table for course folder organization
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_start_time ON study_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_study_sessions_lecture_id ON study_sessions(lecture_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_folder_id ON study_sessions(user_folder_id);

-- Enable Row Level Security
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own study sessions" ON study_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own study sessions" ON study_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study sessions" ON study_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study sessions" ON study_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_study_sessions_updated_at
  BEFORE UPDATE ON study_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();