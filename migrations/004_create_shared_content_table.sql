-- Create shared_content table for tracking content sharing
-- Copy-based model: Each share creates a new job for the recipient

CREATE TABLE IF NOT EXISTS shared_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who shared it
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Who received it
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Original content
  source_job_id UUID NOT NULL REFERENCES jobs(job_id) ON DELETE CASCADE,

  -- Copied content (new job for recipient)
  copied_job_id UUID NOT NULL REFERENCES jobs(job_id) ON DELETE CASCADE,

  -- Metadata
  title TEXT NOT NULL,
  description TEXT,

  -- Timestamps
  shared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate shares
  CONSTRAINT unique_share UNIQUE (owner_id, recipient_id, source_job_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_shared_content_owner ON shared_content(owner_id, shared_at DESC);
CREATE INDEX IF NOT EXISTS idx_shared_content_recipient ON shared_content(recipient_id, shared_at DESC);
CREATE INDEX IF NOT EXISTS idx_shared_content_source ON shared_content(source_job_id);
CREATE INDEX IF NOT EXISTS idx_shared_content_copied ON shared_content(copied_job_id);

-- RLS Policies
ALTER TABLE shared_content ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view shares they sent or received
CREATE POLICY "Users can view their shares"
  ON shared_content
  FOR SELECT
  USING (
    auth.uid() = owner_id
    OR auth.uid() = recipient_id
  );

-- Policy: Users can create shares (as owner)
CREATE POLICY "Users can create shares"
  ON shared_content
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Policy: Users can delete shares they created
CREATE POLICY "Users can delete their shares"
  ON shared_content
  FOR DELETE
  USING (auth.uid() = owner_id);

-- Trigger: Send notification when content is shared
CREATE OR REPLACE FUNCTION notify_content_shared()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
BEGIN
  -- Get sender's name
  SELECT COALESCE(
    full_name,
    email
  ) INTO sender_name
  FROM profiles
  WHERE id = NEW.owner_id;

  -- Create notification for recipient
  PERFORM create_notification(
    NEW.recipient_id,
    'share',
    'New Shared Content',
    sender_name || ' shared "' || NEW.title || '" with you',
    NEW.id,
    NEW.owner_id,
    '/dashboard/lectures/' || NEW.copied_job_id,
    jsonb_build_object(
      'shared_content_id', NEW.id,
      'source_job_id', NEW.source_job_id,
      'copied_job_id', NEW.copied_job_id
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_content_shared_trigger ON shared_content;

CREATE TRIGGER notify_content_shared_trigger
  AFTER INSERT ON shared_content
  FOR EACH ROW
  EXECUTE FUNCTION notify_content_shared();

-- Comment on table
COMMENT ON TABLE shared_content IS 'Tracks content sharing between users - copy-based model';
COMMENT ON COLUMN shared_content.source_job_id IS 'Original lecture that was shared';
COMMENT ON COLUMN shared_content.copied_job_id IS 'New copy created for recipient';
COMMENT ON COLUMN shared_content.description IS 'Optional message from sender';
