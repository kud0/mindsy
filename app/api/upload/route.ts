import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth/require-auth'

// POST /api/upload - Handle file upload and create processing job
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult.error) {
    return createErrorResponse(authResult.error.message, authResult.error.status)
  }

  const { user } = authResult

  try {
    // Parse multipart form data
    const formData = await request.formData()
    
    const uploadType = formData.get('uploadType') as string || 'audio'
    const audioFile = formData.get('audio') as File | null
    const pdfFile = formData.get('pdf') as File | null
    const linkUrl = formData.get('linkUrl') as string | null
    const linkType = formData.get('linkType') as string | null
    const lectureTitle = formData.get('lectureTitle') as string
    const courseSubject = formData.get('courseSubject') as string | null
    const studyNodeId = formData.get('studyNodeId') as string | null
    const processingMode = formData.get('processingMode') as string || 'enhance'
    const clientDurationMinutes = formData.get('clientDurationMinutes') as string | null

    // Validate required fields based on upload type
    if (!lectureTitle) {
      return createErrorResponse('Missing required field: lecture title')
    }

    if (uploadType === 'audio' && !audioFile) {
      return createErrorResponse('Missing required field: audio file')
    }

    if (uploadType === 'link' && !linkUrl) {
      return createErrorResponse('Missing required field: URL')
    }

    // Validate URL format for link uploads
    if (uploadType === 'link' && linkUrl) {
      try {
        new URL(linkUrl)
      } catch {
        return createErrorResponse('Invalid URL format')
      }
    }

    // Validate file types and sizes
    const MAX_AUDIO_SIZE = 100 * 1024 * 1024 // 100MB
    const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024    // 50MB

    // Validate audio file if present
    if (audioFile) {
      if (audioFile.size > MAX_AUDIO_SIZE) {
        return createErrorResponse('Audio file too large (max 100MB)')
      }

      const audioMimeTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/mp4', 'audio/m4a']
      if (!audioMimeTypes.includes(audioFile.type)) {
        return createErrorResponse('Invalid audio file type. Supported: MP3, WAV, MP4, M4A')
      }
    }
    
    // Validate PDF file if provided
    if (pdfFile) {
      if (pdfFile.size > MAX_DOCUMENT_SIZE) {
        return createErrorResponse('PDF file too large (max 50MB)')
      }
      
      if (pdfFile.type !== 'application/pdf') {
        return createErrorResponse('Invalid PDF file type')
      }
    }

    // Validate document files for documents upload type
    const documentFiles: File[] = []
    if (uploadType === 'documents') {
      // Collect all document files
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('document_') && value instanceof File) {
          documentFiles.push(value)
        }
      }

      if (documentFiles.length === 0) {
        return createErrorResponse('No documents provided for document upload')
      }

      // Validate each document file
      const documentMimeTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      for (const doc of documentFiles) {
        if (doc.size > MAX_DOCUMENT_SIZE) {
          return createErrorResponse(`Document file too large: ${doc.name} (max 50MB)`)
        }
        
        if (!documentMimeTypes.includes(doc.type)) {
          return createErrorResponse(`Invalid document type: ${doc.name}. Supported: PDF, TXT, DOC, DOCX`)
        }
      }
    }

    const supabase = await createClient()

    // Generate unique job ID and file paths
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    const timestamp = Date.now()
    
    let audioUpload: { path: string } | null = null
    let pdfUploadPath: string | null = null
    const documentUploads: string[] = []
    const uploadedFiles: string[] = [] // Track all uploaded files for cleanup

    try {
      // Upload audio file if present
      if (audioFile) {
        const audioFileName = `${user.id}/${timestamp}_${audioFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const audioBuffer = await audioFile.arrayBuffer()
        const { data: audioData, error: audioError } = await supabase.storage
          .from('user-uploads')
          .upload(audioFileName, audioBuffer, {
            contentType: audioFile.type,
            cacheControl: '3600',
            upsert: false
          })

        if (audioError) {
          console.error('Audio upload error:', audioError)
          return createErrorResponse('Failed to upload audio file', 500)
        }

        audioUpload = audioData
        uploadedFiles.push(audioFileName)
      }

      // Upload PDF file if provided
      if (pdfFile) {
        const pdfFileName = `${user.id}/${timestamp}_${pdfFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const pdfBuffer = await pdfFile.arrayBuffer()
        const { data: pdfUpload, error: pdfError } = await supabase.storage
          .from('user-uploads')
          .upload(pdfFileName, pdfBuffer, {
            contentType: pdfFile.type,
            cacheControl: '3600',
            upsert: false
          })

        if (pdfError) {
          console.error('PDF upload error:', pdfError)
          // Clean up already uploaded files
          if (uploadedFiles.length > 0) {
            await supabase.storage.from('user-uploads').remove(uploadedFiles)
          }
          return createErrorResponse('Failed to upload PDF file', 500)
        }
        
        pdfUploadPath = pdfUpload.path
        uploadedFiles.push(pdfFileName)
      }

      // Upload document files if present
      if (documentFiles.length > 0) {
        for (const [index, doc] of documentFiles.entries()) {
          const docFileName = `${user.id}/${timestamp}_doc${index}_${doc.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
          const docBuffer = await doc.arrayBuffer()
          const { data: docUpload, error: docError } = await supabase.storage
            .from('user-uploads')
            .upload(docFileName, docBuffer, {
              contentType: doc.type,
              cacheControl: '3600',
              upsert: false
            })

          if (docError) {
            console.error(`Document upload error for ${doc.name}:`, docError)
            // Clean up already uploaded files
            if (uploadedFiles.length > 0) {
              await supabase.storage.from('user-uploads').remove(uploadedFiles)
            }
            return createErrorResponse(`Failed to upload document: ${doc.name}`, 500)
          }

          documentUploads.push(docUpload.path)
          uploadedFiles.push(docFileName)
        }
      }

      // Parse client-provided duration (browser calculated)
      const durationMinutes = clientDurationMinutes ? parseInt(clientDurationMinutes, 10) : null
      
      // Create job record in database (updated schema with duration tracking)
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert({
          job_id: jobId,
          user_id: user.id,
          lecture_title: lectureTitle.trim(),
          course_subject: courseSubject?.trim() || null,
          status: 'processing',
          audio_file_path: audioUpload?.path || 'none', // Required field
          pdf_file_path: pdfUploadPath || null,
          folder_id: studyNodeId || null, // Updated schema has folder_id
          processing_started_at: new Date().toISOString(),
          duration_minutes: durationMinutes, // Use browser-calculated duration
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (jobError) {
        console.error('Job creation error:', jobError)
        // Clean up uploaded files
        if (uploadedFiles.length > 0) {
          await supabase.storage.from('user-uploads').remove(uploadedFiles)
        }
        return createErrorResponse('Failed to create processing job', 500)
      }

      // Trigger background processing using the generate API
      console.log('🔄 Upload API: Triggering background processing for', job.lecture_title);
      
      // Call the generate API asynchronously (don't await to avoid timeout)
      const generateRequest = {
        audioFilePath: audioUpload?.path || '',
        pdfFilePath: pdfUploadPath,
        lectureTitle: job.lecture_title,
        courseSubject: job.course_subject,
        processingMode: processingMode,
        studyNodeId: studyNodeId
      };

      // Start processing in background (fire and forget) - only for audio files
      if (uploadType === 'audio' && audioUpload?.path) {
        console.log('🔄 Upload API: Starting background processing...');
        
        // Use proper base URL for internal requests
        const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL 
          ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
          : 'http://localhost:3001';
          
        fetch(`${baseUrl}/api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': request.headers.get('Authorization') || '',
            'Cookie': request.headers.get('Cookie') || ''
          },
          body: JSON.stringify(generateRequest)
        }).catch(error => {
          console.error('❌ Background processing failed:', error);
        });
      } else {
        console.log('📄 Upload API: Document upload completed (no background processing needed)');
      }

      return createSuccessResponse({
        jobId,
        message: 'File uploaded successfully and processing started',
        job: {
          job_id: jobId,
          lecture_title: job.lecture_title,
          status: job.status,
          created_at: job.created_at
        }
      }, 201)

    } catch (uploadError) {
      console.error('File upload error:', uploadError)
      return createErrorResponse('Failed to upload files', 500)
    }

  } catch (error) {
    console.error('Upload API error:', error)
    return createErrorResponse('Invalid request or internal server error', 400)
  }
}