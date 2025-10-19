-- Migration: Create tutor_questions table for "Raise Your Hand" AI Tutor feature
-- This stores student questions and AI explanations for persistent access

CREATE TABLE IF NOT EXISTS tutor_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(job_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Context information
  tab_name TEXT NOT NULL, -- 'overview', 'explanations', 'summary', 'transcript'
  selected_text TEXT NOT NULL,
  section_context TEXT, -- Content from current section for AI context

  -- AI response
  ai_explanation TEXT NOT NULL,

  -- Metadata
  position_hint JSONB, -- Store rough location info for future highlighting
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tutor_questions_job_user
  ON tutor_questions(job_id, user_id);

CREATE INDEX IF NOT EXISTS idx_tutor_questions_created
  ON tutor_questions(created_at DESC);

-- Row Level Security (RLS) Policies
ALTER TABLE tutor_questions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own tutor questions
CREATE POLICY "Users can view own tutor questions"
  ON tutor_questions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own tutor questions
CREATE POLICY "Users can insert own tutor questions"
  ON tutor_questions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own tutor questions
CREATE POLICY "Users can update own tutor questions"
  ON tutor_questions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own tutor questions
CREATE POLICY "Users can delete own tutor questions"
  ON tutor_questions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_tutor_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tutor_questions_updated_at
  BEFORE UPDATE ON tutor_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_tutor_questions_updated_at();
