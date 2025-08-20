import type { APIRoute } from 'astro';
import { requireAuth } from '../../lib/supabase-server';
import {
  generateSignedUrl,
  STORAGE_BUCKETS,
  EXPIRATION_TIMES,
  uploadFile,
  generateSecureFilePath
} from '../../lib/file-processing';
import { createTikaClient } from '../../lib/tika-client';
import { createGoogleVisionClient, GoogleVisionClient } from '../../lib/google-vision-client';
import { applyLightFormatting, generateMindsyNotes, type LightFormattingInput, type MindsyNotesInput, convertMarkdownToHtml } from '../../lib/openai-client';
import { createGotenbergClient } from '../../lib/gotenberg-client';

/**
 * Document Processing API - Separate from audio pipeline
 * Handles: PDF, DOC, Images → Text Extraction → AI Processing → PDF Generation
 */

/**
 * Format simple document HTML with clean styling
 * @param htmlContent - Base HTML content from markdown
 * @param title - Document title
 * @returns Styled HTML with proper CSS
 */
function formatSimpleDocumentAsHtml(htmlContent: string, title: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            font-size: 11pt;
            background: white;
        }
        
        h1 {
            font-size: 24pt;
            font-weight: 700;
            color: #111827;
            margin-bottom: 24pt;
            border-bottom: 2pt solid #e5e7eb;
            padding-bottom: 12pt;
        }
        
        h2 {
            font-size: 18pt;
            font-weight: 600;
            color: #374151;
            margin: 20pt 0 12pt 0;
        }
        
        h3 {
            font-size: 14pt;
            font-weight: 600;
            color: #4b5563;
            margin: 16pt 0 8pt 0;
        }
        
        h4, h5, h6 {
            font-size: 12pt;
            font-weight: 500;
            color: #6b7280;
            margin: 12pt 0 6pt 0;
        }
        
        p {
            margin-bottom: 12pt;
            text-align: justify;
        }
        
        ul, ol {
            margin: 12pt 0 12pt 20pt;
        }
        
        li {
            margin-bottom: 6pt;
        }
        
        strong {
            font-weight: 600;
            color: #111827;
        }
        
        em {
            font-style: italic;
            color: #374151;
        }
        
        code {
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
            font-size: 10pt;
            background: #f3f4f6;
            padding: 2pt 4pt;
            border-radius: 3pt;
            color: #e11d48;
        }
        
        pre {
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
            font-size: 10pt;
            background: #f8fafc;
            border: 1pt solid #e5e7eb;
            border-radius: 6pt;
            padding: 12pt;
            margin: 12pt 0;
            overflow-x: auto;
        }
        
        blockquote {
            border-left: 3pt solid #3b82f6;
            margin: 12pt 0;
            padding: 8pt 0 8pt 16pt;
            font-style: italic;
            color: #4b5563;
            background: #f8fafc;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 12pt 0;
        }
        
        th, td {
            border: 1pt solid #d1d5db;
            padding: 8pt 12pt;
            text-align: left;
        }
        
        th {
            background: #f9fafb;
            font-weight: 600;
            color: #374151;
        }
        
        hr {
            border: none;
            height: 1pt;
            background: #e5e7eb;
            margin: 24pt 0;
        }
        
        a {
            color: #2563eb;
            text-decoration: none;
        }
        
        a:hover {
            text-decoration: underline;
        }
        
        .page-break {
            page-break-after: always;
        }
        
        @media print {
            body {
                font-size: 12pt;
            }
            
            h1 {
                font-size: 20pt;
            }
            
            h2 {
                font-size: 16pt;
            }
            
            h3 {
                font-size: 14pt;
            }
        }
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>
`;
}

interface DocumentProcessRequest {
  documentFilePath: string;
  documentTitle: string;
  processingMode: 'enhance' | 'store';
  courseSubject?: string;
}

interface DocumentProcessResponse {
  success: boolean;
  message: string;
  jobId: string;
  downloadUrl?: string;
  formats?: {
    pdf?: string;
    markdown?: string;
    originalDocument?: string;
  };
}

export const POST: APIRoute = async ({ request }) => {
  console.log('📄 Document Processing API called');
  
  try {
    // Authenticate user (matching generate.ts pattern)
    let user, userClient;
    try {
      const authResult = await requireAuth(request);
      user = authResult.user;
      userClient = authResult.client;
    } catch (authError) {
      // If requireAuth throws an error, it means authentication failed
      if (authError instanceof Response) {
        return authError;
      }
      
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication failed',
        code: 'AUTH_REQUIRED'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    console.log('✅ Authentication successful, user:', user.id);

    // Parse request body
    let requestBody: DocumentProcessRequest;
    try {
      requestBody = await request.json();
      console.log('📋 Received request body:', requestBody);
    } catch (error) {
      console.error('❌ JSON parsing error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid JSON in request body',
        code: 'INVALID_REQUEST'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate required fields
    console.log('🔍 Validating fields:', {
      documentFilePath: !!requestBody.documentFilePath,
      documentTitle: !!requestBody.documentTitle,
      processingMode: !!requestBody.processingMode
    });

    if (!requestBody.documentFilePath || !requestBody.documentTitle || !requestBody.processingMode) {
      console.error('❌ Missing required fields:', {
        documentFilePath: requestBody.documentFilePath,
        documentTitle: requestBody.documentTitle,
        processingMode: requestBody.processingMode
      });
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: documentFilePath, documentTitle, processingMode',
        code: 'INVALID_REQUEST'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { documentFilePath, documentTitle, processingMode, courseSubject } = requestBody;
    console.log(`🔄 Processing: ${documentTitle} in ${processingMode} mode`);

    // Create job record
    const { data: jobData, error: jobError } = await userClient.from('jobs').insert({
      user_id: user.id,
      lecture_title: documentTitle,
      course_subject: courseSubject || null,
      pdf_file_path: documentFilePath,
      status: 'processing',
      processing_started_at: new Date().toISOString()
    }).select('job_id').single();

    if (jobError || !jobData) {
      console.error('Error creating job record:', jobError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to create job record',
        code: 'DATABASE_ERROR'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const jobId = jobData.job_id;
    console.log('📝 Created job ID:', jobId);

    // Start processing pipeline
    const processingStartTime = Date.now();

    try {
      // Step 1: Get signed URL for document and copy original to generated-notes bucket
      const documentUrlResult = await generateSignedUrl(
        STORAGE_BUCKETS.USER_UPLOADS,
        documentFilePath,
        EXPIRATION_TIMES.SHORT
      );

      if (!documentUrlResult.success || !documentUrlResult.data) {
        throw new Error('Failed to generate document URL');
      }

      const documentUrl = documentUrlResult.data.signedUrl;
      console.log('📄 Generated document URL');

      // For store mode, also copy the original document to generated-notes bucket
      let originalDocumentPath = '';
      if (processingMode === 'store') {
        const originalDocumentName = `${documentTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_original_${Date.now()}.pdf`;
        originalDocumentPath = generateSecureFilePath(user.id, originalDocumentName, 'summaries');
        
        // Copy original document from user-uploads to generated-notes
        const { data: originalDoc } = await userClient.storage
          .from(STORAGE_BUCKETS.USER_UPLOADS)
          .download(documentFilePath);
          
        if (originalDoc) {
          await uploadFile(
            STORAGE_BUCKETS.GENERATED_NOTES,
            originalDocumentPath,
            new Uint8Array(await originalDoc.arrayBuffer()),
            'application/pdf'
          );
          console.log('📁 Copied original document to generated-notes bucket');
        }
      }

      // Step 2: Extract text based on file type
      console.log('🔍 Starting text extraction...');
      let extractedText = '';
      let extractionMethod = '';

      if (GoogleVisionClient.isImageFile(documentFilePath)) {
        // Use Google Vision API for images
        console.log('🖼️ Processing image with Google Vision OCR...');
        const visionClient = createGoogleVisionClient();
        const ocrResult = await visionClient.extractTextFromImage(documentUrl);
        
        if (!ocrResult.success || !ocrResult.text) {
          throw new Error(`Vision OCR failed: ${ocrResult.error || 'Unknown error'}`);
        }
        
        extractedText = ocrResult.text;
        extractionMethod = 'Google Vision OCR';
      } else {
        // Use Tika for documents
        console.log('📄 Processing document with Tika...');
        const tikaClient = createTikaClient();
        extractedText = await tikaClient.extractDocumentText(documentUrl);
        extractionMethod = 'Tika';
      }

      console.log(`✅ ${extractionMethod} extraction successful, extracted ${extractedText.length} characters`);

      // Step 3: Process with AI based on mode
      let processedContent = '';
      
      if (processingMode === 'store') {
        console.log('📝 STORE MODE: Applying clean formatting using Mindsy Notes engine...');
        
        // Use the same robust Mindsy Notes engine but with different instructions for clean formatting
        const cleanFormattingInput: MindsyNotesInput = {
          pdfText: extractedText, // Use pdfText field instead of transcript
          lectureTitle: documentTitle,
          courseSubject: courseSubject,
          detectedLanguage: 'en',
          formatMode: 'clean-document' // Special flag for clean formatting vs Mindsy structure
        };
        
        const formatResult = await generateMindsyNotes(cleanFormattingInput);
        
        if (!formatResult.success || !formatResult.notes) {
          throw new Error(`Clean formatting failed: ${formatResult.error || 'Unknown error'}`);
        }
        
        processedContent = formatResult.notes;
        
      } else {
        console.log('🎓 ENHANCE MODE: Generating Mindsy Notes...');
        
        const cornellInput: MindsyNotesInput = {
          transcript: extractedText,
          lectureTitle: documentTitle,
          courseSubject: courseSubject,
          detectedLanguage: 'en'
        };
        
        const mindsyResult = await generateMindsyNotes(cornellInput);
        
        if (!mindsyResult.success || !mindsyResult.notes) {
          throw new Error(`Mindsy Notes generation failed: ${mindsyResult.error || 'Unknown error'}`);
        }
        
        processedContent = mindsyResult.notes;
      }

      console.log(`✅ AI processing completed, content length: ${processedContent.length}`);

      // Step 4: Generate PDF
      console.log('📄 Generating PDF...');
      const gotenbergClient = createGotenbergClient();
      let pdfResult;

      if (processingMode === 'store') {
        // Simple PDF with clean formatting and CSS
        const baseHtml = await convertMarkdownToHtml(processedContent);
        const styledHtml = formatSimpleDocumentAsHtml(baseHtml, documentTitle);
        pdfResult = await gotenbergClient.generatePdfFromHtml(styledHtml, {
          title: documentTitle,
          marginTop: '1in',
          marginBottom: '1in',
          marginLeft: '1in',
          marginRight: '1in'
        });
      } else {
        // Mindsy Notes PDF with template
        const htmlContent = await convertMarkdownToHtml(processedContent);
        pdfResult = await gotenbergClient.generateMindsyNotesPdf(htmlContent, documentTitle, true);
      }

      if (!pdfResult.success || !pdfResult.pdfBuffer) {
        throw new Error(`PDF generation failed: ${pdfResult.error || 'Unknown error'}`);
      }

      // Step 5: Store PDF
      const pdfFileName = `${documentTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}.pdf`;
      const pdfPath = generateSecureFilePath(user.id, pdfFileName, 'summaries');
      
      const uploadResult = await uploadFile(
        STORAGE_BUCKETS.GENERATED_NOTES,
        pdfPath,
        new Uint8Array(pdfResult.pdfBuffer),
        'application/pdf'
      );

      if (!uploadResult.success) {
        console.error('❌ PDF upload failed:', {
          uploadResult,
          pdfPath,
          pdfBufferSize: pdfResult.pdfBuffer?.byteLength,
          error: uploadResult.error
        });
        throw new Error(`Failed to upload PDF: ${uploadResult.error || 'Unknown storage error'}`);
      }
      
      console.log('✅ PDF uploaded successfully to:', pdfPath);

      // Step 6: Generate download URL
      const downloadUrlResult = await generateSignedUrl(
        STORAGE_BUCKETS.GENERATED_NOTES,
        pdfPath,
        EXPIRATION_TIMES.LONG
      );

      const downloadUrl = downloadUrlResult.success ? downloadUrlResult.data?.signedUrl : undefined;

      // Step 7: Generate markdown file
      const mdFileName = `${documentTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}.md`;
      const mdPath = generateSecureFilePath(user.id, mdFileName, 'summaries');
      
      const mdUploadResult = await uploadFile(
        STORAGE_BUCKETS.GENERATED_NOTES,
        mdPath,
        new TextEncoder().encode(processedContent),
        'text/markdown'
      );

      // Step 7.5: Generate download URL for original document (store mode only)
      let originalDocumentUrl = undefined;
      if (processingMode === 'store' && originalDocumentPath) {
        const originalUrlResult = await generateSignedUrl(
          STORAGE_BUCKETS.GENERATED_NOTES,
          originalDocumentPath,
          EXPIRATION_TIMES.LONG
        );
        originalDocumentUrl = originalUrlResult.success ? originalUrlResult.data?.signedUrl : undefined;
      }

      // Step 8: Update job status with only the fields that exist in the database schema
      const updateData: any = {
        status: 'completed',
        processing_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        output_pdf_path: pdfPath,
        md_file_path: mdUploadResult.success ? mdPath : null
      };
      
      // For store mode, also add original document path
      if (processingMode === 'store' && originalDocumentUrl) {
        updateData.txt_file_path = originalDocumentPath; // Reuse txt_file_path for original document
      }
      
      console.log('🔄 Updating job status to completed...', { jobId, updateData });
      
      const { error: updateError } = await userClient.from('jobs').update(updateData).eq('job_id', jobId);
      
      if (updateError) {
        console.error('❌ Failed to update job status:', updateError);
        throw new Error(`Failed to update job status: ${updateError.message}`);
      }
      
      console.log('✅ Job status updated successfully');
      
      // Store the markdown content in the notes table
      const { error: notesError } = await userClient.from('notes').insert({
        job_id: jobId,
        content: processedContent,
        created_at: new Date().toISOString()
      });
      
      if (notesError) {
        console.warn('⚠️ Failed to store notes content (non-critical):', notesError);
      } else {
        console.log('✅ Notes content stored successfully');
      }

      // Verify the update worked by reading back the job
      const { data: verifyJob } = await userClient
        .from('jobs')
        .select('status, output_pdf_path, md_file_path')
        .eq('job_id', jobId)
        .single();
        
      console.log('🔍 Job verification after update:', verifyJob);

      const totalTime = Date.now() - processingStartTime;
      console.log(`🎉 Document processing completed in ${totalTime}ms`);

      return new Response(JSON.stringify({
        success: true,
        message: `Document processed successfully in ${processingMode} mode`,
        jobId,
        downloadUrl,
        formats: {
          pdf: downloadUrl,
          markdown: mdUploadResult.success ? mdPath : undefined,
          originalDocument: originalDocumentUrl
        }
      } satisfies DocumentProcessResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (processingError) {
      console.error('Document processing error:', processingError);
      
      // Update job status to failed
      await userClient.from('jobs').update({
        status: 'failed',
        error_message: processingError instanceof Error ? processingError.message : 'Processing failed'
      }).eq('job_id', jobId);

      return new Response(JSON.stringify({
        success: false,
        error: processingError instanceof Error ? processingError.message : 'Document processing failed',
        code: 'PROCESSING_ERROR'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Document API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};