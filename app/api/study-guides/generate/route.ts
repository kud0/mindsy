import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth/require-auth';
import { createRunPodClient } from '@/lib/runpod-client';
import { generateStudyGuide } from '@/lib/simple-study-generator';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

interface GenerateStudyGuideRequest {
  audioFilePath: string;
  lectureTitle: string;
  courseSubject?: string;
}

/**
 * POST /api/study-guides/generate - New clean approach
 * Upload → RunPod → Simple OpenAI → Store JSON → Generate PDF
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult.error) {
    return createErrorResponse(authResult.error.message, authResult.error.status);
  }

  const { user } = authResult;

  try {
    const body: GenerateStudyGuideRequest = await request.json();
    
    if (!body.audioFilePath || !body.lectureTitle) {
      return createErrorResponse('audioFilePath and lectureTitle are required');
    }

    console.log('🚀 Clean Study Guide API: Starting...', body.lectureTitle);

    const supabase = await createClient();

    // Step 1: Create job record 
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        lecture_title: body.lectureTitle,
        course_subject: body.courseSubject || null,
        status: 'processing',
        audio_file_path: body.audioFilePath,
        processing_started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (jobError) {
      console.error('❌ Clean API: Job creation failed', jobError);
      return createErrorResponse('Failed to create processing job', 500);
    }

    const jobId = job.job_id;
    console.log('✅ Clean API: Job created', { jobId, title: job.lecture_title });

    try {
      // Step 2: Get audio URL
      const { data: audioSignedUrl, error: audioUrlError } = await supabase.storage
        .from('user-uploads')
        .createSignedUrl(body.audioFilePath, 3600);

      if (audioUrlError || !audioSignedUrl) {
        throw new Error(`Failed to create signed URL: ${audioUrlError?.message}`);
      }

      // Step 3: Transcribe with RunPod
      console.log('🎵 Clean API: Transcribing audio...');
      const runpodClient = createRunPodClient();
      // Use more generous retry settings for large audio files
      const transcriptionResult = await runpodClient.transcribeAudioWithLanguage(
        audioSignedUrl.signedUrl,
        6,     // maxRetries: 6 attempts (up from 3)
        10000  // retryDelayMs: 10 seconds (up from 5)
      );
      
      console.log('✅ Clean API: Transcription complete', {
        textLength: transcriptionResult.text.length,
        language: transcriptionResult.detectedLanguage
      });

      // Step 4: Generate study guide with enhanced simple generator
      console.log('🤖 Clean API: Generating study guide with enhanced prompt...');
      const studyGuideResult = await generateStudyGuide({
        transcript: transcriptionResult.text,
        title: body.lectureTitle,
        subject: body.courseSubject,
        detectedLanguage: transcriptionResult.detectedLanguage
      });

      if (!studyGuideResult.success || !studyGuideResult.data) {
        throw new Error(`Study guide generation failed: ${studyGuideResult.error}`);
      }

      const studyGuide = studyGuideResult.data;
      console.log('✅ Clean API: Study guide generated', {
        questions: studyGuide.questions.length,
        explanations: studyGuide.explanations.length,
        language: studyGuide.language
      });

      // Step 5: Save transcript as TXT file
      console.log('📄 Clean API: Saving transcript...');
      const timestamp = Date.now();
      const txtPath = `${user.id}/${timestamp}_${body.lectureTitle.replace(/[^a-zA-Z0-9]/g, '_')}_transcript.txt`;
      
      const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
      const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { error: txtUploadError } = await supabaseAdmin.storage
        .from('generated-notes')
        .upload(txtPath, transcriptionResult.text, {
          contentType: 'text/plain',
          cacheControl: '3600'
        });

      if (txtUploadError) {
        console.warn('⚠️ Clean API: TXT upload failed', txtUploadError);
      }

      // Step 6: Generate beautiful PDF with Puppeteer
      console.log('📄 Clean API: Generating beautiful PDF...');
      const pdfBuffer = await generateBeautifulPDF(studyGuide);

      // Step 7: Upload PDF to storage
      const pdfPath = `${user.id}/${timestamp}_${body.lectureTitle.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

      const { error: pdfUploadError } = await supabaseAdmin.storage
        .from('generated-notes')
        .upload(pdfPath, pdfBuffer, {
          contentType: 'application/pdf',
          cacheControl: '3600'
        });

      if (pdfUploadError) {
        console.warn('⚠️ Clean API: PDF upload failed', pdfUploadError);
      }

      // Step 7: Store in new study_guides table
      console.log('💾 Clean API: Storing study guide...');
      const { data: studyGuideRecord, error: studyGuideError } = await supabaseAdmin
        .from('study_guides')
        .insert({
          job_id: jobId,
          user_id: user.id,
          title: studyGuide.title,
          subject: studyGuide.subject,
          language: studyGuide.language,
          questions: studyGuide.questions,
          explanations: studyGuide.explanations,
          summary: studyGuide.summary,
          table_of_contents: studyGuide.tableOfContents
        })
        .select()
        .single();

      if (studyGuideError) {
        console.error('❌ Clean API: Study guide storage failed', studyGuideError);
        // Continue anyway - the generation worked
      } else {
        console.log('✅ Clean API: Study guide stored', { id: studyGuideRecord.id });
      }

      // Step 8: Update job status
      await supabase
        .from('jobs')
        .update({
          status: 'completed',
          output_pdf_path: pdfUploadError ? null : pdfPath,
          txt_file_path: txtUploadError ? null : txtPath,
          processing_completed_at: new Date().toISOString()
        })
        .eq('job_id', jobId);

      console.log('🎉 Clean API: Complete success!');

      return createSuccessResponse({
        jobId,
        studyGuideId: studyGuideRecord?.id,
        message: 'Study guide generated successfully',
        data: {
          questions: studyGuide.questions.length,
          explanations: studyGuide.explanations.length,
          language: studyGuide.language,
          pdfPath: pdfUploadError ? null : pdfPath
        }
      });

    } catch (processingError) {
      console.error('❌ Clean API: Processing failed', processingError);
      
      await supabase
        .from('jobs')
        .update({
          status: 'failed',
          error_message: processingError instanceof Error ? processingError.message : 'Unknown error'
        })
        .eq('job_id', jobId);

      return createErrorResponse(
        processingError instanceof Error ? processingError.message : 'Processing failed',
        500
      );
    }

  } catch (error) {
    console.error('❌ Clean API: Request failed', error);
    return createErrorResponse('Invalid request', 400);
  }
}


/**
 * Generate beautiful PDF with Vercel-optimized Chromium
 */
