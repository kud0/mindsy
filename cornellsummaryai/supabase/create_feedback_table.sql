-- Create feedback table to store user feedback
CREATE TABLE IF NOT EXISTS feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating TEXT NOT NULL CHECK (rating IN ('great', 'good', 'improve')),
  suggestion TEXT,
  job_id TEXT, -- Reference to the job that was rated (optional)
  context TEXT, -- Additional context (e.g., 'post_download', 'dashboard_widget')
  user_email TEXT, -- Stored for easier follow-up
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON feedback(rating);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_job_id ON feedback(job_id) WHERE job_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only insert their own feedback
CREATE POLICY feedback_insert_own ON feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own feedback
CREATE POLICY feedback_select_own ON feedback
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Allow service role to read all feedback (for admin dashboard)
CREATE POLICY feedback_admin_access ON feedback
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Update trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_feedback_updated_at 
  BEFORE UPDATE ON feedback 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT SELECT, INSERT ON feedback TO authenticated;
GRANT ALL ON feedback TO service_role;