-- Create storage bucket for note attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'note-attachments', 
  'note-attachments', 
  false, -- Private bucket
  52428800, -- 50MB limit
  ARRAY[
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/onenote',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.presentation',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the bucket
CREATE POLICY "Users can upload their own attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'note-attachments' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'note-attachments' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own attachments"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'note-attachments' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'note-attachments' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Create note_attachments table if it doesn't exist
CREATE TABLE IF NOT EXISTS note_attachments (
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_note_attachments_note_id ON note_attachments(note_id);
CREATE INDEX IF NOT EXISTS idx_note_attachments_job_id ON note_attachments(job_id);
CREATE INDEX IF NOT EXISTS idx_note_attachments_user_id ON note_attachments(user_id);

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

-- Add attachment_count column to notes table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notes' 
    AND column_name = 'attachment_count'
  ) THEN
    ALTER TABLE notes ADD COLUMN attachment_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Function to update attachment count
CREATE OR REPLACE FUNCTION update_attachment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE notes 
    SET attachment_count = COALESCE(attachment_count, 0) + 1
    WHERE job_id = NEW.job_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE notes 
    SET attachment_count = GREATEST(COALESCE(attachment_count, 0) - 1, 0)
    WHERE job_id = OLD.job_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update attachment count
DROP TRIGGER IF EXISTS update_note_attachment_count ON note_attachments;
CREATE TRIGGER update_note_attachment_count
AFTER INSERT OR DELETE ON note_attachments
FOR EACH ROW EXECUTE FUNCTION update_attachment_count();

-- Add helpful comments
COMMENT ON TABLE note_attachments IS 'Stores metadata for files attached to notes';
COMMENT ON COLUMN note_attachments.attachment_type IS 'Type of attachment: slides, notes, reference, supplementary';