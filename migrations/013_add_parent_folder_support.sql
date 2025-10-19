-- Migration: Add parent_folder_id for hierarchical folder structure
-- Description: Allow nested folders (e.g., Semester > Subject > Lecture)
-- Phase: 2A - Course Organization Enhancement

-- Add parent_folder_id column to user_folders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_folders' AND column_name = 'parent_folder_id'
  ) THEN
    ALTER TABLE user_folders ADD COLUMN parent_folder_id UUID REFERENCES user_folders(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add index for parent folder lookups
CREATE INDEX IF NOT EXISTS idx_user_folders_parent ON user_folders(parent_folder_id);

-- Add comment
COMMENT ON COLUMN user_folders.parent_folder_id IS 'Parent folder for hierarchical organization (e.g., Semester > Subject)';
