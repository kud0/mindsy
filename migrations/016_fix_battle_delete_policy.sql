-- =====================================================
-- Migration: Fix Battle Delete Policy
-- Author: Claude Code
-- Date: 2025-10-20
-- Description: Allow BOTH challenger and opponent to cancel/decline pending battles
-- =====================================================

-- ===== FIX RLS POLICY =====

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can delete pending battles" ON quiz_battles;

-- Create new policy allowing both participants to cancel/decline
CREATE POLICY "Users can delete pending battles"
  ON quiz_battles
  FOR DELETE
  USING (
    (auth.uid() = created_by OR auth.uid() = opponent_id)
    AND status = 'pending'
  );

-- ===== COMMENTS =====

COMMENT ON POLICY "Users can delete pending battles" ON quiz_battles IS
  'Allows both challenger and opponent to cancel/decline pending battles. Once accepted (status = active), battles cannot be deleted.';
