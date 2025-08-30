-- Add review tracking columns to jobs table
-- Run this in your Supabase SQL Editor

-- Add marked_for_review column (boolean, default false)
DO $$ 
BEGIN
  BEGIN
    ALTER TABLE jobs ADD COLUMN marked_for_review BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Column marked_for_review added successfully';
  EXCEPTION
    WHEN duplicate_column THEN 
      RAISE NOTICE 'Column marked_for_review already exists';
  END;
END $$;

-- Add review_reason column (text, nullable)
DO $$ 
BEGIN
  BEGIN
    ALTER TABLE jobs ADD COLUMN review_reason TEXT;
    RAISE NOTICE 'Column review_reason added successfully';
  EXCEPTION
    WHEN duplicate_column THEN 
      RAISE NOTICE 'Column review_reason already exists';
  END;
END $$;

-- Create an index on marked_for_review for better query performance
DO $$ 
BEGIN
  BEGIN
    CREATE INDEX idx_jobs_marked_for_review ON jobs(marked_for_review) WHERE marked_for_review = TRUE;
    RAISE NOTICE 'Index on marked_for_review created successfully';
  EXCEPTION
    WHEN duplicate_table THEN 
      RAISE NOTICE 'Index idx_jobs_marked_for_review already exists';
  END;
END $$;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'jobs' 
AND column_name IN ('marked_for_review', 'review_reason')
ORDER BY column_name;