-- Migration: Create user_folders table
-- Description: Hierarchical folder structure for organizing lectures (with course support)
-- Phase: 2A - Course Discovery + Templates

-- Create user_folders table
CREATE TABLE IF NOT EXISTS user_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,  -- Optional: link to course
  parent_folder_id UUID REFERENCES user_folders(id) ON DELETE CASCADE,  -- For nesting
  folder_name TEXT NOT NULL,
  folder_order INTEGER DEFAULT 0,                            -- For custom ordering
  created_from_template_id UUID REFERENCES course_templates(id) ON DELETE SET NULL,  -- Track origin
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Validation: folder name can't be empty
  CONSTRAINT valid_folder_name CHECK (LENGTH(TRIM(folder_name)) > 0)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_folders_user ON user_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_course ON user_folders(course_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent ON user_folders(parent_folder_id);
CREATE INDEX IF NOT EXISTS idx_folders_template ON user_folders(created_from_template_id);
CREATE INDEX IF NOT EXISTS idx_folders_order ON user_folders(user_id, folder_order);

-- Enable Row Level Security
ALTER TABLE user_folders ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only manage their own folders
CREATE POLICY "Users can view their own folders"
  ON user_folders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own folders"
  ON user_folders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders"
  ON user_folders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders"
  ON user_folders FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_folders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER folders_updated_at
  BEFORE UPDATE ON user_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_folders_updated_at();

-- Add comments for documentation
COMMENT ON TABLE user_folders IS 'Hierarchical folder structure for organizing lectures';
COMMENT ON COLUMN user_folders.course_id IS 'Optional link to course (folders can be course-specific)';
COMMENT ON COLUMN user_folders.parent_folder_id IS 'For nested folders (NULL = root folder)';
COMMENT ON COLUMN user_folders.created_from_template_id IS 'Tracks which template created this folder';
COMMENT ON COLUMN user_folders.folder_order IS 'Custom ordering within parent folder';
