import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * POST /api/share
 * Share a lecture with friends (creates full copy for each recipient)
 *
 * Body: {
 *   job_id: string;
 *   friend_ids: string[];
 *   message?: string;
 * }
 */
export async function POST(request: NextRequest) {
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
    const { job_id, friend_ids, message } = body;

    // Validate required fields
    if (!job_id || !friend_ids || !Array.isArray(friend_ids) || friend_ids.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: job_id, friend_ids (array)' },
        { status: 400 }
      );
    }

    // Fetch the original job
    const { data: originalJob, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('job_id', job_id)
      .eq('user_id', user.id)
      .single();

    if (jobError || !originalJob) {
      return NextResponse.json(
        { error: 'Lecture not found or you do not have permission to share it' },
        { status: 404 }
      );
    }

    // Verify all friend_ids are actual friends
    const { data: friendships, error: friendError } = await supabase
      .from('user_connections')
      .select('user_id, friend_id')
      .eq('status', 'accepted')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    if (friendError) {
      return NextResponse.json(
        { error: 'Failed to verify friendships' },
        { status: 500 }
      );
    }

    // Extract friend IDs from connections
    const validFriendIds = new Set(
      friendships?.map(conn =>
        conn.user_id === user.id ? conn.friend_id : conn.user_id
      ) || []
    );

    // Filter out invalid friend IDs
    const validRecipients = friend_ids.filter(id => validFriendIds.has(id));

    if (validRecipients.length === 0) {
      return NextResponse.json(
        { error: 'No valid friends to share with' },
        { status: 400 }
      );
    }

    // Share with each friend (create copies)
    const sharedContent = [];
    const errors = [];

    for (const recipientId of validRecipients) {
      try {
        // Check if already shared
        const { data: existingShare } = await supabase
          .from('shared_content')
          .select('id, copied_job_id')
          .eq('owner_id', user.id)
          .eq('recipient_id', recipientId)
          .eq('source_job_id', job_id)
          .single();

        if (existingShare) {
          // Re-share: Delete old copy and create new one
          console.log(`Re-sharing: Deleting old copy ${existingShare.copied_job_id}`);

          // Delete old job copy
          const serviceClient = createServiceRoleClient();
          await serviceClient.from('jobs').delete().eq('job_id', existingShare.copied_job_id);

          // Delete old shared_content record
          await supabase.from('shared_content').delete().eq('id', existingShare.id);

          // Delete old storage file if exists
          try {
            await serviceClient.storage
              .from('generated-notes')
              .remove([`${existingShare.copied_job_id}.json`]);
          } catch (e) {
            console.log('Note: Could not delete old storage file');
          }
        }

        // Clone the job for the recipient
        // Use service role client to bypass RLS (we need to insert with different user_id)
        const serviceClient = createServiceRoleClient();

        // Copy ALL fields from original job (except system fields)
        const { job_id: originalJobId, user_id: originalUserId, created_at, updated_at, ...jobDataToCopy } = originalJob;

        const { data: copiedJob, error: copyError } = await serviceClient
          .from('jobs')
          .insert({
            ...jobDataToCopy,
            user_id: recipientId, // Override with recipient's ID
            lecture_title: `[Shared] ${originalJob.lecture_title}` // Add [Shared] prefix
          })
          .select()
          .single();

        if (copyError || !copiedJob) {
          console.error('Error cloning job:', copyError);
          errors.push({
            recipient_id: recipientId,
            error: 'Failed to create copy'
          });
          continue;
        }

        // Copy storage files if they exist (JSON study content)
        // The study content is stored as: generated-notes/{job_id}.json
        try {
          const { data: originalFile } = await serviceClient.storage
            .from('generated-notes')
            .download(`${job_id}.json`);

          if (originalFile) {
            // Upload to new location with new job_id
            await serviceClient.storage
              .from('generated-notes')
              .upload(`${copiedJob.job_id}.json`, originalFile, {
                contentType: 'application/json',
                upsert: true
              });
            console.log(`✅ Copied storage file: ${job_id}.json → ${copiedJob.job_id}.json`);

            // Update the json_file_path to point to the new file
            await serviceClient
              .from('jobs')
              .update({ json_file_path: `${copiedJob.job_id}.json` })
              .eq('job_id', copiedJob.job_id);
            console.log(`✅ Updated json_file_path to: ${copiedJob.job_id}.json`);
          }
        } catch (storageError) {
          console.log('Note: Could not copy storage file (may not exist):', storageError);
          // Non-critical error, continue anyway
        }

        // Create shared_content record
        const { data: share, error: shareError } = await supabase
          .from('shared_content')
          .insert({
            owner_id: user.id,
            recipient_id: recipientId,
            source_job_id: job_id,
            copied_job_id: copiedJob.job_id,
            title: originalJob.lecture_title,
            description: message || null
          })
          .select()
          .single();

        if (shareError) {
          console.error('Error creating share record:', shareError);
          errors.push({
            recipient_id: recipientId,
            error: 'Failed to create share record'
          });
          // Clean up the copied job (use service client)
          const serviceClient = createServiceRoleClient();
          await serviceClient.from('jobs').delete().eq('job_id', copiedJob.job_id);
          continue;
        }

        // Note: Notification is automatically created by database trigger

        sharedContent.push({
          recipient_id: recipientId,
          share_id: share.id,
          copied_job_id: copiedJob.job_id
        });
      } catch (error) {
        console.error(`Error sharing with ${recipientId}:`, error);
        errors.push({
          recipient_id: recipientId,
          error: 'Unexpected error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      shared_count: sharedContent.length,
      shared_with: sharedContent,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Unexpected error in POST /share:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/share
 * Get all shared content (sent and received)
 */
export async function GET(request: NextRequest) {
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

    // Get shares sent by user
    const { data: sentShares, error: sentError } = await supabase
      .from('shared_content')
      .select(`
        *,
        recipient:profiles!shared_content_recipient_id_fkey(id, full_name, email, avatar_url),
        source_job:jobs!shared_content_source_job_id_fkey(job_id, lecture_title, status, created_at)
      `)
      .eq('owner_id', user.id)
      .order('shared_at', { ascending: false });

    if (sentError) {
      console.error('Error fetching sent shares:', sentError);
    }

    // Get shares received by user
    const { data: receivedShares, error: receivedError } = await supabase
      .from('shared_content')
      .select(`
        *,
        owner:profiles!shared_content_owner_id_fkey(id, full_name, email, avatar_url),
        copied_job:jobs!shared_content_copied_job_id_fkey(job_id, lecture_title, status, created_at)
      `)
      .eq('recipient_id', user.id)
      .order('shared_at', { ascending: false });

    if (receivedError) {
      console.error('Error fetching received shares:', receivedError);
    }

    return NextResponse.json({
      success: true,
      sent: sentShares || [],
      received: receivedShares || []
    });
  } catch (error) {
    console.error('Unexpected error in GET /share:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
