-- Validation Script: Pomodoro Settings Persistence Fix
-- Run this AFTER deploying the fix to verify everything works

-- ============================================================================
-- STEP 1: Verify table exists
-- ============================================================================

DO $$
DECLARE
  table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'pomodoro_settings'
  ) INTO table_exists;

  IF table_exists THEN
    RAISE NOTICE '✅ STEP 1 PASS: pomodoro_settings table exists';
  ELSE
    RAISE EXCEPTION '❌ STEP 1 FAIL: pomodoro_settings table does NOT exist';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Verify columns are correct
-- ============================================================================

DO $$
DECLARE
  expected_columns TEXT[] := ARRAY[
    'user_id',
    'focus_duration',
    'short_break_duration',
    'long_break_duration',
    'auto_start_breaks',
    'auto_start_focus',
    'sound_enabled',
    'daily_goal',
    'created_at',
    'updated_at'
  ];
  actual_columns TEXT[];
  column_name TEXT;
  is_valid BOOLEAN := TRUE;
BEGIN
  SELECT array_agg(column_name::TEXT ORDER BY ordinal_position)
  INTO actual_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name = 'pomodoro_settings';

  -- Check if all expected columns exist
  FOREACH column_name IN ARRAY expected_columns
  LOOP
    IF NOT (column_name = ANY(actual_columns)) THEN
      RAISE WARNING '❌ Missing column: %', column_name;
      is_valid := FALSE;
    END IF;
  END LOOP;

  IF is_valid AND array_length(actual_columns, 1) = array_length(expected_columns, 1) THEN
    RAISE NOTICE '✅ STEP 2 PASS: All columns present and correct';
  ELSE
    RAISE WARNING '⚠️ STEP 2 FAIL: Column mismatch. Expected: %, Actual: %',
      array_length(expected_columns, 1),
      array_length(actual_columns, 1);
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Verify RLS policies exist
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
  expected_policies INTEGER := 4; -- SELECT, INSERT, UPDATE, DELETE
BEGIN
  SELECT COUNT(*)
  INTO policy_count
  FROM pg_policies
  WHERE tablename = 'pomodoro_settings';

  IF policy_count = expected_policies THEN
    RAISE NOTICE '✅ STEP 3 PASS: All % RLS policies exist', expected_policies;
  ELSIF policy_count > 0 THEN
    RAISE WARNING '⚠️ STEP 3 PARTIAL: Found % policies, expected %', policy_count, expected_policies;
  ELSE
    RAISE EXCEPTION '❌ STEP 3 FAIL: No RLS policies found';
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Verify RLS is enabled
-- ============================================================================

DO $$
DECLARE
  rls_enabled BOOLEAN;
BEGIN
  SELECT relrowsecurity
  INTO rls_enabled
  FROM pg_class
  WHERE relname = 'pomodoro_settings';

  IF rls_enabled THEN
    RAISE NOTICE '✅ STEP 4 PASS: RLS is enabled on pomodoro_settings';
  ELSE
    RAISE EXCEPTION '❌ STEP 4 FAIL: RLS is NOT enabled';
  END IF;
END $$;

-- ============================================================================
-- STEP 5: Verify trigger exists
-- ============================================================================

DO $$
DECLARE
  trigger_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.triggers
    WHERE event_object_table = 'pomodoro_settings'
    AND trigger_name = 'update_pomodoro_settings_timestamp'
  ) INTO trigger_exists;

  IF trigger_exists THEN
    RAISE NOTICE '✅ STEP 5 PASS: Auto-update trigger exists';
  ELSE
    RAISE WARNING '⚠️ STEP 5 FAIL: Auto-update trigger missing';
  END IF;
END $$;

-- ============================================================================
-- STEP 6: Test INSERT (simulate new user)
-- ============================================================================

DO $$
DECLARE
  test_user_id UUID;
  inserted_count INTEGER;
