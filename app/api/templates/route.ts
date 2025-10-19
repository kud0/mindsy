import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/templates
 * Create a new course template
 *
 * Body: {
 *   course_id: string;
 *   template_name: string;
 *   folder_structure: { folders: Array<{name: string}> };
 *   description?: string;
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
    const { course_id, template_name, folder_structure, description } = body;

    // Validate required fields
    if (!course_id || !template_name || !folder_structure) {
      return NextResponse.json(
        { error: 'Missing required fields: course_id, template_name, folder_structure' },
        { status: 400 }
      );
    }

    // Validate folder_structure format
    if (!folder_structure.folders || !Array.isArray(folder_structure.folders)) {
      return NextResponse.json(
        { error: 'Invalid folder_structure: must contain "folders" array' },
        { status: 400 }
      );
    }

    if (folder_structure.folders.length === 0) {
      return NextResponse.json(
        { error: 'Template must have at least one folder' },
        { status: 400 }
      );
    }

    // Verify user is enrolled in the course
    const { data: enrollment } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', course_id)
      .eq('is_active', true)
      .single();

    if (!enrollment) {
      return NextResponse.json(
        { error: 'You must be enrolled in this course to create templates' },
        { status: 403 }
      );
    }

    // Create the template
    const { data: template, error: templateError } = await supabase
      .from('course_templates')
      .insert({
        course_id,
        created_by: user.id,
        template_name: template_name.trim(),
        folder_structure,
        description: description?.trim() || null
      })
      .select(`
        *,
        creator:profiles!course_templates_created_by_fkey(full_name, avatar_url)
      `)
      .single();

    if (templateError || !template) {
      console.error('Template creation error:', templateError);
      return NextResponse.json(
        { error: 'Failed to create template' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      template: {
        ...template,
        creator_name: template.creator?.full_name || 'Unknown'
      }
    });
  } catch (error) {
    console.error('Unexpected error in POST /templates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
