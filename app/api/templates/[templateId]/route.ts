import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{
    templateId: string
  }>
}

/**
 * GET /api/templates/[templateId]
 * Get template details including folder structure (for preview)
 */
export async function GET(
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

    // Get template with creator info and vote status
    const { data: template, error: templateError } = await supabase
      .from('course_templates')
      .select(`
        *,
        course:courses(course_code, course_name, institution),
        creator:profiles!course_templates_created_by_fkey(full_name, avatar_url),
        user_voted:template_votes(user_id)
      `)
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Transform response
    const response = {
      ...template,
      creator_name: template.creator?.full_name || 'Unknown',
      has_voted: template.user_voted?.some((v: any) => v.user_id === user.id) || false,
      folder_count: template.folder_structure?.folders?.length || 0
    };

    return NextResponse.json({
      success: true,
      template: response
    });
  } catch (error) {
    console.error('Unexpected error in GET /templates/[templateId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
