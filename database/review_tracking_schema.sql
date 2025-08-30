-- Create table for tracking lectures marked for review
CREATE TABLE IF NOT EXISTS lecture_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id TEXT NOT NULL, -- Reference to jobs.job_id
  marked_for_review BOOLEAN DEFAULT TRUE NOT NULL,
  review_reason TEXT, -- Optional: why user wants to review (difficult, incomplete, etc.)
  marked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Ensure one review record per user per lecture
  UNIQUE(user_id, job_id)
);

-- Enable RLS (Row Level Security)
ALTER TABLE lecture_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own review marks" ON lecture_reviews
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own review marks" ON lecture_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own review marks" ON lecture_reviews
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own review marks" ON lecture_reviews
  FOR DELETE USING (auth.uid() = user_id);

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_lecture_reviews_user_job 
ON lecture_reviews(user_id, job_id);

CREATE INDEX IF NOT EXISTS idx_lecture_reviews_marked_for_review 
ON lecture_reviews(user_id, marked_for_review);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_lecture_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_lecture_reviews_updated_at
  BEFORE UPDATE ON lecture_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_lecture_reviews_updated_at();