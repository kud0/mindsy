import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * PATCH /api/user/profile
 * Update user profile information (display_name, bio)
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
    const { display_name, bio } = body;

    // Validation
    if (display_name !== undefined) {
      if (typeof display_name !== 'string') {
        return NextResponse.json(
          { error: 'Display name must be a string' },
          { status: 400 }
        );
      }
      if (display_name.trim().length < 3) {
        return NextResponse.json(
          { error: 'Display name must be at least 3 characters' },
          { status: 400 }
        );
      }
      if (display_name.trim().length > 50) {
        return NextResponse.json(
          { error: 'Display name must be less than 50 characters' },
          { status: 400 }
        );
      }
    }

    if (bio !== undefined && bio !== null) {
      if (typeof bio !== 'string') {
        return NextResponse.json(
          { error: 'Bio must be a string' },
          { status: 400 }
        );
      }
      if (bio.length > 200) {
        return NextResponse.json(
          { error: 'Bio must be less than 200 characters' },
          { status: 400 }
        );
      }
    }

    // Update profile
    const updateData: any = {};
    if (display_name !== undefined) {
      updateData.display_name = display_name.trim();
    }
    if (bio !== undefined) {
      updateData.bio = bio === null ? null : bio.trim();
    }

    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Profile update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        email: profile.email,
        display_name: profile.display_name,
        bio: profile.bio,
        avatar_url: profile.avatar_url,
        subscription_tier: profile.subscription_tier,
        email_notifications: profile.email_notifications,
        study_reminders: profile.study_reminders,
        friend_notifications: profile.friend_notifications,
      },
    });
  } catch (error) {
    console.error('Unexpected error in profile update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
