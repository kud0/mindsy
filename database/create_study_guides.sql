-- Clean study guides table - from scratch approach
CREATE TABLE IF NOT EXISTS study_guides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES jobs(job_id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Core content - simple and clean
  title TEXT NOT NULL,
  subject TEXT,
  language TEXT DEFAULT 'en',
  
  -- Study content as clean JSON
  questions JSONB NOT NULL DEFAULT '[]',
  explanations JSONB NOT NULL DEFAULT '[]', 
  summary JSONB NOT NULL DEFAULT '{}',
  table_of_contents TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_study_guides_job_id ON study_guides(job_id);
CREATE INDEX IF NOT EXISTS idx_study_guides_user_id ON study_guides(user_id); 
CREATE INDEX IF NOT EXISTS idx_study_guides_created_at ON study_guides(created_at);

-- Enable RLS
ALTER TABLE study_guides ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can only see their own study guides" ON study_guides
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own study guides" ON study_guides  
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own study guides" ON study_guides
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own study guides" ON study_guides
  FOR DELETE USING (auth.uid() = user_id);