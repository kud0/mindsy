/**
 * Type definitions for Profile Widget components
 *
 * These types are used across ActivityHeatmap, DailyQuests, and other profile-related components.
 */

// ==================== ActivityHeatmap Types ====================

/**
 * Represents a single day's activity data in the heatmap
 */
export interface ActivityDay {
  /** ISO date string (YYYY-MM-DD) */
  date: string;
  /** Number of pomodoro sessions completed */
  pomodoros: number;
  /** Number of questions answered */
  questions: number;
  /** Number of quiz battles completed */
  battles: number;
  /** Number of exams taken */
  exams: number;
  /** Total activity score (calculated from all activities) */
  score: number;
  /** Visual intensity level for the heatmap cell */
  intensity: ActivityIntensity;
}

/**
 * Intensity levels for activity visualization
 */
export type ActivityIntensity = 'none' | 'low' | 'medium' | 'high';

/**
 * Color configuration for each intensity level
 */
export interface IntensityColor {
  bg: string;
  hover: string;
  border: string;
}

/**
 * Statistics calculated from activity data
 */
export interface ActivityStats {
  /** Total number of days in the dataset */
  totalDays: number;
  /** Number of days with activity (score > 0) */
  activeDays: number;
  /** Sum of all daily scores */
  totalScore: number;
  /** Average score across all days */
  averageScore: number;
  /** Current consecutive days with activity */
  currentStreak: number;
  /** Day with highest activity score */
  mostActiveDay: ActivityDay | null;
  /** Percentage of active days (0-100) */
  activityRate: number;
}

/**
 * Weekly activity totals
 */
export interface WeeklyTotal {
  /** Week identifier (W1, W2, etc.) */
  name: string;
  /** Total score for the week */
  total: number;
}

// ==================== DailyQuests Types ====================

/**
 * Represents a single daily quest
 */
export interface Quest {
  /** Unique quest identifier */
  id: number;
  /** Quest type (used for categorization and icons) */
  type: QuestType;
  /** Quest title displayed to user */
  title: string;
  /** Detailed quest description */
  description: string;
  /** Target value to complete the quest */
  target: number;
  /** Current progress value */
  current: number;
  /** Whether the quest is completed */
  completed: boolean;
  /** XP reward amount for completion */
  xpReward: number;
  /** Emoji icon for the quest */
  icon: string;
  /** Optional navigation route for action button */
  action?: string;
  /** Optional label for action button */
  actionLabel?: string;
}

/**
 * Types of quests available
 */
export type QuestType =
  | 'pomodoro'
  | 'questions'
  | 'battle'
  | 'battle_win'       // Win a quiz battle (social quest)
  | 'share_content'    // Share content with friend (social quest)
  | 'perfect_score'    // Get perfect score in battle (social quest)
  | 'exam'
  | 'study'
  | 'lecture'
  | 'streak'
  | 'social';           // General social activity

/**
 * Quest completion state
 */
export interface QuestProgress {
  /** Current progress value */
  current: number;
  /** Target value to complete */
  target: number;
  /** Percentage complete (0-100) */
  percentage: number;
  /** Whether the quest is complete */
  completed: boolean;
}

// ==================== User Profile Types ====================

/**
 * User profile data for the profile widget
 */
export interface UserProfile {
  /** User ID from auth */
  id: string;
  /** Display name */
  name: string;
  /** User email */
  email: string;
  /** Avatar URL (optional) */
  avatarUrl?: string;
  /** User initials (derived from name/email) */
  initials: string;
  /** Membership tier */
  tier: 'free' | 'pro' | 'premium';
  /** Total XP points */
  xp: number;
  /** User level */
  level: number;
  /** Current streak count */
  streak: number;
}

/**
 * Activity ring data (Apple Watch style)
 */
export interface ActivityRing {
  /** Completed value */
  completed: number;
  /** Total target value */
  total: number;
  /** Ring color (CSS color string) */
  color: string;
  /** Ring label */
  label: string;
}

/**
 * Complete activity ring set
 */
export interface ActivityRings {
  study: ActivityRing;
  exams: ActivityRing;
  streak: ActivityRing;
}

// ==================== Database Schema Types ====================

/**
 * Database row type for user_activity table
 */
export interface UserActivityRow {
  id: string;
  user_id: string;
  date: string;
  pomodoros: number;
  questions: number;
  battles: number;
  exams: number;
  score: number;
  created_at: string;
  updated_at: string;
}

/**
 * Insert type for user_activity table
 */
export interface UserActivityInsert {
  user_id: string;
  date: string;
  pomodoros?: number;
  questions?: number;
  battles?: number;
  exams?: number;
  score?: number;
}

