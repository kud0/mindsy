import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{
    folderId: string
  }>
}

/**
 * PATCH /api/folders/[folderId]
 * Update folder name or order
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { folderId } = await params;
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
    const { folder_name, folder_order } = body;

    // Validate: at least one field to update
    if (folder_name === undefined && folder_order === undefined) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Validate folder name if provided
    if (folder_name !== undefined) {
      const trimmedName = folder_name.trim();
      if (trimmedName.length === 0) {
        return NextResponse.json(
          { error: 'Folder name cannot be empty' },
          { status: 400 }
        );
      }
    }

    // Check if user owns the folder
    const { data: existingFolder } = await supabase
      .from('user_folders')
      .select('*')
      .eq('id', folderId)
      .eq('user_id', user.id)
      .single();

    if (!existingFolder) {
      return NextResponse.json(
        { error: 'Folder not found or access denied' },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: any = {};
    if (folder_name !== undefined) {
      updateData.folder_name = folder_name.trim();
    }
    if (folder_order !== undefined) {
      updateData.folder_order = folder_order;
    }

    // Update folder
    const { data: updatedFolder, error } = await supabase
      .from('user_folders')
      .update(updateData)
      .eq('id', folderId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating folder:', error);
      return NextResponse.json(
        { error: 'Failed to update folder' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      folder: updatedFolder
    });

  } catch (error) {
    console.error('Unexpected error in PATCH /folders/[folderId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/folders/[folderId]
 * Delete folder and all its children (cascade)
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { folderId } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user owns the folder
    const { data: existingFolder } = await supabase
      .from('user_folders')
      .select('*')
      .eq('id', folderId)
      .eq('user_id', user.id)
      .single();

    if (!existingFolder) {
      return NextResponse.json(
        { error: 'Folder not found or access denied' },
        { status: 404 }
      );
    }

    // Get count of children and lectures before deleting
    const { data: allFolders } = await supabase
      .from('user_folders')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', existingFolder.course_id);

    // Build recursive list of all folder IDs to delete
    const getAllDescendantIds = (parentId: string, folders: any[]): string[] => {
      const children = folders.filter(f => f.parent_folder_id === parentId);
      let ids = children.map(c => c.id);
      children.forEach(child => {
        ids = ids.concat(getAllDescendantIds(child.id, folders));
      });
      return ids;
    };

    const descendantIds = getAllDescendantIds(folderId, allFolders || []);
    const allIdsToDelete = [folderId, ...descendantIds];

    console.log(`🗑️ Deleting folder ${folderId} and ${descendantIds.length} descendants`);

    // Delete folder (CASCADE will handle children due to ON DELETE CASCADE in schema)
    const { error } = await supabase
      .from('user_folders')
      .delete()
      .eq('id', folderId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting folder:', error);
      return NextResponse.json(
        { error: 'Failed to delete folder' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted_count: allIdsToDelete.length,
      message: `Deleted ${allIdsToDelete.length} folder(s)`
    });

  } catch (error) {
    console.error('Unexpected error in DELETE /folders/[folderId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
