export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message?: string;
  type: NotificationType;
  category: NotificationCategory;
  read: boolean;
  related_id?: string;
  related_type?: string;
  action_url?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type NotificationCategory = 'lecture' | 'upload' | 'system' | 'general';

export interface NotificationCreate {
  user_id: string;
  title: string;
  message?: string;
  type?: NotificationType;
  category?: NotificationCategory;
  related_id?: string;
  related_type?: string;
  action_url?: string;
  metadata?: Record<string, any>;
}

export interface NotificationUpdate {
  read?: boolean;
  metadata?: Record<string, any>;
}

export interface NotificationStats {
  total: number;
  unread: number;
  by_category: Record<NotificationCategory, number>;
  by_type: Record<NotificationType, number>;
}