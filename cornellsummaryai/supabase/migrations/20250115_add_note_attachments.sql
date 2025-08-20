-- Create table for note attachments
CREATE TABLE IF NOT EXISTS note_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(job_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- File information
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL, -- PDF, PPTX, DOCX, OneNote, etc.
    file_size_mb DECIMAL(10,2),
    file_path TEXT NOT NULL, -- Path in storage bucket
    
    -- Metadata
    attachment_type TEXT NOT NULL DEFAULT 'supplementary', -- 'supplementary', 'slides', 'notes', 'reference'
    description TEXT,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Processing status (if we want to extract text from these)
    processing_status TEXT DEFAULT 'uploaded', -- 'uploaded', 'processing', 'processed', 'failed'
    extracted_text TEXT, -- For searchability
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_note_attachments_note_id ON note_attachments(note_id);
CREATE INDEX idx_note_attachments_job_id ON note_attachments(job_id);
CREATE INDEX idx_note_attachments_user_id ON note_attachments(user_id);
CREATE INDEX idx_note_attachments_type ON note_attachments(attachment_type);

-- Enable RLS
ALTER TABLE note_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own attachments" ON note_attachments
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own attachments" ON note_attachments
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attachments" ON note_attachments
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own attachments" ON note_attachments
    FOR DELETE
    USING (auth.uid() = user_id);

-- Add attachment count to notes table for quick access
ALTER TABLE notes 
ADD COLUMN IF NOT EXISTS attachment_count INTEGER DEFAULT 0;

-- Function to update attachment count
CREATE OR REPLACE FUNCTION update_attachment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE notes 
        SET attachment_count = attachment_count + 1,
            updated_at = NOW()
        WHERE id = NEW.note_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE notes 
        SET attachment_count = GREATEST(attachment_count - 1, 0),
            updated_at = NOW()
        WHERE id = OLD.note_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for attachment count
CREATE TRIGGER update_note_attachment_count
AFTER INSERT OR DELETE ON note_attachments
FOR EACH ROW
EXECUTE FUNCTION update_attachment_count();

-- Storage bucket for attachments (if not exists)
-- Note: This needs to be run in Supabase Dashboard
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('note-attachments', 'note-attachments', false)
-- ON CONFLICT (id) DO NOTHING;