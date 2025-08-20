-- Migration: Drop old check_usage_limits function safely
-- This allows us to recreate it with new return type

-- First, create a backup of the old function logic (if needed for rollback)
-- Note: This is informational only, the actual backup would be in version control

-- Drop the existing function to allow recreation with new signature
DROP FUNCTION IF EXISTS public.check_usage_limits(UUID, INTEGER);

-- Add comment for tracking
COMMENT ON SCHEMA public IS 'Dropped old check_usage_limits function for effective tier implementation';