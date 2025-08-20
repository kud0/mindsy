import type { APIRoute } from 'astro';
import { requireAuth } from '@/lib/supabase-server';
import { NotificationService } from '@/lib/notification-service';

// POST /api/notifications/demo - Create demo notifications for testing
export const POST: APIRoute = async ({ cookies }) => {
  try {
    const { user, response } = await requireAuth(cookies);
    if (response) return response;

    console.log('🔍 Demo notification API called for user:', user.id);
    
    const notificationService = new NotificationService();
    
    // Create a variety of demo notifications
    const demoNotifications = [
      {
        title: 'Welcome to MySummary!',
        message: 'Your account has been successfully created. Start uploading your lectures to generate Cornell Notes.',
        type: 'success' as const,
        category: 'system' as const,
        action_url: '/dashboard/lectures'
      },
      {
        title: 'Lecture Processing Complete',
        message: 'Your lecture "Introduction to Machine Learning" has been successfully processed.',
        type: 'success' as const,
        category: 'lecture' as const,
        related_id: 'demo-job-1',
        related_type: 'job',
        action_url: '/dashboard/notes?note=demo-job-1'
      },
      {
        title: 'Upload Received',
        message: 'Your file "economics_lecture_01.mp3" has been received and processing has started.',
        type: 'info' as const,
        category: 'upload' as const,
        related_id: 'demo-job-2',
        related_type: 'job'
      },
      {
        title: 'Processing Failed',
        message: 'Failed to process lecture "Physics Notes". The audio file appears to be corrupted. Please try uploading again.',
        type: 'error' as const,
        category: 'lecture' as const,
        related_id: 'demo-job-3',
        related_type: 'job',
        action_url: '/dashboard/lectures'
      },
      {
        title: 'Storage Limit Warning',
        message: 'You\'re approaching your storage limit. Consider upgrading to Student plan for unlimited storage.',
        type: 'warning' as const,
        category: 'system' as const,
        action_url: '/dashboard/account'
      }
    ];

    const createdNotifications = [];
    
    for (const notification of demoNotifications) {
      const created = await notificationService.create({
        user_id: user.id,
        ...notification
      });
      
      if (created) {
        createdNotifications.push(created);
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: `Created ${createdNotifications.length} demo notifications`,
      notifications: createdNotifications
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Demo notifications error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};