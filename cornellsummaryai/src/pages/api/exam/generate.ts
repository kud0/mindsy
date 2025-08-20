import type { APIRoute } from 'astro';
import { requireAuth, supabaseAdmin } from '../../../lib/supabase-server';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.OPENAI_KEY
});

export const POST: APIRoute = async ({ request }) => {
  try {
    // Use the same auth pattern as other API endpoints
    const { user } = await requireAuth(request);

    // Get request body
    const body = await request.json();
    const { folderId, folderName, questionCount = 20 } = body;

    if (!folderId) {
      return new Response(JSON.stringify({ error: 'Folder ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get all notes from the folder - using jobs table which stores the notes
    const { data: notes, error: notesError } = await supabaseAdmin
      .from('jobs')
      .select('job_id, lecture_title, md_file_path')
      .eq('user_id', user.id)
      .eq('folder_id', folderId === 'unfiled' ? null : folderId)
      .eq('status', 'completed');

    if (notesError || !notes || notes.length === 0) {
      return new Response(JSON.stringify({ error: 'No completed notes found in folder' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch the actual markdown content from storage
    const noteContents = await Promise.all(notes.map(async (note) => {
      if (!note.md_file_path) return null;
      
      try {
        // Get the markdown file from storage
        const { data, error } = await supabaseAdmin.storage
          .from('generated-notes')
          .download(note.md_file_path);
        
        if (error || !data) {
          console.error('Error downloading markdown:', error);
          return null;
        }
        
        // Convert blob to text
        const text = await data.text();
        return {
          title: note.lecture_title || 'Untitled',
          content: text
        };
      } catch (err) {
        console.error('Error processing note:', err);
        return null;
      }
    }));
    
    // Filter out null entries and combine content
    const validNotes = noteContents.filter(n => n !== null);
    
    if (validNotes.length === 0) {
      return new Response(JSON.stringify({ error: 'Could not retrieve note contents' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const combinedContent = validNotes.map((note, index) => `
### Note ${index + 1}: ${note.title}
${note.content}
    `).join('\n\n---\n\n');

    // Generate exam using GPT
    const examPrompt = `
You are an expert exam creator. Based on the following Mindsy Notes content, create exactly ${questionCount} multiple-choice questions.

IMPORTANT RULES:
1. Each question must have exactly 4 options (A, B, C, D)
2. Questions must be directly answerable from the provided content
3. Include a mix of difficulty levels (easy, medium, hard)
4. Provide clear explanations for correct answers
5. Make incorrect options plausible but clearly wrong
6. For each question, specify which note it comes from using the exact format "Note X: Title"

Content to create exam from:
${combinedContent}

Return the response in this EXACT JSON format:
{
  "questions": [
    {
      "id": "q1",
      "question": "Question text here?",
      "options": {
        "A": "First option",
        "B": "Second option", 
        "C": "Third option",
        "D": "Fourth option"
      },
      "correctAnswer": "A",
      "explanation": "This is correct because...",
      "topic": "Main topic this tests",
      "difficulty": "easy|medium|hard",
      "sourceNote": "Note 1: Title of the note this question comes from"
    }
  ]
}

Generate exactly ${questionCount} questions covering all major topics proportionally.
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert educator who creates fair, comprehensive exams. Always return valid JSON.'
        },
        {
          role: 'user',
          content: examPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000
    });

    const generatedContent = completion.choices[0]?.message?.content;
    if (!generatedContent) {
      throw new Error('Failed to generate exam');
    }

    // Parse the generated exam
    let examData;
    try {
      examData = JSON.parse(generatedContent);
    } catch (parseError) {
      // Try to extract JSON from the response
      const jsonMatch = generatedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        examData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Invalid JSON response from AI');
      }
    }

    // Create exam record in database
    const { data: exam, error: examError } = await supabaseAdmin
      .from('exams')
      .insert({
        user_id: user.id,
        folder_id: folderId,
        folder_name: folderName || 'Untitled Folder',
        title: `${folderName || 'Folder'} Exam - ${new Date().toLocaleDateString()}`,
        questions: examData.questions,
        question_count: examData.questions.length,
        difficulty: 'mixed',
        source_note_ids: notes.map(n => n.job_id),
        is_active: true
      })
      .select()
      .single();

    if (examError) {
      throw examError;
    }

    return new Response(JSON.stringify({
      success: true,
      examId: exam.id,
      questionCount: exam.question_count
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error generating exam:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to generate exam',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};