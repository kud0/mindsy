import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface SearchResult {
  type: 'lecture' | 'content' | 'folder';
  id: string;
  title: string;
  subtitle?: string;
  preview?: string;
  source?: {
    lectureId: string;
    lectureTitle: string;
    section: 'questions' | 'notes' | 'summary';
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        success: true,
        results: []
      });
    }

    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const searchTerm = query.trim().toLowerCase();
    const results: SearchResult[] = [];

    console.log('🔍 Searching for:', searchTerm);

    // 1. Search lecture titles
    const { data: lectures, error: lecturesError } = await supabase
      .from('jobs')
      .select('job_id, lecture_title, course_subject, status')
      .eq('user_id', user.id)
      .in('status', ['completed', 'processing'])
      .ilike('lecture_title', `%${searchTerm}%`)
      .limit(10);

    if (!lecturesError && lectures) {
      lectures.forEach(lecture => {
        results.push({
          type: 'lecture',
          id: lecture.job_id,
          title: lecture.lecture_title,
          subtitle: lecture.course_subject || undefined
        });
      });
      console.log('📚 Found', lectures.length, 'lecture matches');
    }

    // 2. Search study folders
    const { data: folders, error: foldersError } = await supabase
      .from('study_nodes')
      .select('id, name, description, type')
      .eq('user_id', user.id)
      .ilike('name', `%${searchTerm}%`)
      .limit(5);

    if (!foldersError && folders) {
      folders.forEach(folder => {
        results.push({
          type: 'folder',
          id: folder.id,
          title: folder.name,
          subtitle: folder.description || `${folder.type} folder`
        });
      });
      console.log('📁 Found', folders.length, 'folder matches');
    }

    // 3. Search structured JSON content (study_guides table)
    const { data: jsonMatches, error: jsonError } = await supabase
      .from('study_guides')
      .select(`
        id,
        job_id,
        title,
        questions,
        explanations,
        summary,
        table_of_contents,
        jobs!inner (
          lecture_title,
          user_id
        )
      `)
      .eq('jobs.user_id', user.id)
      .limit(20);

    console.log('📊 Study guides query result:', { 
      error: jsonError, 
      matchCount: jsonMatches?.length,
      firstMatch: jsonMatches?.[0] ? {
        hasQuestions: Array.isArray(jsonMatches[0].questions),
        questionsLength: jsonMatches[0].questions?.length,
        hasExplanations: Array.isArray(jsonMatches[0].explanations),
        explanationsLength: jsonMatches[0].explanations?.length,
        hasSummary: !!jsonMatches[0].summary,
        hasJobs: !!jsonMatches[0].jobs
      } : null
    });

    if (!jsonError && jsonMatches) {
      jsonMatches.forEach(studyGuide => {
        const lectureTitle = studyGuide.jobs?.lecture_title || 'Unknown Lecture';
        
        // Search in questions array
        if (Array.isArray(studyGuide.questions)) {
          console.log(`🔍 Searching ${studyGuide.questions.length} questions in ${lectureTitle} for: "${searchTerm}"`);
          studyGuide.questions.forEach((question, index) => {
            const questionText = question?.question || '';
            const answerText = question?.answer || '';
            const questionId = question?.id || `q${index + 1}`;
            
            if (questionText.toLowerCase().includes(searchTerm) || answerText.toLowerCase().includes(searchTerm)) {
              console.log(`✅ Found match in question ${questionId}: ${questionText.substring(0, 50)}...`);
              const matchedText = questionText.toLowerCase().includes(searchTerm) ? questionText : answerText;
              const preview = matchedText.length > 120 ? matchedText.slice(0, 120) + '...' : matchedText;
              
              results.push({
                type: 'content',
                id: `${studyGuide.job_id}-question-${questionId}`,
                title: preview,
                subtitle: `Question in ${lectureTitle}`,
                preview: `Q: ${questionText}\nA: ${answerText}`,
                source: {
                  lectureId: studyGuide.job_id,
                  lectureTitle,
                  section: 'questions'
                }
              });
            }
          });
        }

        // Search in explanations array  
        if (Array.isArray(studyGuide.explanations)) {
          studyGuide.explanations.forEach((explanation, index) => {
            const titleText = explanation?.title || '';
            const contentText = explanation?.content || '';
            const explanationId = explanation?.id || `exp${index + 1}`;
            
            if (titleText.toLowerCase().includes(searchTerm) || contentText.toLowerCase().includes(searchTerm)) {
              const matchedText = titleText.toLowerCase().includes(searchTerm) ? titleText : contentText;
              const preview = matchedText.length > 120 ? matchedText.slice(0, 120) + '...' : matchedText;
              
              results.push({
                type: 'content',
                id: `${studyGuide.job_id}-explanation-${explanationId}`,
                title: preview,
                subtitle: `Explanation in ${lectureTitle}`,
                preview: `${titleText}: ${contentText}`,
                source: {
                  lectureId: studyGuide.job_id,
                  lectureTitle,
                  section: 'explanations'
                }
              });
            }
          });
        }

        // Search in summary object
        if (studyGuide.summary && typeof studyGuide.summary === 'object') {
          const summaryText = [
            studyGuide.summary.overview,
            ...(studyGuide.summary.keyTakeaways || []),
            ...(studyGuide.summary.learningObjectives || []),
            ...(studyGuide.summary.nextSteps || [])
          ].filter(Boolean).join(' ');
          
          if (summaryText.toLowerCase().includes(searchTerm)) {
            const index = summaryText.toLowerCase().indexOf(searchTerm);
            const start = Math.max(0, index - 60);
            const end = Math.min(summaryText.length, index + searchTerm.length + 60);
            const preview = `...${summaryText.slice(start, end)}...`;

            results.push({
              type: 'content',
              id: `${studyGuide.job_id}-summary`,
              title: preview.length > 120 ? preview.slice(0, 120) + '...' : preview,
              subtitle: `Summary in ${lectureTitle}`,
              preview: summaryText,
              source: {
                lectureId: studyGuide.job_id,
                lectureTitle,
                section: 'summary'
              }
            });
          }
        }

      });
      console.log('📝 Found structured content from', jsonMatches.length, 'study guides');
    }

    // 4. Fallback: Search legacy content in notes table
    const { data: legacyMatches, error: legacyError } = await supabase
      .from('notes')
      .select(`
        job_id,
        content,
        jobs!inner (
          lecture_title,
          user_id
        )
      `)
      .eq('jobs.user_id', user.id)
      .ilike('content', `%${searchTerm}%`)
      .limit(10);

    if (!legacyError && legacyMatches) {
      legacyMatches.forEach(match => {
        const content = match.content || '';
        const lectureTitle = match.jobs?.lecture_title || 'Unknown Lecture';
        
        // Find the search term in content and create a preview
        const index = content.toLowerCase().indexOf(searchTerm);
        const start = Math.max(0, index - 50);
        const end = Math.min(content.length, index + searchTerm.length + 50);
        const preview = `...${content.slice(start, end)}...`;

        results.push({
          type: 'content',
          id: `${match.job_id}-legacy-content`,
          title: preview.length > 100 ? preview.slice(0, 100) + '...' : preview,
          subtitle: `Legacy content in ${lectureTitle}`,
          preview,
          source: {
            lectureId: match.job_id,
            lectureTitle,
            section: 'notes'
          }
        });
      });
      console.log('📝 Found', legacyMatches.length, 'legacy content matches');
    }

    // Sort results: lectures first, then content, then folders
    const sortedResults = results.sort((a, b) => {
      const typeOrder = { lecture: 1, content: 2, folder: 3 };
      return typeOrder[a.type] - typeOrder[b.type];
    });

    console.log('✅ Search completed:', sortedResults.length, 'total results');

    return NextResponse.json({
      success: true,
      query: searchTerm,
      results: sortedResults.slice(0, 20) // Limit to 20 results
    });

  } catch (error) {
    console.error('❌ Search API error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}