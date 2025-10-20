-- Check current RLS policies on quiz_battles table
-- Run this in Supabase SQL Editor to verify migration status

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as "policy_definition"
FROM pg_policies
WHERE tablename = 'quiz_battles'
ORDER BY policyname;
