-- Migration: Activity Tracking & Daily Quest System
-- Description: Powers the hybrid profile widget with heatmap and quest features
-- Date: 2025-10-21

-- ============================================================================
-- TABLE: activity_log
-- Tracks all user activities for GitHub-style heatmap visualization
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Activity type counters
  pomodoros_completed INTEGER NOT NULL DEFAULT 0,
  questions_answered INTEGER NOT NULL DEFAULT 0,
  battles_played INTEGER NOT NULL DEFAULT 0,
  exams_taken INTEGER NOT NULL DEFAULT 0,
  lectures_processed INTEGER NOT NULL DEFAULT 0,
  content_shared INTEGER NOT NULL DEFAULT 0,

  -- Aggregated score for heatmap intensity (0-10+ scale)
  activity_score INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One record per user per day
  CONSTRAINT unique_user_activity_date UNIQUE (user_id, activity_date)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_activity_log_user_date ON activity_log(user_id, activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_score ON activity_log(activity_score DESC);

-- Comments
COMMENT ON TABLE activity_log IS 'Daily activity tracking for heatmap visualization and analytics';
COMMENT ON COLUMN activity_log.activity_score IS 'Weighted score: pomodoros*2 + questions/5 + battles*3 + exams*5';

-- ============================================================================
-- TABLE: daily_quests
-- Stores daily quest assignments and progress for gamification
-- ============================================================================

CREATE TABLE IF NOT EXISTS daily_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Quest 1: Focus-based (Pomodoro)
  quest1_type TEXT NOT NULL DEFAULT 'pomodoro',
  quest1_target INTEGER NOT NULL DEFAULT 4,
  quest1_current INTEGER NOT NULL DEFAULT 0,
  quest1_completed BOOLEAN NOT NULL DEFAULT FALSE,
  quest1_xp_reward INTEGER NOT NULL DEFAULT 50,

  -- Quest 2: Learning-based (Questions/Battles/Exams)
  quest2_type TEXT NOT NULL,
  quest2_target INTEGER NOT NULL,
  quest2_current INTEGER NOT NULL DEFAULT 0,
  quest2_completed BOOLEAN NOT NULL DEFAULT FALSE,
  quest2_xp_reward INTEGER NOT NULL DEFAULT 75,

  -- Quest 3: Social/Challenge-based
  quest3_type TEXT NOT NULL,
  quest3_target INTEGER NOT NULL,
  quest3_current INTEGER NOT NULL DEFAULT 0,
  quest3_completed BOOLEAN NOT NULL DEFAULT FALSE,
  quest3_xp_reward INTEGER NOT NULL DEFAULT 100,

  -- Completion tracking
  all_completed BOOLEAN NOT NULL DEFAULT FALSE,
  bonus_xp_claimed BOOLEAN NOT NULL DEFAULT FALSE,
  bonus_xp_amount INTEGER NOT NULL DEFAULT 200,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One set of quests per user per day
  CONSTRAINT unique_user_quest_date UNIQUE (user_id, quest_date),

  -- Valid quest types
  CONSTRAINT valid_quest1_type CHECK (quest1_type IN ('pomodoro', 'study_time')),
  CONSTRAINT valid_quest2_type CHECK (quest2_type IN ('questions', 'battle', 'exam', 'quiz')),
  CONSTRAINT valid_quest3_type CHECK (quest3_type IN ('battle_win', 'share_content', 'help_friend', 'perfect_score'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_quests_user_date ON daily_quests(user_id, quest_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_quests_active ON daily_quests(user_id, quest_date) WHERE NOT all_completed;

-- Comments
COMMENT ON TABLE daily_quests IS 'Daily quest system for gamified learning goals';
COMMENT ON COLUMN daily_quests.all_completed IS 'True when all 3 quests completed (triggers bonus XP)';

-- ============================================================================
-- FUNCTION: Update activity log
-- Automatically increments activity counters and recalculates score
-- ============================================================================

CREATE OR REPLACE FUNCTION log_user_activity(
  p_user_id UUID,
  p_activity_type TEXT,
  p_increment INTEGER DEFAULT 1
)
RETURNS VOID AS $$
DECLARE
  v_new_score INTEGER;
BEGIN
  -- Insert or update today's activity record
  INSERT INTO activity_log (
    user_id,
    activity_date,
    pomodoros_completed,
    questions_answered,
    battles_played,
    exams_taken,
    lectures_processed,
    content_shared
  )
  VALUES (
    p_user_id,
    CURRENT_DATE,
    CASE WHEN p_activity_type = 'pomodoro' THEN p_increment ELSE 0 END,
    CASE WHEN p_activity_type = 'question' THEN p_increment ELSE 0 END,
    CASE WHEN p_activity_type = 'battle' THEN p_increment ELSE 0 END,
    CASE WHEN p_activity_type = 'exam' THEN p_increment ELSE 0 END,
    CASE WHEN p_activity_type = 'lecture' THEN p_increment ELSE 0 END,
    CASE WHEN p_activity_type = 'share' THEN p_increment ELSE 0 END
  )
  ON CONFLICT (user_id, activity_date) DO UPDATE SET
    pomodoros_completed = activity_log.pomodoros_completed +
      CASE WHEN p_activity_type = 'pomodoro' THEN p_increment ELSE 0 END,
    questions_answered = activity_log.questions_answered +
      CASE WHEN p_activity_type = 'question' THEN p_increment ELSE 0 END,
    battles_played = activity_log.battles_played +
      CASE WHEN p_activity_type = 'battle' THEN p_increment ELSE 0 END,
    exams_taken = activity_log.exams_taken +
      CASE WHEN p_activity_type = 'exam' THEN p_increment ELSE 0 END,
    lectures_processed = activity_log.lectures_processed +
      CASE WHEN p_activity_type = 'lecture' THEN p_increment ELSE 0 END,
    content_shared = activity_log.content_shared +
      CASE WHEN p_activity_type = 'share' THEN p_increment ELSE 0 END,
    updated_at = NOW();

  -- Recalculate activity score using weighted formula
  UPDATE activity_log SET
    activity_score = (
      pomodoros_completed * 2 +
      FLOOR(questions_answered / 5.0) +
      battles_played * 3 +
      exams_taken * 5 +
      lectures_processed * 2 +
      content_shared
    )
  WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Update quest progress
-- Automatically updates quest counters and marks completion
-- ============================================================================

CREATE OR REPLACE FUNCTION update_quest_progress(
  p_user_id UUID,
  p_quest_type TEXT,
  p_increment INTEGER DEFAULT 1
)
RETURNS VOID AS $$
DECLARE
  v_quest_record RECORD;
BEGIN
  -- Get today's quest record
  SELECT * INTO v_quest_record
  FROM daily_quests
  WHERE user_id = p_user_id AND quest_date = CURRENT_DATE;

  -- If no quests exist for today, skip (they'll be generated on first widget load)
  IF v_quest_record IS NULL THEN
    RETURN;
  END IF;

  -- Update appropriate quest based on type match
  UPDATE daily_quests SET
    -- Quest 1 (Pomodoro/Study)
    quest1_current = CASE
      WHEN quest1_type = p_quest_type THEN LEAST(quest1_current + p_increment, quest1_target)
      ELSE quest1_current
    END,
    quest1_completed = CASE
      WHEN quest1_type = p_quest_type THEN (quest1_current + p_increment >= quest1_target)
      ELSE quest1_completed
    END,

    -- Quest 2 (Learning)
    quest2_current = CASE
      WHEN quest2_type = p_quest_type OR
           (quest2_type = 'questions' AND p_quest_type IN ('battle', 'exam', 'quiz'))
      THEN LEAST(quest2_current + p_increment, quest2_target)
      ELSE quest2_current
    END,
    quest2_completed = CASE
      WHEN quest2_type = p_quest_type OR
           (quest2_type = 'questions' AND p_quest_type IN ('battle', 'exam', 'quiz'))
      THEN (quest2_current + p_increment >= quest2_target)
      ELSE quest2_completed
    END,

    -- Quest 3 (Social/Challenge)
    quest3_current = CASE
      WHEN quest3_type = p_quest_type THEN LEAST(quest3_current + p_increment, quest3_target)
      ELSE quest3_current
    END,
    quest3_completed = CASE
      WHEN quest3_type = p_quest_type THEN (quest3_current + p_increment >= quest3_target)
      ELSE quest3_completed
    END,

    updated_at = NOW()
  WHERE user_id = p_user_id AND quest_date = CURRENT_DATE;

  -- Check if all quests are now completed
  UPDATE daily_quests SET
    all_completed = (quest1_completed AND quest2_completed AND quest3_completed)
  WHERE user_id = p_user_id AND quest_date = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Generate daily quests
-- Creates randomized quests for a user if they don't exist for today
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_daily_quests(p_user_id UUID)
RETURNS TABLE (
  quest1_type TEXT,
  quest1_target INTEGER,
  quest1_xp INTEGER,
  quest2_type TEXT,
  quest2_target INTEGER,
  quest2_xp INTEGER,
  quest3_type TEXT,
  quest3_target INTEGER,
  quest3_xp INTEGER
) AS $$
DECLARE
  v_quest2_options TEXT[] := ARRAY['questions', 'battle', 'exam'];
  v_quest3_options TEXT[] := ARRAY['battle_win', 'share_content', 'perfect_score'];
  v_selected_quest2 TEXT;
  v_selected_quest3 TEXT;
  v_quest2_target INTEGER;
  v_quest3_target INTEGER;
BEGIN
  -- Check if quests already exist for today
  IF EXISTS (SELECT 1 FROM daily_quests WHERE user_id = p_user_id AND quest_date = CURRENT_DATE) THEN
    -- Return existing quests
    RETURN QUERY
    SELECT
      dq.quest1_type, dq.quest1_target, dq.quest1_xp_reward,
      dq.quest2_type, dq.quest2_target, dq.quest2_xp_reward,
      dq.quest3_type, dq.quest3_target, dq.quest3_xp_reward
    FROM daily_quests dq
    WHERE dq.user_id = p_user_id AND dq.quest_date = CURRENT_DATE;
  ELSE
    -- Generate new random quests
    v_selected_quest2 := v_quest2_options[1 + floor(random() * 3)::int];
    v_selected_quest3 := v_quest3_options[1 + floor(random() * 3)::int];

    -- Set targets based on quest type
    v_quest2_target := CASE v_selected_quest2
      WHEN 'questions' THEN 20
      WHEN 'battle' THEN 1
      WHEN 'exam' THEN 1
    END;

    v_quest3_target := CASE v_selected_quest3
      WHEN 'battle_win' THEN 1
      WHEN 'share_content' THEN 1
      WHEN 'perfect_score' THEN 1
    END;

    -- Insert new quest record
    INSERT INTO daily_quests (
      user_id, quest_date,
      quest1_type, quest1_target, quest1_xp_reward,
      quest2_type, quest2_target, quest2_xp_reward,
      quest3_type, quest3_target, quest3_xp_reward
    ) VALUES (
      p_user_id, CURRENT_DATE,
      'pomodoro', 4, 50,
      v_selected_quest2, v_quest2_target, 75,
      v_selected_quest3, v_quest3_target, 100
    );

    -- Return generated quests
    RETURN QUERY
    SELECT
      'pomodoro'::TEXT, 4, 50,
      v_selected_quest2, v_quest2_target, 75,
      v_selected_quest3, v_quest3_target, 100;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS: Auto-log activities from existing tables
-- ============================================================================

-- Trigger: Log pomodoro completion
CREATE OR REPLACE FUNCTION trigger_log_pomodoro()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.was_completed = TRUE AND NEW.type = 'focus' THEN
    PERFORM log_user_activity(NEW.user_id, 'pomodoro', 1);
    PERFORM update_quest_progress(NEW.user_id, 'pomodoro', 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_pomodoro_activity ON pomodoro_sessions;
CREATE TRIGGER log_pomodoro_activity
  AFTER INSERT OR UPDATE ON pomodoro_sessions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_pomodoro();

-- Trigger: Log battle participation
CREATE OR REPLACE FUNCTION trigger_log_battle()
RETURNS TRIGGER AS $$
BEGIN
  -- Log battle played
  PERFORM log_user_activity(NEW.user_id, 'battle', 1);
  PERFORM update_quest_progress(NEW.user_id, 'battle', 1);

  -- Log questions answered (count from round)
  DECLARE
    v_question_count INTEGER;
  BEGIN
    SELECT jsonb_array_length(questions) INTO v_question_count
    FROM battle_rounds
    WHERE battle_id = NEW.battle_id AND round_number = NEW.round_number;

    IF v_question_count IS NOT NULL THEN
      PERFORM log_user_activity(NEW.user_id, 'question', v_question_count);
      PERFORM update_quest_progress(NEW.user_id, 'questions', v_question_count);
    END IF;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_battle_activity ON battle_participants;
CREATE TRIGGER log_battle_activity
  AFTER INSERT ON battle_participants
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_battle();

-- Trigger: Log exam completion
CREATE OR REPLACE FUNCTION trigger_log_exam()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    PERFORM log_user_activity(NEW.user_id, 'exam', 1);
    PERFORM update_quest_progress(NEW.user_id, 'exam', 1);

    -- Check for perfect score quest
    IF NEW.percentage >= 100 THEN
      PERFORM update_quest_progress(NEW.user_id, 'perfect_score', 1);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_exam_activity ON exam_attempts;
CREATE TRIGGER log_exam_activity
  AFTER UPDATE ON exam_attempts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_exam();

-- Trigger: Log shared content
CREATE OR REPLACE FUNCTION trigger_log_share()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM log_user_activity(NEW.shared_by_id, 'share', 1);
  PERFORM update_quest_progress(NEW.shared_by_id, 'share_content', 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_share_activity ON shared_content;
CREATE TRIGGER log_share_activity
  AFTER INSERT ON shared_content
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_share();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_quests ENABLE ROW LEVEL SECURITY;

-- activity_log policies
CREATE POLICY "Users can view their own activity log"
  ON activity_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage activity log"
  ON activity_log FOR ALL
  USING (true) WITH CHECK (true);

-- daily_quests policies
CREATE POLICY "Users can view their own quests"
  ON daily_quests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage quests"
  ON daily_quests FOR ALL
  USING (true) WITH CHECK (true);

-- ============================================================================
-- CLEANUP: Update existing data
-- ============================================================================

-- Backfill activity data from pomodoro sessions (last 30 days)
DO $$
DECLARE
  v_user RECORD;
  v_date DATE;
  v_count INTEGER;
BEGIN
  FOR v_user IN SELECT DISTINCT user_id FROM pomodoro_sessions
  LOOP
    FOR v_date IN
      SELECT DISTINCT DATE(started_at) as session_date
      FROM pomodoro_sessions
      WHERE user_id = v_user.user_id
        AND started_at >= CURRENT_DATE - INTERVAL '30 days'
        AND type = 'focus'
        AND was_completed = TRUE
    LOOP
      SELECT COUNT(*) INTO v_count
      FROM pomodoro_sessions
      WHERE user_id = v_user.user_id
        AND DATE(started_at) = v_date
        AND type = 'focus'
        AND was_completed = TRUE;

      PERFORM log_user_activity(v_user.user_id, 'pomodoro', v_count);
    END LOOP;
  END LOOP;
END $$;

COMMENT ON FUNCTION log_user_activity IS 'Logs user activity and updates daily activity score';
COMMENT ON FUNCTION update_quest_progress IS 'Updates quest progress and marks completion';
COMMENT ON FUNCTION generate_daily_quests IS 'Generates or retrieves daily quests for a user';
