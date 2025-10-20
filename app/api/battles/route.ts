import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/battles
 * Get all battles for the current user
 * Query params: ?filter=pending|active|completed
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

    // Get status filter from query params (changed from 'filter' to 'status' to match UI)
    const searchParams = request.nextUrl.searchParams;
    const statusFilter = searchParams.get('status');

    console.log('🔍 [API] Building battle query:', {
      userId: user.id,
      statusFilter,
      isValidStatus: statusFilter && ['pending', 'active', 'completed'].includes(statusFilter)
    });

    // Build query - fetch battles first (EXCLUDE cancelled by default)
    let query = supabase
      .from('quiz_battles')
      .select('*')
      .or(`created_by.eq.${user.id},opponent_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    // Apply status filter if provided (exclude 'cancelled' from filter options)
    if (statusFilter && ['pending', 'active', 'completed'].includes(statusFilter)) {
      query = query.eq('status', statusFilter);
      console.log(`🔍 [API] Filtering battles by status: ${statusFilter}`);
    } else if (!statusFilter) {
      // When no filter specified, exclude cancelled battles
      query = query.neq('status', 'cancelled');
      console.log('🔍 [API] No status filter - excluding cancelled battles');
    }
    // Note: Explicitly requesting cancelled battles is not supported

    const { data: battles, error: battlesError } = await query;

    console.log('🔍 [API] Query result:', {
      success: !battlesError,
      battlesCount: battles?.length || 0,
      statusFilter,
      battleStatuses: battles?.map(b => ({ id: b.id.substring(0, 8), status: b.status }))
    });

    if (battlesError) {
      console.error('Error fetching battles:', battlesError);
      return NextResponse.json(
        { error: 'Failed to fetch battles' },
        { status: 500 }
      );
    }

    // If no battles, return early with empty stats
    if (!battles || battles.length === 0) {
      console.log('📭 [API] No battles found:', {
        userId: user.id,
        statusFilter,
        battlesIsNull: battles === null,
        battlesLength: battles?.length
      });
      return NextResponse.json({
        success: true,
        currentUserId: user.id,
        stats: {
          total: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          winRate: 0
        },
        battles: [],
        pending: [],
        active: [],
        completed: []
      });
    }

    // Get unique user IDs from battles
    const userIds = new Set<string>();
    battles.forEach(battle => {
      userIds.add(battle.created_by);
      userIds.add(battle.opponent_id);
    });

    // Fetch profiles for all users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .in('id', Array.from(userIds));

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      // Continue without profiles rather than failing
    }

    // Create a map of profiles for quick lookup
    const profileMap = new Map(
      (profiles || []).map(p => [p.id, p])
    );

    // Categorize battles (additional safety filter to exclude cancelled)
    const pending = battles?.filter(b => b.status === 'pending') || [];
    const active = battles?.filter(b => b.status === 'active') || [];
    const completed = battles?.filter(b => b.status === 'completed') || [];

    // Log battle categorization for debugging
    console.log('📊 Battle categorization:', {
      total: battles?.length,
      pending: pending.length,
      active: active.length,
      completed: completed.length,
      statusFilter,
      statusCounts: {
        pending: battles?.filter(b => b.status === 'pending').length,
        active: battles?.filter(b => b.status === 'active').length,
        completed: battles?.filter(b => b.status === 'completed').length,
        cancelled: battles?.filter(b => b.status === 'cancelled').length
      }
    });

    // Verify no overlaps between categories
    const pendingIds = new Set(pending.map(b => b.id));
    const activeIds = new Set(active.map(b => b.id));
    const completedIds = new Set(completed.map(b => b.id));

    const pendingActiveOverlap = [...pendingIds].filter(id => activeIds.has(id));
    const pendingCompletedOverlap = [...pendingIds].filter(id => completedIds.has(id));
    const activeCompletedOverlap = [...activeIds].filter(id => completedIds.has(id));

    if (pendingActiveOverlap.length > 0 || pendingCompletedOverlap.length > 0 || activeCompletedOverlap.length > 0) {
      console.error('❌ DUPLICATE BATTLES DETECTED:', {
        pendingActive: pendingActiveOverlap,
        pendingCompleted: pendingCompletedOverlap,
        activeCompleted: activeCompletedOverlap
      });
    }

    // Log if any cancelled battles somehow made it through (shouldn't happen)
    const cancelledCount = battles?.filter(b => b.status === 'cancelled').length || 0;
    if (cancelledCount > 0) {
      console.warn(`⚠️ Found ${cancelledCount} cancelled battles that should have been filtered out`);
    }

    // Calculate stats from completed battles only
    const completedBattlesForStats = completed.filter(b => b.status === 'completed');
    const wins = completedBattlesForStats.filter(b => b.winner_id === user.id).length;
    const losses = completedBattlesForStats.filter(b => b.winner_id && b.winner_id !== user.id).length;
    const draws = completedBattlesForStats.filter(b => !b.winner_id).length;
    const winRate = completedBattlesForStats.length > 0
      ? Math.round((wins / completedBattlesForStats.length) * 100)
      : 0;

    const stats = {
      total: completedBattlesForStats.length,
      wins,
      losses,
      draws,
      winRate
    };

    console.log('📈 Battle stats:', stats);

    // For each battle, determine user's role and opponent
    const enrichedBattles = (battles || []).map(battle => {
      const isChallenger = battle.created_by === user.id;
      const opponentId = isChallenger ? battle.opponent_id : battle.created_by;
      const opponent = profileMap.get(opponentId);
      const challenger = profileMap.get(battle.created_by);

      return {
        ...battle,
        isChallenger,
        opponent,
        challenger,
        userRole: isChallenger ? 'challenger' : 'opponent'
      };
    });

    return NextResponse.json({
      success: true,
      currentUserId: user.id, // Include current user ID for UI
      stats, // Include stats for the UI stats card
      battles: enrichedBattles,
      pending: pending.map(b => {
        const isChallenger = b.created_by === user.id;
        const opponentId = isChallenger ? b.opponent_id : b.created_by;
        return {
          ...b,
          isChallenger,
          opponent: profileMap.get(opponentId),
          challenger: profileMap.get(b.created_by)
        };
      }),
      active: active.map(b => {
        const isChallenger = b.created_by === user.id;
        const opponentId = isChallenger ? b.opponent_id : b.created_by;
        return {
          ...b,
          isChallenger,
          opponent: profileMap.get(opponentId),
          challenger: profileMap.get(b.created_by)
        };
      }),
      completed: completed.map(b => {
        const isChallenger = b.created_by === user.id;
        const opponentId = isChallenger ? b.opponent_id : b.created_by;
        return {
          ...b,
          isChallenger,
          opponent: profileMap.get(opponentId),
          challenger: profileMap.get(b.created_by),
          userWon: b.winner_id === user.id,
          isDraw: b.winner_id === null
        };
      })
    });
  } catch (error) {
    console.error('Unexpected error in GET /battles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