/**
 * Update type for user_activity table
 */
export interface UserActivityUpdate {
  pomodoros?: number;
  questions?: number;
  battles?: number;
  exams?: number;
  score?: number;
  updated_at?: string;
}

// ==================== API Types ====================

/**
 * Request to fetch activity data
 */
export interface FetchActivityRequest {
  userId: string;
  startDate: string;
  endDate: string;
}

/**
 * Response from fetching activity data
 */
export interface FetchActivityResponse {
  data: ActivityDay[];
  stats: ActivityStats;
}

/**
 * Request to increment activity
 */
export interface IncrementActivityRequest {
  userId: string;
  date: string;
  activityType: 'pomodoros' | 'questions' | 'battles' | 'exams';
  amount: number;
}

/**
 * Response from incrementing activity
 */
export interface IncrementActivityResponse {
  success: boolean;
  newScore: number;
  message?: string;
}

// ==================== Component Props Types ====================

/**
 * Props for ActivityHeatmap component
 */
export interface ActivityHeatmapProps {
  /** Array of activity data for the last 28 days */
  data: ActivityDay[];
  /** Optional callback when a day is clicked */
  onDayClick?: (date: string) => void;
}

/**
 * Props for DailyQuests component
 */
export interface DailyQuestsProps {
  /** Array of quest objects */
  quests: Quest[];
  /** Whether all quests are completed */
  allCompleted: boolean;
  /** Bonus XP amount for completing all quests */
  bonusXP: number;
  /** Whether bonus has been claimed */
  bonusClaimed: boolean;
  /** Optional callback when bonus is claimed */
  onClaimBonus?: () => void;
}

// ==================== Utility Types ====================

/**
 * Generic success/error response
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Loading state wrapper
 */
export interface LoadingState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Date range for queries
 */
export interface DateRange {
  startDate: string;
  endDate: string;
}

// ==================== Constants ====================

/**
 * Activity scoring weights
 */
export const ACTIVITY_SCORES = {
  POMODORO: 2,
  QUESTION_BATCH: 5, // Points per 5 questions
  BATTLE: 3,
  EXAM: 5,
} as const;

/**
 * Intensity thresholds
 */
export const INTENSITY_THRESHOLDS = {
  LOW: 3,
  MEDIUM: 7,
  HIGH: 8,
} as const;

/**
 * Default quest definitions
 */
export const DEFAULT_QUESTS: Omit<Quest, 'id' | 'current' | 'completed'>[] = [
  {
    type: 'pomodoro',
    title: 'Complete 4 Pomodoros',
    description: 'Focus deeply with timed sessions',
    target: 4,
    xpReward: 50,
    icon: '🍅',
    action: '/dashboard/pomodoro',
    actionLabel: 'Start Pomodoro',
  },
  {
    type: 'questions',
    title: 'Answer 20 Questions',
    description: 'Test your knowledge',
    target: 20,
    xpReward: 75,
    icon: '📝',
    action: '/dashboard/study',
    actionLabel: 'Study Now',
  },
  {
    type: 'battle',
    title: 'Win a Quiz Battle',
    description: 'Challenge a friend',
    target: 1,
    xpReward: 100,
    icon: '⚔️',
    action: '/dashboard/battles',
    actionLabel: 'Find Battle',
  },
] as const;

// ==================== Type Guards ====================

/**
 * Check if a value is a valid ActivityIntensity
 */
export function isActivityIntensity(value: any): value is ActivityIntensity {
  return ['none', 'low', 'medium', 'high'].includes(value);
}

/**
 * Check if a value is a valid QuestType
 */
export function isQuestType(value: any): value is QuestType {
  return [
    'pomodoro',
    'questions',
    'battle',
    'battle_win',
    'share_content',
    'perfect_score',
    'exam',
    'study',
    'lecture',
    'streak',
    'social',
  ].includes(value);
}

/**
 * Check if an activity day is valid
 */
export function isValidActivityDay(value: any): value is ActivityDay {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.date === 'string' &&
    typeof value.pomodoros === 'number' &&
    typeof value.questions === 'number' &&
    typeof value.battles === 'number' &&
    typeof value.exams === 'number' &&
    typeof value.score === 'number' &&
    isActivityIntensity(value.intensity)
  );
}

/**
 * Check if a quest is valid
 */
export function isValidQuest(value: any): value is Quest {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.id === 'number' &&
    isQuestType(value.type) &&
    typeof value.title === 'string' &&
    typeof value.description === 'string' &&
    typeof value.target === 'number' &&
    typeof value.current === 'number' &&
    typeof value.completed === 'boolean' &&
    typeof value.xpReward === 'number' &&
    typeof value.icon === 'string'
  );
}