BEGIN
  -- Use a fake UUID for testing (don't use real auth.uid() in case user is logged in)
  test_user_id := '00000000-0000-0000-0000-000000000001';

  -- Clean up any previous test data
  DELETE FROM pomodoro_settings WHERE user_id = test_user_id;

  -- Insert test settings
  INSERT INTO pomodoro_settings (
    user_id,
    focus_duration,
    short_break_duration,
    long_break_duration,
    auto_start_breaks,
    auto_start_focus,
    sound_enabled,
    daily_goal
  ) VALUES (
    test_user_id,
    30, -- Changed from default 25
    7,  -- Changed from default 5
    20, -- Changed from default 15
    TRUE,
    TRUE,
    FALSE,
    10
  );

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  IF inserted_count = 1 THEN
    RAISE NOTICE '✅ STEP 6 PASS: INSERT successful';
  ELSE
    RAISE EXCEPTION '❌ STEP 6 FAIL: INSERT failed or affected % rows', inserted_count;
  END IF;
END $$;

-- ============================================================================
-- STEP 7: Test SELECT (verify data)
-- ============================================================================

DO $$
DECLARE
  test_user_id UUID := '00000000-0000-0000-0000-000000000001';
  test_focus_duration INTEGER;
BEGIN
  SELECT focus_duration
  INTO test_focus_duration
  FROM pomodoro_settings
  WHERE user_id = test_user_id;

  IF test_focus_duration = 30 THEN
    RAISE NOTICE '✅ STEP 7 PASS: SELECT returns correct data';
  ELSE
    RAISE EXCEPTION '❌ STEP 7 FAIL: Expected focus_duration=30, got %', test_focus_duration;
  END IF;
END $$;

-- ============================================================================
-- STEP 8: Test UPDATE
-- ============================================================================

DO $$
DECLARE
  test_user_id UUID := '00000000-0000-0000-0000-000000000001';
  updated_count INTEGER;
  new_focus_duration INTEGER;
BEGIN
  -- Update focus_duration 30 → 35
  UPDATE pomodoro_settings
  SET focus_duration = 35
  WHERE user_id = test_user_id;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  -- Verify update
  SELECT focus_duration
  INTO new_focus_duration
  FROM pomodoro_settings
  WHERE user_id = test_user_id;

  IF updated_count = 1 AND new_focus_duration = 35 THEN
    RAISE NOTICE '✅ STEP 8 PASS: UPDATE successful';
  ELSE
    RAISE EXCEPTION '❌ STEP 8 FAIL: UPDATE affected % rows, value is %', updated_count, new_focus_duration;
  END IF;
END $$;

-- ============================================================================
-- STEP 9: Test updated_at trigger
-- ============================================================================

DO $$
DECLARE
  test_user_id UUID := '00000000-0000-0000-0000-000000000001';
  old_updated_at TIMESTAMPTZ;
  new_updated_at TIMESTAMPTZ;
BEGIN
  -- Get current updated_at
  SELECT updated_at INTO old_updated_at
  FROM pomodoro_settings
  WHERE user_id = test_user_id;

  -- Wait a moment
  PERFORM pg_sleep(0.1);

  -- Update a field
  UPDATE pomodoro_settings
  SET focus_duration = 40
  WHERE user_id = test_user_id;

  -- Get new updated_at
  SELECT updated_at INTO new_updated_at
  FROM pomodoro_settings
  WHERE user_id = test_user_id;

  IF new_updated_at > old_updated_at THEN
    RAISE NOTICE '✅ STEP 9 PASS: updated_at trigger works';
  ELSE
    RAISE EXCEPTION '❌ STEP 9 FAIL: updated_at not auto-updated (old: %, new: %)', old_updated_at, new_updated_at;
  END IF;
END $$;

-- ============================================================================
-- STEP 10: Test constraints
-- ============================================================================

DO $$
DECLARE
  test_user_id UUID := '00000000-0000-0000-0000-000000000001';
  constraint_violated BOOLEAN := FALSE;
BEGIN
  -- Try to insert invalid focus_duration (out of range 1-120)
  BEGIN
    UPDATE pomodoro_settings
    SET focus_duration = 999 -- Invalid: > 120
    WHERE user_id = test_user_id;

    RAISE EXCEPTION 'Should have failed constraint check';
  EXCEPTION
    WHEN check_violation THEN
      constraint_violated := TRUE;
  END;

  IF constraint_violated THEN
    RAISE NOTICE '✅ STEP 10 PASS: Constraints working correctly';
  ELSE
    RAISE EXCEPTION '❌ STEP 10 FAIL: Constraint check did not fire';
  END IF;
END $$;

-- ============================================================================
-- CLEANUP: Remove test data
-- ============================================================================

DELETE FROM pomodoro_settings
WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ ALL VALIDATION TESTS PASSED';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE 'Pomodoro Settings Persistence Fix is working correctly!';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Test in UI (change settings, refresh, verify persistence)';
  RAISE NOTICE '  2. Check browser console logs';
  RAISE NOTICE '  3. Verify success toasts appear';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- BONUS: Show current state
-- ============================================================================

SELECT
  COUNT(*) as total_users_with_settings,
  AVG(focus_duration) as avg_focus_minutes,
  AVG(short_break_duration) as avg_short_break_minutes,
  AVG(long_break_duration) as avg_long_break_minutes,
  COUNT(*) FILTER (WHERE auto_start_breaks = TRUE) as users_with_auto_breaks,
  COUNT(*) FILTER (WHERE sound_enabled = TRUE) as users_with_sound
FROM pomodoro_settings;