async function generateBeautifulPDF(studyGuide: {title: string, subject?: string, questions: Array<{question: string, answer: string}>, explanations: Array<{title: string, content: string}>, summary: {overview: string, keyTakeaways: string[], learningObjectives: string[]}}): Promise<Buffer> {
  const html = `
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
          
          * { box-sizing: border-box; }
          
          body { 
            font-family: 'Inter', sans-serif; 
            margin: 0; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            font-size: 14px;
            line-height: 1.6;
          }
          
          .container { 
            max-width: 100%;
            margin: 20px;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          
          .header {
            background: linear-gradient(45deg, #FF6B6B, #4ECDC4);
            color: white;
            padding: 30px;
            text-align: center;
          }
          
          .title { 
            font-size: 2.2em; 
            font-weight: 700; 
            margin: 0;
            text-shadow: 0 2px 4px rgba(0,0,0,0.2);
            word-wrap: break-word;
          }
          
          .subject {
            font-size: 1.1em;
            opacity: 0.9;
            margin-top: 10px;
          }
          
          .content { 
            padding: 30px;
          }
          
          .section {
            margin-bottom: 30px;
          }
          
          .section-title {
            font-size: 1.6em;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 20px;
            border-bottom: 3px solid #4ECDC4;
            padding-bottom: 10px;
          }
          
          .question {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid #4ECDC4;
            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
            page-break-inside: avoid;
          }
          
          .question-title {
            font-size: 1.2em;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 12px;
          }
          
          .answer {
            background: white;
            padding: 15px;
            border-radius: 8px;
            margin-top: 10px;
            border: 1px solid #e9ecef;
          }
          
          .bullet-point {
            margin: 8px 0;
            padding-left: 15px;
            position: relative;
            font-size: 0.95em;
          }
          
          .bullet-point:before {
            content: "•";
            color: #4ECDC4;
            font-weight: bold;
            position: absolute;
            left: 0;
          }
          
          .explanation {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            margin: 15px 0;
            border-left: 4px solid #FF6B6B;
          }
          
          .explanation-title {
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 10px;
            font-size: 1.1em;
          }
          
          .summary {
            background: linear-gradient(135deg, #fff5cd 0%, #ffe4a3 100%);
            border-radius: 12px;
            padding: 25px;
            margin: 20px 0;
          }
          
          .summary-overview {
            margin-bottom: 15px;
            font-size: 1em;
            line-height: 1.7;
          }
          
          .takeaway {
            margin: 8px 0;
            padding-left: 15px;
            position: relative;
          }
          
          .takeaway:before {
            content: "✓";
            color: #28a745;
            font-weight: bold;
            position: absolute;
            left: 0;
          }
          
          .toc {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
          }
          
          .toc-item {
            margin: 5px 0;
            padding: 5px 0;
            border-bottom: 1px solid #dee2e6;
          }
          
          .toc-item:last-child {
            border-bottom: none;
          }
          
          @media print {
            body { background: white; }
            .container { margin: 0; box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="title">${studyGuide.title}</h1>
            ${studyGuide.subject ? `<div class="subject">${studyGuide.subject}</div>` : ''}
          </div>
          
          <div class="content">
            <!-- Table of Contents -->
            ${studyGuide.tableOfContents ? `
              <div class="section">
                <h2 class="section-title">${studyGuide.language === 'es' ? 'Tabla de Contenidos' : 'Table of Contents'}</h2>
                <div class="toc">
                  ${studyGuide.tableOfContents.split('\n').map(item => 
                    `<div class="toc-item">${item.trim()}</div>`
                  ).join('')}
                </div>
              </div>
            ` : ''}
            
            <!-- Questions -->
            <div class="section">
              <h2 class="section-title">${studyGuide.language === 'es' ? 'Preguntas de Estudio' : 'Study Questions'}</h2>
              ${studyGuide.questions.map((q, i) => `
                <div class="question">
                  <div class="question-title">${i + 1}. ${q.question.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>
                  <div class="answer">
                    ${q.answer.split(/[•\n\*]/).filter(point => point.trim()).map(point => 
                      `<div class="bullet-point">${point.trim().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>`
                    ).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
            
            <!-- Explanations -->
            ${studyGuide.explanations.length > 0 ? `
              <div class="section">
                <h2 class="section-title">${studyGuide.language === 'es' ? 'Explicaciones Detalladas' : 'Detailed Explanations'}</h2>
                ${studyGuide.explanations.map(exp => `
                  <div class="explanation">
                    <div class="explanation-title">${exp.title.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>
                    <div>${exp.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>
                  </div>
                `).join('')}
              </div>
            ` : ''}
            
            <!-- Summary -->
            <div class="section">
              <h2 class="section-title">${studyGuide.language === 'es' ? 'Resumen' : 'Summary'}</h2>
              <div class="summary">
                <div class="summary-overview">${studyGuide.summary.overview.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>
                ${studyGuide.summary.keyTakeaways.length > 0 ? `
                  <div>
                    <strong>${studyGuide.language === 'es' ? 'Puntos Clave:' : 'Key Takeaways:'}</strong>
                    ${studyGuide.summary.keyTakeaways.map(takeaway => 
                      `<div class="takeaway">${takeaway.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>`
                    ).join('')}
                  </div>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  // Use different approach for local vs Vercel
  const isLocal = process.env.NODE_ENV === 'development';
  
  let browser;
  if (isLocal) {
    // Local development - use system Chrome
    const puppeteerFull = await import('puppeteer');
    browser = await puppeteerFull.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  } else {
    // Vercel production - use optimized Chromium
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }
  
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
  });
  
  await browser.close();
  
  return Buffer.from(pdfBuffer);
}