import { createClient } from '@/lib/supabase/server';

/**
 * Progress Calculation Utility
 *
 * Calculates the percentage of completed lectures in a folder tree.
 * Used for tracking active course progress.
 */

interface ProgressResult {
  progress: number;      // Percentage (0-100)
  completed: number;     // Number of completed lectures
  total: number;         // Total number of lectures
  folderIds: string[];   // All folder IDs included in calculation
}

/**
 * Recursively get all descendant folder IDs from a parent folder
 * @param supabase - Supabase client
 * @param folderId - Parent folder ID
 * @param userId - User ID for security
 * @returns Array of all descendant folder IDs (including the parent)
 */
async function getAllDescendantFolderIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  folderId: string,
  userId: string
): Promise<string[]> {
  const allFolderIds: string[] = [folderId];
  const queue: string[] = [folderId];

  while (queue.length > 0) {
    const currentFolderId = queue.shift()!;

    // Get immediate children of current folder
    const { data: childFolders, error } = await supabase
      .from('user_folders')
      .select('id')
      .eq('parent_folder_id', currentFolderId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching child folders:', error);
      continue;
    }

    if (childFolders && childFolders.length > 0) {
      const childIds = childFolders.map((f: { id: string }) => f.id);
      allFolderIds.push(...childIds);
      queue.push(...childIds);
    }
  }

  return allFolderIds;
}

/**
 * Calculate progress for a specific folder and all its descendants
 * @param userId - User ID
 * @param folderId - Root folder ID to calculate progress from
 * @returns Progress data including percentage, counts, and folder IDs
 */
export async function calculateFolderProgress(
  userId: string,
  folderId: string
): Promise<ProgressResult> {
  const supabase = await createClient();

  // Step 1: Get all descendant folder IDs recursively
  const folderIds = await getAllDescendantFolderIds(supabase, folderId, userId);

  if (folderIds.length === 0) {
    return {
      progress: 0,
      completed: 0,
      total: 0,
      folderIds: []
    };
  }

  // Step 2: Count total lectures in all these folders
  const { count: totalCount, error: totalError } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('user_folder_id', folderIds)
    .in('status', ['processing', 'completed', 'failed']); // Only count real lectures

  if (totalError) {
    console.error('Error counting total lectures:', totalError);
    return {
      progress: 0,
      completed: 0,
      total: 0,
      folderIds
    };
  }

  const total = totalCount || 0;

  // If no lectures, return 0% progress
  if (total === 0) {
    return {
      progress: 0,
      completed: 0,
      total: 0,
      folderIds
    };
  }

  // Step 3: Count completed lectures
  // A lecture is "completed" if status = 'completed'
  const { count: completedCount, error: completedError } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('user_folder_id', folderIds)
    .eq('status', 'completed');

  if (completedError) {
    console.error('Error counting completed lectures:', completedError);
    return {
      progress: 0,
      completed: 0,
      total,
      folderIds
    };
  }

  const completed = completedCount || 0;

  // Step 4: Calculate percentage
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    progress,
    completed,
    total,
    folderIds
  };
}

/**
 * Calculate progress for multiple folders (batch operation)
 * Useful for calculating progress for multiple active courses at once
 */
export async function calculateMultipleFolderProgress(
  userId: string,
  folderIds: string[]
): Promise<Record<string, ProgressResult>> {
  const results: Record<string, ProgressResult> = {};

  // Process in parallel for better performance
  await Promise.all(
    folderIds.map(async (folderId) => {
      const progress = await calculateFolderProgress(userId, folderId);
      results[folderId] = progress;
    })
  );

  return results;
}
