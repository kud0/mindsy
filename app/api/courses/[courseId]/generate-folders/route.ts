import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateCourseFoldersWithOpenAI, FolderHierarchy } from '@/lib/openai-course-generator';
import type { SupabaseClient } from '@supabase/supabase-js';

interface RouteParams {
  params: Promise<{
    courseId: string
  }>
}

/**
 * Recursively create folders and their children at any depth
 * @returns Total count of folders created
 */
async function createFoldersRecursively(
  supabase: SupabaseClient,
  userId: string,
  courseId: string,
  items: (string | FolderHierarchy)[],
  parentFolderId: string | null = null,
  startOrder: number = 0
): Promise<number> {
  let totalCreated = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const folderOrder = startOrder + i;

    if (typeof item === 'string') {
      // Simple string folder - create it
      const { data: folder, error } = await supabase
        .from('user_folders')
        .insert({
          user_id: userId,
          course_id: courseId,
          folder_name: item,
          folder_order: folderOrder,
          parent_folder_id: parentFolderId,
          created_from_template_id: null
        })
        .select()
        .single();

      if (error) {
        console.error(`Error creating folder "${item}":`, error);
      } else {
        totalCreated++;
        console.log(`✅ Created folder: ${item} (parent: ${parentFolderId || 'root'})`);
      }
    } else {
      // Hierarchical object with potential children
      const { data: parentFolder, error: parentError } = await supabase
        .from('user_folders')
        .insert({
          user_id: userId,
          course_id: courseId,
          folder_name: item.name,
          folder_order: folderOrder,
          parent_folder_id: parentFolderId,
          created_from_template_id: null
        })
        .select()
        .single();

      if (parentError) {
        console.error(`Error creating parent folder "${item.name}":`, parentError);
        continue;
      }

      totalCreated++;
      console.log(`✅ Created parent folder: ${item.name} (parent: ${parentFolderId || 'root'})`);

      // Recursively create children if they exist
      if (item.children && item.children.length > 0) {
        const childrenCreated = await createFoldersRecursively(
          supabase,
          userId,
          courseId,
          item.children,
          parentFolder.id,
          0
        );
        totalCreated += childrenCreated;
      }
    }
  }

  return totalCreated;
}

/**
 * POST /api/courses/[courseId]/generate-folders
 * AI-powered folder generation based on course information
 *
 * Uses AI with web search to find typical course structure and create folders
 * Fallback: Creates 5 default folders if AI fails
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { courseId } = await params;
    const supabase = await createClient();

    // Parse request body for optional syllabus URL
    const body = await request.json().catch(() => ({}));
    const { syllabus_url } = body;

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get course details
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // Check if user is enrolled
    const { data: enrollment } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('is_active', true)
      .single();

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Not enrolled in this course' },
        { status: 403 }
      );
    }

    // Check if user already has folders for this course
    const { data: existingFolders } = await supabase
      .from('user_folders')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId);

    if (existingFolders && existingFolders.length > 0) {
      return NextResponse.json(
        {
          error: 'Folders already exist for this course',
          existing_count: existingFolders.length
        },
        { status: 409 }
      );
    }

    console.log('🤖 Generating folders for course with OpenAI web search:', {
      courseCode: course.course_code,
      institution: course.institution,
      typeOfStudy: course.type_of_study,
      year: course.year
    });

    // Use OpenAI with web search to generate folder structure
    const aiResult = await generateCourseFoldersWithOpenAI({
      courseCode: course.course_code,
      courseName: course.course_name || '',
      institution: course.institution,
      typeOfStudy: course.type_of_study || 'University',
      year: course.year || '',
      semester: course.semester || '',
      syllabusUrl: syllabus_url || undefined
    });

    let totalFoldersCreated = 0;

    if (aiResult.success && aiResult.folders && aiResult.folders.length > 0) {
      console.log('✅ AI generated folders:', aiResult.folders);
      console.log('📁 Creating folder structure recursively...');

      // Use recursive function to create folders at any depth
      totalFoldersCreated = await createFoldersRecursively(
        supabase,
        user.id,
        courseId,
        aiResult.folders,
        null, // Start at root level
        0     // Start order at 0
      );

      console.log(`✅ Total folders created: ${totalFoldersCreated}`);
    } else {
      // Fallback: Create 5 default folders
      console.warn('⚠️ AI generation failed, using fallback folders');
      const fallbackFolders = [
        'Week 1-4',
        'Week 5-8',
        'Week 9-12',
        'Midterm Review',
        'Final Review'
      ];

      totalFoldersCreated = await createFoldersRecursively(
        supabase,
        user.id,
        courseId,
        fallbackFolders,
        null,
        0
      );
    }

    const { data: allFolders, error: fetchError } = await supabase
      .from('user_folders')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId);

    const createdFolders = allFolders || [];

    return NextResponse.json({
      success: true,
      folders_created: totalFoldersCreated,
      folders: createdFolders,
      ai_generated: aiResult.success
    });

  } catch (error) {
    console.error('Unexpected error in POST /courses/[courseId]/generate-folders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
