-- Migration: 018_fix_cancelled_completion_timestamp.sql
-- Purpose: Allow cancelled battles to have completed_at timestamp
-- Background: The valid_completion constraint was preventing cancelled battles
--             from having a completed_at timestamp, but we need this to track
--             when battles were cancelled/forfeited.

-- Drop the old constraint that only allowed 'completed' status with completed_at
ALTER TABLE quiz_battles
  DROP CONSTRAINT IF EXISTS valid_completion;

-- Add new constraint that allows both 'completed' and 'cancelled' to have completed_at
-- Logic:
--   - If status is 'completed' OR 'cancelled' → completed_at MUST NOT be NULL
--   - If status is 'pending' OR 'active' → completed_at MUST be NULL
ALTER TABLE quiz_battles
  ADD CONSTRAINT valid_completion CHECK (
    (status IN ('completed', 'cancelled') AND completed_at IS NOT NULL) OR
    (status NOT IN ('completed', 'cancelled') AND completed_at IS NULL)
  );

-- Add documentation comment
COMMENT ON CONSTRAINT valid_completion ON quiz_battles IS
  'Completed and cancelled battles must have completed_at timestamp. Pending and active battles must not.';
