import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

// Initialize OpenAI with GPT-5-NANO (the NEWEST ultra-cheap and ultra-fast model!)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { goal, examDate, subject, subjectPath, daysAvailable, lectures, preferences, request: userRequest } = body;

    // Simple prompt for GPT-5-mini
    const systemPrompt = `You are a study schedule generator. You must respond with ONLY valid JSON in the exact format shown below. Do not include any explanatory text before or after the JSON.

Required JSON format:
{
  "sessions": [
    {
      "title": "Subject - Topic",
      "startDateTime": "2025-08-25T09:00:00",
      "endDateTime": "2025-08-25T11:00:00", 
      "type": "study",
      "description": "Study session",
      "difficulty": "medium",
      "priority": "high"
    }
  ],
  "totalHours": 10,
  "confidence": 80,
  "strategy": "Progressive learning",
  "warnings": []
}

IMPORTANT: Your entire response must be valid JSON only. No other text.`;

    // Format lectures for the prompt
    const lectureList = lectures && lectures.length > 0 
      ? lectures.map((lecture: any, index: number) => `${index + 1}. ${lecture.title || lecture.name || `Lecture ${index + 1}`}`).join('\n')
      : 'No specific lectures provided - create general study sessions';

    const userPrompt = `Create JSON study schedule:
- Subject: ${subject}
- Exam date: ${examDate} 
- Days available: ${daysAvailable}
- Study hours per day: ${preferences.studyHoursPerDay}
- Session duration: ${preferences.sessionDuration} minutes
- Preferred time: ${preferences.preferredTime}

Available lectures to study:
${lectureList}

Create study sessions using the actual lecture titles above. Generate exactly ${Math.min(10, Math.floor(daysAvailable * 2))} study sessions in the JSON format shown above. Use the lecture titles in the session titles instead of generic names.`;

    // Call GPT-5-MINI - same model as your working summary system
    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini", // Using same model as working summary
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_completion_tokens: 20000 // Much higher like your working summary system
    });

    const rawContent = completion.choices[0].message.content || '{}';
    console.log('✅ OpenAI response received');
    console.log('🔍 Full completion object:', JSON.stringify(completion, null, 2));
    console.log('🔍 Response structure:', {
      choices: completion.choices?.length,
      firstChoice: !!completion.choices?.[0],
      message: !!completion.choices?.[0]?.message,
      content: !!completion.choices?.[0]?.message?.content,
      contentType: typeof completion.choices?.[0]?.message?.content,
      contentLength: completion.choices?.[0]?.message?.content?.length
    });
    console.log('Raw AI response:', rawContent.substring(0, 500), '...');
    
    let aiResponse;
    try {
      aiResponse = JSON.parse(rawContent);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.log('Problematic JSON content:', rawContent);
      // Fallback to empty response structure
      aiResponse = {
        sessions: [],
        totalHours: 0,
        confidence: 50,
        strategy: "AI response was malformed, using fallback",
        warnings: ["AI service returned invalid JSON"]
      };
    }

    // Process the dates from the AI response
    const sessions = (aiResponse.sessions || []).map((session: any) => ({
      title: session.title,
      start: new Date(session.startDateTime || session.start),
      end: new Date(session.endDateTime || session.end),
      type: session.type,
      subject: subject,
      description: session.description,
      difficulty: session.difficulty,
      priority: session.priority
    }));

    // Calculate total hours if not provided
    const totalHours = aiResponse.totalHours || sessions.reduce((acc: number, session: any) => 
      acc + (new Date(session.end).getTime() - new Date(session.start).getTime()) / (1000 * 60 * 60), 0
    );

    return NextResponse.json({
      success: true,
      sessions,
      totalHours,
      confidence: aiResponse.confidence || 80,
      strategy: aiResponse.strategy || "Progressive learning with spaced repetition",
      warnings: aiResponse.warnings,
      model: "gpt-5-nano" // Ready for the ultra-fast nano model!
    });

  } catch (error) {
    console.error('AI Schedule Generation error:', error);
    
    // Return a fallback schedule if AI fails
    return NextResponse.json({
      success: false,
      error: 'AI generation failed, using fallback',
      sessions: [],
      totalHours: 0,
      confidence: 50,
      strategy: "Manual schedule creation recommended",
      warnings: ["AI service temporarily unavailable"]
    }, { status: 200 }); // Still return 200 with fallback
  }
}