-- Create PDF highlights table for storing user text selections
CREATE TABLE IF NOT EXISTS highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(job_id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  selected_text TEXT NOT NULL,
  position_data JSONB NOT NULL, -- PDF.js selection coordinates and positioning
  color VARCHAR(20) NOT NULL DEFAULT 'yellow',
  note TEXT, -- Optional user note/annotation
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_highlights_user_job ON highlights(user_id, job_id);
CREATE INDEX idx_highlights_page ON highlights(job_id, page_number);
CREATE INDEX idx_highlights_created ON highlights(created_at DESC);

-- Add full-text search index for highlight text and notes
CREATE INDEX idx_highlights_search ON highlights 
USING gin(to_tsvector('english', selected_text || ' ' || COALESCE(note, '')));

-- Enable Row Level Security
ALTER TABLE highlights ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own highlights
CREATE POLICY "Users can view own highlights" ON highlights
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create highlights for their own jobs
CREATE POLICY "Users can create own highlights" ON highlights
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own highlights
CREATE POLICY "Users can update own highlights" ON highlights
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own highlights
CREATE POLICY "Users can delete own highlights" ON highlights
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_highlights_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_highlights_updated_at
  BEFORE UPDATE ON highlights
  FOR EACH ROW
  EXECUTE FUNCTION update_highlights_updated_at();

-- Add comment for documentation
COMMENT ON TABLE highlights IS 'Stores user PDF text highlights with position data, colors, and optional notes';
COMMENT ON COLUMN highlights.position_data IS 'JSON data containing PDF.js selection coordinates, bounds, and page positioning information';
COMMENT ON COLUMN highlights.color IS 'Highlight color: yellow, green, blue, pink, red, orange';