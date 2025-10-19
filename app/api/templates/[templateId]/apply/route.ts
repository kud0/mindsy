import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{
    templateId: string
  }>
}

/**
 * POST /api/templates/[templateId]/apply
 * Apply a template to create folders for the current user
 *
 * Body: {
 *   merge?: boolean; // If true, add to existing folders. If false (default), prompt user or fail if folders exist
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { templateId } = await params;
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
    const body = await request.json().catch(() => ({}));
    const { merge = true } = body; // Default to merge mode

    // Get template
    const { data: template, error: templateError } = await supabase
      .from('course_templates')
      .select('id, course_id, folder_structure, template_name')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Verify user is enrolled in the course (optional: users can apply templates even if not enrolled)
    // For MVP: allow anyone to apply any template (they're just folder structures)

    // Validate folder structure
    if (!template.folder_structure?.folders || !Array.isArray(template.folder_structure.folders)) {
      return NextResponse.json(
        { error: 'Invalid template: missing folders array' },
        { status: 400 }
      );
    }

    const folders = template.folder_structure.folders;

    if (folders.length === 0) {
      return NextResponse.json(
        { error: 'Template has no folders' },
        { status: 400 }
      );
    }

    // Check if user already has folders from this template
    const { data: existingFolders } = await supabase
      .from('user_folders')
      .select('id')
      .eq('user_id', user.id)
      .eq('created_from_template_id', templateId);

    if (existingFolders && existingFolders.length > 0 && !merge) {
      return NextResponse.json(
        { error: 'Template already applied. Use merge mode to add additional folders.' },
        { status: 409 }
      );
    }

    // Create folders from template
    const folderInserts = folders.map((folder: any, index: number) => ({
      user_id: user.id,
      course_id: template.course_id,
      folder_name: folder.name,
      folder_order: index,
      created_from_template_id: templateId,
      parent_folder_id: null // MVP: flat structure only
    }));

    const { data: createdFolders, error: folderError } = await supabase
      .from('user_folders')
      .insert(folderInserts)
      .select();

    if (folderError) {
      console.error('Folder creation error:', folderError);
      return NextResponse.json(
        { error: 'Failed to create folders from template' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      folders_created: createdFolders?.length || 0,
      folders: createdFolders
    });
  } catch (error) {
    console.error('Unexpected error in POST /templates/[templateId]/apply:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
