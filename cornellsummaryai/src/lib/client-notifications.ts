/**
 * Client-side notification helpers
 * These functions make API calls to create notifications from the browser
 */

interface PomodoroNotificationData {
  sessionNote?: string;
  sessionDuration?: number;
}

export class ClientNotificationService {
  /**
   * Notify when a focus session completes with notes
   */
  static async notifyPomodoroFocusComplete({ sessionNote, sessionDuration }: PomodoroNotificationData) {
    // Only create notification if there are notes
    if (!sessionNote || sessionNote.trim().length === 0) {
      console.log('No notes written during focus session - skipping notification');
      return;
    }

    try {
      console.log('Creating Pomodoro focus complete notification...', { 
        noteLength: sessionNote.length, 
        sessionDuration 
      });

      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: '🍅 Focus Session Complete - Review Your Notes',
          message: `You wrote some thoughts during your ${sessionDuration || 25} min focus session: "${sessionNote.length > 100 ? sessionNote.substring(0, 100) + '...' : sessionNote}"`,
          type: 'info',
          category: 'general',
          action_url: '/dashboard/pomodoro',
          metadata: {
            session_note: sessionNote,
            session_duration: sessionDuration,
            session_type: 'focus'
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Pomodoro notification created:', result);
        
        // Optionally dispatch event for UI components listening to notifications
        window.dispatchEvent(new CustomEvent('new-notification', { 
          detail: result.notification 
        }));
      } else {
        console.error('Failed to create Pomodoro notification:', response.status);
      }
    } catch (error) {
      console.error('Error creating Pomodoro notification:', error);
    }
  }

  /**
   * Create a generic notification from the client
   */
  static async createNotification({
    title,
    message,
    type = 'info',
    category = 'general',
    action_url,
    metadata = {}
  }: {
    title: string;
    message?: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    category?: 'lecture' | 'upload' | 'system' | 'general';
    action_url?: string;
    metadata?: Record<string, any>;
  }) {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          message,
          type,
          category,
          action_url,
          metadata
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Notification created:', result);
        
        // Dispatch event for UI updates
        window.dispatchEvent(new CustomEvent('new-notification', { 
          detail: result.notification 
        }));
        
        return result.notification;
      } else {
        console.error('Failed to create notification:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  }
}