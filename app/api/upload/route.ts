import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createLargeFileClient } from '@/lib/supabase/large-file-client'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth/require-auth'
import { LinkContentExtractor } from '@/lib/content-extractors'

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

    // Validate URL format and support for link uploads
    if (uploadType === 'link' && linkUrl) {
      try {
        new URL(linkUrl)
      } catch {
        return createErrorResponse('Invalid URL format')
      }
      
      // Check if the URL is supported by our content extractors
      if (!LinkContentExtractor.isUrlSupported(linkUrl)) {
        const supportedDomains = LinkContentExtractor.getSupportedDomains().slice(0, 8).join(', ')
        return createErrorResponse(`Unsupported URL type. Supported sites include: ${supportedDomains}...`)
      }
    }

    // Validate file types and sizes
    const MAX_AUDIO_SIZE = 500 * 1024 * 1024 // 500MB
    const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024    // 50MB

    // Validate audio file if present
    if (audioFile) {
      if (audioFile.size > MAX_AUDIO_SIZE) {
        return createErrorResponse('Audio file too large (max 500MB)')
      }

      const audioMimeTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac']
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
      console.log('📄 Collecting document files from FormData...');
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('document_') && value instanceof File) {
          console.log(`📄 Found document field: ${key}`, {
            fileName: value.name,
            fileType: value.type,
            fileSize: `${(value.size / 1024 / 1024).toFixed(2)}MB`
          });
          documentFiles.push(value)
        }
      }

      console.log(`📄 Total documents collected: ${documentFiles.length}`);

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
      console.log('✅ All documents validated successfully');
    }

    const supabase = await createClient()

    const timestamp = Date.now()
    
    let audioUpload: { path: string } | null = null
    let pdfUploadPath: string | null = null
    const documentUploads: string[] = []
    const uploadedFiles: string[] = [] // Track all uploaded files for cleanup
    let linkContent: any = null // Store extracted link content

    try {
      // Upload audio file if present
      if (audioFile) {
        const audioFileName = `${user.id}/${timestamp}_${audioFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const fileSizeMB = (audioFile.size / 1024 / 1024).toFixed(2)
        
        console.log(`🎵 Uploading large audio file: ${audioFile.name} (${fileSizeMB}MB)`)
        
        const audioBuffer = await audioFile.arrayBuffer()
        
        // Use specialized client for large audio file uploads
        const largeFileClient = createLargeFileClient()
        const uploadStart = Date.now()
        
        const { data: audioData, error: audioError } = await largeFileClient.storage
          .from('user-uploads')
          .upload(audioFileName, audioBuffer, {
            contentType: audioFile.type,
            cacheControl: '3600',
            upsert: false
          })

        const uploadDuration = ((Date.now() - uploadStart) / 1000).toFixed(2)
        
        if (audioError) {
          console.error(`❌ Audio upload failed after ${uploadDuration}s:`, audioError)
          return createErrorResponse(`Failed to upload audio file (${fileSizeMB}MB): ${audioError.message || 'Unknown error'}`, 500)
        }
        
        console.log(`✅ Audio upload successful: ${fileSizeMB}MB in ${uploadDuration}s`)

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
        console.log(`📄 Starting upload of ${documentFiles.length} document(s)...`);
        for (const [index, doc] of documentFiles.entries()) {
          const docFileName = `${user.id}/${timestamp}_doc${index}_${doc.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
          console.log(`📄 Uploading document ${index + 1}/${documentFiles.length}:`, {
            fileName: doc.name,
            storagePath: docFileName,
            fileSize: `${(doc.size / 1024 / 1024).toFixed(2)}MB`
          });
          const docBuffer = await doc.arrayBuffer()
          const { data: docUpload, error: docError } = await supabase.storage
            .from('user-uploads')
            .upload(docFileName, docBuffer, {
              contentType: doc.type,
              cacheControl: '3600',
              upsert: false
            })

          if (docError) {
            console.error(`❌ Document upload error for ${doc.name}:`, docError)
            // Clean up already uploaded files
            if (uploadedFiles.length > 0) {
              await supabase.storage.from('user-uploads').remove(uploadedFiles)
            }
            return createErrorResponse(`Failed to upload document: ${doc.name}`, 500)
          }

          console.log(`✅ Document ${index + 1} uploaded successfully:`, {
            uploadPath: docUpload.path,
            fileName: doc.name
          });
          documentUploads.push(docUpload.path)
          uploadedFiles.push(docFileName)
        }
        console.log('📄 All documents uploaded. Final documentUploads array:', documentUploads);
      }

      // Process link content if this is a link upload
      if (uploadType === 'link' && linkUrl) {
        console.log(`🔗 Processing link content for: ${linkUrl}`)
        
        try {
          const extractionResult = await LinkContentExtractor.extractContent(linkUrl, user.id)
          
          if (!extractionResult.success || !extractionResult.data) {
            // Clean up already uploaded files
            if (uploadedFiles.length > 0) {
              await supabase.storage.from('user-uploads').remove(uploadedFiles)
            }
            
            // Handle OAuth authentication required case
            if (extractionResult.requiresAuth && extractionResult.authUrl) {
              return createErrorResponse(
                extractionResult.error || 'Authentication required', 
                401,
                { requiresAuth: true, authUrl: extractionResult.authUrl }
              )
            }
            
            return createErrorResponse(
              extractionResult.error || 'Failed to extract content from URL', 
              400
            )
          }
          
          linkContent = {
            linkType: extractionResult.linkType,
            extractedData: extractionResult.data,
            originalUrl: linkUrl
          }
          
          console.log(`✅ Successfully extracted ${extractionResult.linkType} content`)
          
        } catch (linkError) {
          console.error('Link content extraction error:', linkError)
          // Clean up already uploaded files
          if (uploadedFiles.length > 0) {
            await supabase.storage.from('user-uploads').remove(uploadedFiles)
          }
          return createErrorResponse('Failed to process link content', 500)
        }
      }

      // Return upload success with link content if applicable
      const response: any = {
        success: true,
        audioPath: audioUpload ? (audioUpload.path || audioUpload.fullPath || audioFileName) : null,
        pdfPath: pdfUploadPath,
        documentPaths: documentUploads.length > 0 ? documentUploads : null,
        message: uploadType === 'link' ? 'Link content extracted successfully' :
                 uploadType === 'documents' ? 'Documents uploaded successfully' :
                 'Files uploaded successfully'
      }

      console.log('📄 Preparing response object:', {
        uploadType,
        documentUploadsLength: documentUploads.length,
        documentUploadsArray: documentUploads,
        documentPathsInResponse: response.documentPaths,
        documentPathsIsNull: response.documentPaths === null,
        documentPathsIsArray: Array.isArray(response.documentPaths),
        responseKeys: Object.keys(response)
      });

      // Include link data if this was a link upload
      if (linkContent) {
        response.linkData = linkContent
      }

      console.log('📄 Final response before createSuccessResponse wrapper:', response);

      return createSuccessResponse(response, 200)

    } catch (uploadError) {
      console.error('File upload error:', uploadError)
      return createErrorResponse('Failed to upload files', 500)
    }

  } catch (error) {
    console.error('Upload API error:', error)
    return createErrorResponse('Invalid request or internal server error', 400)
  }
}