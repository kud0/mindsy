// Database types for migrated components

export interface Note {
  job_id: string;
  lecture_title: string;
  course_subject: string | null;
  created_at: string;
  status: string;
  marked_for_review?: boolean;
  review_reason?: string | null;
  user_folder_id?: string | null;
  user_id?: string;
  user_folders?: {
    id: string;
    folder_name: string;
  } | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  plan: 'free' | 'student' | 'premium';
}

// Pomodoro System Types
export type SessionType = 'focus' | 'shortBreak' | 'longBreak';

export interface PomodoroSettings {
  user_id: string;
  focus_duration: number;
  short_break_duration: number;
  long_break_duration: number;
  auto_start_breaks: boolean;
  auto_start_focus: boolean;
  sound_enabled: boolean;
  daily_goal: number;
  created_at: string;
  updated_at: string;
}

export interface PomodoroSession {
  id: string;
  user_id: string;
  type: SessionType;
  started_at: string;
  completed_at?: string;
  duration: number;
  note?: string;
  was_completed: boolean;
  lecture_id?: string; // NEW: Track which lecture was being studied
  created_at: string;
}

export interface StudyTimeLog {
  lecture_id: string;
  total_study_time: number; // in minutes
  session_count: number;
  last_studied: string;
  first_studied: string;
}

// Study Schedule System Types
export interface StudySession {
  id: string;
  user_id: string;
  title: string;
  start_time: string;
  end_time: string;
  session_type: 'lecture' | 'study' | 'review' | 'exam-prep' | 'break';
  subject?: string;
  description?: string;
  lecture_id?: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

// Exam System Types - Database Schema Compatible
export interface Exam {
  id: string;
  user_id: string;
  user_folder_id?: string | null;
  folder_name?: string | null;
  title: string;
  questions: ExamQuestion[];
  question_count: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  source_note_ids: string[];
  created_at: string;
  expires_at?: string;
  is_active: boolean;
}

export interface ExamQuestion {
  id: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: string;
  explanation: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  sourceNote?: string;
}

export interface ExamAttempt {
  id: string;
  exam_id: string;
  user_id: string;
  started_at: string;
  completed_at?: string;
  answers: Record<string, string>;
  score?: number;
  percentage?: number;
  correct_count?: number;
  incorrect_count?: number;
  time_spent?: number; // in seconds
  performance_by_topic?: Record<string, { correct: number; total: number }>;
  status: 'in_progress' | 'completed' | 'abandoned';
}

export interface UserPerformance {
  id: string;
  user_id: string;
  folder_id: string;
  total_exams_taken: number;
  average_score: number;
  best_score: number;
  current_streak: number;
  longest_streak: number;
  last_exam_date?: string;
  weak_topics?: string[];
  strong_topics?: string[];
  total_study_time: number; // in seconds
  xp_points: number;
  level: number;
  updated_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_type: string;
  achievement_name: string;
  achievement_description?: string;
  earned_at: string;
  exam_id?: string;
}

// Quiz Battle System Types
export interface Battle {
  id: string;
  created_by: string;
  opponent_id: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  source_folder_id: string;
  source_folder_name: string;
  rounds_count: number;
  questions_per_round: number;
  winner_id?: string | null;
  created_at: string;
  completed_at?: string | null;
}

export interface BattleRound {
  id: string;
  battle_id: string;
  round_number: number;
  questions: BattleQuestion[];
  started_at: string;
  completed_at?: string | null;
}

export interface BattleQuestion {
  id: string;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation: string; // Explanation of why the correct answer is right
  sourceNote?: string; // Optional: Which lecture this question came from
}

export interface BattleParticipant {
  id: string;
  battle_id: string;
  user_id: string;
  round_number: number;
  answers: Record<string, string>;
  score: number;
  time_taken: number;
  submitted_at: string;
}

export interface BattleStats {
  user_id: string;
  total_battles: number;
  wins: number;
  losses: number;
  draws: number;
  weak_topics: Record<string, number>;
  strong_topics: Record<string, number>;
  last_battle_at: string;
  updated_at: string;
}

// Notification System Types
export type NotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'content_shared'
  | 'battle_turn'
  | 'battle_round_ready'
  | 'battle_accepted'
  | 'battle_declined'
  | 'battle_complete'
  | 'achievement'
  | 'system';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  read_at?: string | null;
  related_id?: string | null;
  related_user_id?: string | null;
  action_url?: string | null;
  metadata?: Record<string, any>;
}