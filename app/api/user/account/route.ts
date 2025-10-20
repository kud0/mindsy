import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * DELETE /api/user/account
 * Permanently delete user account and all associated data
 * WARNING: This is irreversible!
 */
export async function DELETE(request: NextRequest) {
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

    // Delete user data in order (due to foreign key constraints)
    // 1. Delete shared content (both sent and received)
    await supabase
      .from('shared_content')
      .delete()
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    // 2. Delete notifications
    await supabase
      .from('notifications')
      .delete()
      .or(`user_id.eq.${user.id},sender_id.eq.${user.id}`);

    // 3. Delete friend connections
    await supabase
      .from('user_connections')
      .delete()
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    // 4. Delete course enrollments
    await supabase
      .from('course_enrollments')
      .delete()
      .eq('user_id', user.id);

    // 5. Delete user folders
    await supabase
      .from('user_folders')
      .delete()
      .eq('user_id', user.id);

    // 6. Delete notes
    await supabase
      .from('notes')
      .delete()
      .eq('user_id', user.id);

    // 7. Delete study nodes (lectures)
    await supabase
      .from('study_nodes')
      .delete()
      .eq('user_id', user.id);

    // 8. Delete profile (will cascade to other related tables)
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id);

    if (profileError) {
      console.error('Profile deletion error:', profileError);
      // Continue anyway - we'll still delete the auth user
    }

    // 9. Delete Supabase auth user (this is the final step)
    // Note: This requires service role key in production
    // For now, we'll use the admin API
    const { error: authError } = await supabase.auth.admin.deleteUser(user.id);

    if (authError) {
      console.error('Auth user deletion error:', authError);
      // If we can't delete auth user, return error
      return NextResponse.json(
        { error: 'Failed to delete authentication account. Please contact support.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    console.error('Unexpected error in account deletion:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
