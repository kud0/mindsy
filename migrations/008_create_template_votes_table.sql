-- Migration: Create template_votes table
-- Description: Community voting system for course templates
-- Phase: 2A - Course Discovery + Templates

-- Create template_votes table
CREATE TABLE IF NOT EXISTS template_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES course_templates(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  voted_at TIMESTAMPTZ DEFAULT NOW(),

  -- One vote per user per template
  CONSTRAINT unique_vote UNIQUE(template_id, user_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_votes_template ON template_votes(template_id);
CREATE INDEX IF NOT EXISTS idx_votes_user ON template_votes(user_id);

-- Enable Row Level Security
ALTER TABLE template_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view all votes (to see vote counts)
CREATE POLICY "Everyone can view votes"
  ON template_votes FOR SELECT
  USING (true);

-- Only enrolled students can vote
CREATE POLICY "Enrolled students can vote"
  ON template_votes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM course_templates ct
      JOIN course_enrollments ce ON ce.course_id = ct.course_id
      WHERE ct.id = template_votes.template_id
        AND ce.user_id = auth.uid()
        AND ce.is_active = TRUE
    )
  );

-- Users can delete their own votes (to unvote)
CREATE POLICY "Users can delete their own votes"
  ON template_votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to recalculate template vote counts and recommended status
CREATE OR REPLACE FUNCTION recalculate_template_votes()
RETURNS TRIGGER AS $$
DECLARE
  affected_template_id UUID;
  affected_course_id UUID;
  new_vote_count INTEGER;
  max_votes INTEGER;
BEGIN
  -- Determine which template was affected
  IF TG_OP = 'DELETE' THEN
    affected_template_id := OLD.template_id;
  ELSE
    affected_template_id := NEW.template_id;
  END IF;

  -- Get course_id for this template
  SELECT course_id INTO affected_course_id
  FROM course_templates
  WHERE id = affected_template_id;

  -- Recalculate vote count for affected template
  SELECT COUNT(*) INTO new_vote_count
  FROM template_votes
  WHERE template_id = affected_template_id;

  UPDATE course_templates
  SET vote_count = new_vote_count
  WHERE id = affected_template_id;

  -- Find the highest vote count in this course
  SELECT COALESCE(MAX(vote_count), 0) INTO max_votes
  FROM course_templates
  WHERE course_id = affected_course_id;

  -- Update is_recommended: only templates with max votes in their course
  UPDATE course_templates
  SET is_recommended = (vote_count = max_votes AND vote_count > 0)
  WHERE course_id = affected_course_id;

  RETURN NULL; -- AFTER trigger, return value doesn't matter
END;
$$ LANGUAGE plpgsql;

-- Trigger to update vote counts after vote changes
CREATE TRIGGER update_template_votes_after_insert
  AFTER INSERT ON template_votes
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_template_votes();

CREATE TRIGGER update_template_votes_after_delete
  AFTER DELETE ON template_votes
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_template_votes();

-- Add comments for documentation
COMMENT ON TABLE template_votes IS 'Community voting for course templates';
COMMENT ON CONSTRAINT unique_vote ON template_votes IS 'One vote per user per template';
