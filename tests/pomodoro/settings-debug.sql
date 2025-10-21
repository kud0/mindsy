-- Debug script for Pomodoro Settings persistence issue
-- Run this in Supabase SQL Editor

-- Step 1: Check if pomodoro_settings table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'pomodoro_settings'
);

-- Step 2: Check table schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'pomodoro_settings'
ORDER BY ordinal_position;

-- Step 3: Check if there are any rows in the table
SELECT COUNT(*) as total_rows FROM pomodoro_settings;

-- Step 4: Check current user's settings (replace with actual user_id)
-- SELECT * FROM pomodoro_settings WHERE user_id = 'YOUR_USER_ID_HERE';

-- Step 5: Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'pomodoro_settings';

-- Step 6: Verify pomodoro_sessions table exists (for reference)
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'pomodoro_sessions'
);

-- Step 7: Check if any triggers exist on pomodoro_settings
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'pomodoro_settings';
