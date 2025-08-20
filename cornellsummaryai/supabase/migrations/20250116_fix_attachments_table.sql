-- Fix the note_attachments table schema if it already exists with wrong constraints

-- Drop the existing table if it has wrong schema
DROP TABLE IF EXISTS note_attachments CASCADE;

-- Recreate with correct schema
CREATE TABLE note_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE, -- Foreign key to notes table
  job_id UUID REFERENCES jobs(job_id) ON DELETE CASCADE, -- Also store job reference
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size_mb DECIMAL(10, 2),
  file_path TEXT NOT NULL,
  attachment_type TEXT DEFAULT 'supplementary', -- slides, notes, reference, supplementary
  description TEXT,
  processing_status TEXT DEFAULT 'uploaded', -- uploaded, processing, ready, failed
  bucket_name TEXT DEFAULT 'note-attachments', -- Track which bucket was used
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_note_attachments_note_id ON note_attachments(note_id);
CREATE INDEX idx_note_attachments_job_id ON note_attachments(job_id);
CREATE INDEX idx_note_attachments_user_id ON note_attachments(user_id);

-- Enable RLS
ALTER TABLE note_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies for note_attachments table
CREATE POLICY "Users can view own attachments"
ON note_attachments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own attachments"
ON note_attachments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own attachments"
ON note_attachments FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own attachments"
ON note_attachments FOR DELETE
USING (auth.uid() = user_id);

-- Function to update attachment count
CREATE OR REPLACE FUNCTION update_attachment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE notes 
    SET attachment_count = COALESCE(attachment_count, 0) + 1
    WHERE id = NEW.note_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE notes 
    SET attachment_count = GREATEST(COALESCE(attachment_count, 0) - 1, 0)
    WHERE id = OLD.note_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update attachment count
DROP TRIGGER IF EXISTS update_note_attachment_count ON note_attachments;
CREATE TRIGGER update_note_attachment_count
AFTER INSERT OR DELETE ON note_attachments
FOR EACH ROW EXECUTE FUNCTION update_attachment_count();