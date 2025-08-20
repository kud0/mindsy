import { createClient } from '@supabase/supabase-js';
import type { Notification, NotificationCreate, NotificationUpdate, NotificationStats } from './types/notifications';

// Server-side notification service using service role
export class NotificationService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  // Create a new notification
  async create(notification: NotificationCreate): Promise<Notification | null> {
    const { data, error } = await this.supabase
      .from('notifications')
      .insert([notification])
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return null;
    }

    return data;
  }

  // Get notifications for a user
  async getForUser(userId: string, limit = 20, unreadOnly = false): Promise<Notification[]> {
    let query = this.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data, error } = await query;

    if (error) {
      // If table doesn't exist, return empty array instead of logging error
      if (error.code === '42P01') {
        console.log('Notifications table not yet created - returning empty notifications');
        return [];
      }
      console.error('Error fetching notifications:', error);
      return [];
    }

    return data || [];
  }

  // Mark notification as read
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }

    return true;
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }

    return true;
  }

  // Delete notification
  async delete(notificationId: string, userId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting notification:', error);
      return false;
    }

    return true;
  }

  // Get notification stats for a user
  async getStats(userId: string): Promise<NotificationStats | null> {
    const { data, error } = await this.supabase
      .from('notifications')
      .select('type, category, read')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching notification stats:', error);
      return null;
    }

    const stats: NotificationStats = {
      total: data.length,
      unread: data.filter(n => !n.read).length,
      by_category: { lecture: 0, upload: 0, system: 0, general: 0 },
      by_type: { info: 0, success: 0, warning: 0, error: 0 }
    };

    data.forEach(notification => {
      stats.by_category[notification.category as keyof typeof stats.by_category]++;
      stats.by_type[notification.type as keyof typeof stats.by_type]++;
    });

    return stats;
  }

  // Helper methods for common notification types
  async notifyLectureCompleted(userId: string, jobId: string, title: string) {
    return this.create({
      user_id: userId,
      title: 'Lecture Processing Complete',
      message: `Your lecture "${title}" has been successfully processed and is ready to view.`,
      type: 'success',
      category: 'lecture',
      related_id: jobId,
      related_type: 'job',
      action_url: `/dashboard/notes?note=${jobId}`
    });
  }

  async notifyLectureFailed(userId: string, jobId: string, title: string, error?: string) {
    return this.create({
      user_id: userId,
      title: 'Lecture Processing Failed',
      message: `Failed to process lecture "${title}". ${error ? `Error: ${error}` : 'Please try uploading again.'}`,
      type: 'error',
      category: 'lecture',
      related_id: jobId,
      related_type: 'job',
      action_url: `/dashboard/lectures`
    });
  }

  async notifyUploadReceived(userId: string, jobId: string, filename: string) {
    return this.create({
      user_id: userId,
      title: 'Upload Received',
      message: `Your file "${filename}" has been received and processing has started.`,
      type: 'info',
      category: 'upload',
      related_id: jobId,
      related_type: 'job'
    });
  }

  async notifySystemMaintenance(userId: string, message: string) {
    return this.create({
      user_id: userId,
      title: 'System Maintenance',
      message,
      type: 'warning',
      category: 'system'
    });
  }

  async notifyPomodoroFocusComplete(userId: string, sessionNote?: string, sessionDuration?: number) {
    if (!sessionNote || sessionNote.trim().length === 0) {
      // No notes written during focus session, don't create notification
      return null;
    }

    const notePreview = sessionNote.length > 100 
      ? sessionNote.substring(0, 100) + '...' 
      : sessionNote;

    const durationText = sessionDuration ? ` (${sessionDuration} min)` : '';

    return this.create({
      user_id: userId,
      title: '🍅 Focus Session Complete - Review Your Notes',
      message: `You wrote some thoughts during your focus session${durationText}: "${notePreview}"`,
      type: 'info',
      category: 'general',
      action_url: '/dashboard/pomodoro',
      metadata: {
        session_note: sessionNote,
        session_duration: sessionDuration,
        session_type: 'focus'
      }
    });
  }
}