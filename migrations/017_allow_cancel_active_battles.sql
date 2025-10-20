-- Migration: 017_allow_cancel_active_battles.sql
-- Purpose: Allow users to cancel quiz battles that are either pending OR active
-- Background: Previously only pending battles could be deleted. This extends
--             cancellation capability to active battles as well, giving users
--             more control over their ongoing competitions.

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can delete pending battles" ON quiz_battles;

-- Create new policy allowing deletion of both pending and active battles
-- Users can cancel a battle if:
--   1. They are either the creator or the opponent, AND
--   2. The battle is in 'pending' or 'active' status
-- Note: Completed or already cancelled battles cannot be deleted
CREATE POLICY "Users can delete pending or active battles"
  ON quiz_battles FOR DELETE
  TO authenticated
  USING (
    (auth.uid() = created_by OR auth.uid() = opponent_id)
    AND (status = 'pending' OR status = 'active')
  );

-- Add comment for documentation
COMMENT ON POLICY "Users can delete pending or active battles" ON quiz_battles IS
  'Allows battle participants to cancel battles in pending or active state. Completed/cancelled battles cannot be deleted.';
