-- Migration: Create quizzes table for on-demand quiz generation
-- Date: 2025-10-17
-- Purpose: Store multiple quiz attempts per lecture with user customization

-- Create quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(job_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT, -- Optional custom title like "Quiz #1", "Practice Quiz"
  questions JSONB NOT NULL, -- Array of question objects (max 10)
  quiz_config JSONB, -- { difficulty, numQuestions, questionTypes, focusTopics }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quizzes_job_id ON quizzes(job_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON quizzes(user_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_at ON quizzes(created_at DESC);

-- Add RLS (Row Level Security) policies
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

-- Users can only see their own quizzes
CREATE POLICY "Users can view own quizzes"
  ON quizzes
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own quizzes
CREATE POLICY "Users can create own quizzes"
  ON quizzes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own quizzes
CREATE POLICY "Users can update own quizzes"
  ON quizzes
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own quizzes
CREATE POLICY "Users can delete own quizzes"
  ON quizzes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE quizzes IS 'Stores on-demand generated quizzes with customization options (difficulty, question count, types). Each lecture can have multiple quiz attempts.';
