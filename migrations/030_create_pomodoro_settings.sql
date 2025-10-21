-- Migration: Create Pomodoro Settings Table
-- Description: User-specific Pomodoro timer settings
-- Date: 2025-10-21

-- ============================================================================
-- TABLE: pomodoro_settings
-- Stores user preferences for Pomodoro timer functionality
-- ============================================================================

CREATE TABLE IF NOT EXISTS pomodoro_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Duration settings (in minutes)
  focus_duration INTEGER NOT NULL DEFAULT 25 CHECK (focus_duration > 0 AND focus_duration <= 120),
  short_break_duration INTEGER NOT NULL DEFAULT 5 CHECK (short_break_duration > 0 AND short_break_duration <= 60),
  long_break_duration INTEGER NOT NULL DEFAULT 15 CHECK (long_break_duration > 0 AND long_break_duration <= 120),

  -- Auto-start settings
  auto_start_breaks BOOLEAN NOT NULL DEFAULT FALSE,
  auto_start_focus BOOLEAN NOT NULL DEFAULT FALSE,

  -- Notification settings
  sound_enabled BOOLEAN NOT NULL DEFAULT TRUE,

  -- Goal settings
  daily_goal INTEGER NOT NULL DEFAULT 8 CHECK (daily_goal >= 0 AND daily_goal <= 50),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_pomodoro_settings_user_id ON pomodoro_settings(user_id);

-- Comments
COMMENT ON TABLE pomodoro_settings IS 'User-specific Pomodoro timer settings and preferences';
COMMENT ON COLUMN pomodoro_settings.focus_duration IS 'Focus session duration in minutes (1-120)';
COMMENT ON COLUMN pomodoro_settings.short_break_duration IS 'Short break duration in minutes (1-60)';
COMMENT ON COLUMN pomodoro_settings.long_break_duration IS 'Long break duration in minutes (1-120)';
COMMENT ON COLUMN pomodoro_settings.daily_goal IS 'Daily goal for completed Pomodoro sessions (0-50)';

-- ============================================================================
-- FUNCTION: Auto-update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_pomodoro_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
DROP TRIGGER IF EXISTS update_pomodoro_settings_timestamp ON pomodoro_settings;
CREATE TRIGGER update_pomodoro_settings_timestamp
  BEFORE UPDATE ON pomodoro_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_pomodoro_settings_updated_at();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE pomodoro_settings ENABLE ROW LEVEL SECURITY;

-- Users can view their own settings
DROP POLICY IF EXISTS "Users can view their own pomodoro settings" ON pomodoro_settings;
CREATE POLICY "Users can view their own pomodoro settings"
  ON pomodoro_settings FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own settings
DROP POLICY IF EXISTS "Users can insert their own pomodoro settings" ON pomodoro_settings;
CREATE POLICY "Users can insert their own pomodoro settings"
  ON pomodoro_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own settings
DROP POLICY IF EXISTS "Users can update their own pomodoro settings" ON pomodoro_settings;
CREATE POLICY "Users can update their own pomodoro settings"
  ON pomodoro_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own settings
DROP POLICY IF EXISTS "Users can delete their own pomodoro settings" ON pomodoro_settings;
CREATE POLICY "Users can delete their own pomodoro settings"
  ON pomodoro_settings FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- CLEANUP: Initialize settings for existing users
-- ============================================================================

-- Create default settings for users who have pomodoro sessions but no settings yet
INSERT INTO pomodoro_settings (user_id, created_at, updated_at)
SELECT DISTINCT ps.user_id, NOW(), NOW()
FROM pomodoro_sessions ps
WHERE NOT EXISTS (
  SELECT 1 FROM pomodoro_settings pset
  WHERE pset.user_id = ps.user_id
)
ON CONFLICT (user_id) DO NOTHING;

-- Verify migration
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM pomodoro_settings;
  RAISE NOTICE 'Migration complete. % pomodoro_settings records initialized.', v_count;
END $$;
