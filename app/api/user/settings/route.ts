import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * PATCH /api/user/settings
 * Update user notification settings
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { email_notifications, study_reminders, friend_notifications } = body;

    // Validation
    const updateData: any = {};

    if (email_notifications !== undefined) {
      if (typeof email_notifications !== 'boolean') {
        return NextResponse.json(
          { error: 'email_notifications must be a boolean' },
          { status: 400 }
        );
      }
      updateData.email_notifications = email_notifications;
    }

    if (study_reminders !== undefined) {
      if (typeof study_reminders !== 'boolean') {
        return NextResponse.json(
          { error: 'study_reminders must be a boolean' },
          { status: 400 }
        );
      }
      updateData.study_reminders = study_reminders;
    }

    if (friend_notifications !== undefined) {
      if (typeof friend_notifications !== 'boolean') {
        return NextResponse.json(
          { error: 'friend_notifications must be a boolean' },
          { status: 400 }
        );
      }
      updateData.friend_notifications = friend_notifications;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No settings to update' },
        { status: 400 }
      );
    }

    // Update settings
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id);

    if (updateError) {
      console.error('Settings update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      settings: updateData,
    });
  } catch (error) {
    console.error('Unexpected error in settings update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
