-- Create user_notes table for student personal notes
-- Allows students to add their own notes to AI-generated content

CREATE TABLE IF NOT EXISTS user_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(job_id) ON DELETE CASCADE,

  -- What type of content is this note attached to?
  content_type TEXT NOT NULL CHECK (content_type IN ('explanation', 'summary', 'question', 'overview', 'general')),

  -- Which specific item (explanation ID, question ID, etc.)
  content_id TEXT NOT NULL,

  -- The student's note content (supports markdown)
  note_content TEXT NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Composite index for fast queries by user + lecture + content
  CONSTRAINT unique_user_content UNIQUE (user_id, job_id, content_type, content_id)
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_user_notes_user_job ON user_notes(user_id, job_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_content ON user_notes(content_type, content_id);

-- RLS Policies
ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own notes
CREATE POLICY "Users can view their own notes"
  ON user_notes
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own notes
CREATE POLICY "Users can create their own notes"
  ON user_notes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own notes
CREATE POLICY "Users can update their own notes"
  ON user_notes
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own notes
CREATE POLICY "Users can delete their own notes"
  ON user_notes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE TRIGGER update_user_notes_timestamp
  BEFORE UPDATE ON user_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_user_notes_updated_at();
