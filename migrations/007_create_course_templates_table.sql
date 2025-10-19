-- Migration: Create course_templates table
-- Description: Folder structure templates for courses (community-voted)
-- Phase: 2A - Course Discovery + Templates

-- Create course_templates table
CREATE TABLE IF NOT EXISTS course_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  template_name TEXT NOT NULL,                  -- e.g., "Weekly Structure (12 weeks)"
  folder_structure JSONB NOT NULL,              -- Folder tree (flat list for MVP)
  description TEXT,                             -- Optional description
  vote_count INTEGER DEFAULT 0,                 -- Cached vote count
  is_recommended BOOLEAN DEFAULT FALSE,         -- Auto-set to highest voted
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Validation: folder_structure must be valid JSON with folders array
  CONSTRAINT valid_folder_structure CHECK (
    folder_structure ? 'folders' AND
    jsonb_typeof(folder_structure->'folders') = 'array'
  )
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_templates_course ON course_templates(course_id);
CREATE INDEX IF NOT EXISTS idx_templates_creator ON course_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_templates_votes ON course_templates(vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_templates_recommended ON course_templates(is_recommended) WHERE is_recommended = TRUE;

-- Enable Row Level Security
ALTER TABLE course_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Templates are viewable by enrolled students
CREATE POLICY "Templates are viewable by course members"
  ON course_templates FOR SELECT
  TO authenticated
  USING (
    -- Everyone can view templates for public discovery
    true
  );

-- Only enrolled students can create templates
CREATE POLICY "Enrolled students can create templates"
  ON course_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM course_enrollments
      WHERE user_id = auth.uid()
        AND course_id = course_templates.course_id
        AND is_active = TRUE
    )
  );

-- Template creators can update their templates
CREATE POLICY "Template creators can update their templates"
  ON course_templates FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Template creators can delete their templates
CREATE POLICY "Template creators can delete their templates"
  ON course_templates FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER templates_updated_at
  BEFORE UPDATE ON course_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_templates_updated_at();

-- Add comments for documentation
COMMENT ON TABLE course_templates IS 'Folder structure templates for courses (community-voted)';
COMMENT ON COLUMN course_templates.folder_structure IS 'JSONB: {folders: [{name: "Week 1"}, {name: "Week 2"}, ...]}';
COMMENT ON COLUMN course_templates.vote_count IS 'Cached count, updated by template_votes trigger';
COMMENT ON COLUMN course_templates.is_recommended IS 'TRUE for highest voted template per course';

-- Example folder_structure JSON (for MVP: flat list only):
-- {
--   "folders": [
--     {"name": "Week 1"},
--     {"name": "Week 2"},
--     {"name": "Midterm Review"},
--     {"name": "Final Prep"}
--   ]
-- }
