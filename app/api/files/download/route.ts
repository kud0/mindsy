import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, createErrorResponse } from '@/lib/auth/require-auth'

// GET /api/files/download?path=file_path&filename=custom_name - Download file
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult.error) {
    return createErrorResponse(authResult.error.message, authResult.error.status)
  }

  const { user } = authResult

  try {
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get('path')
    const customFilename = searchParams.get('filename')
    
    if (!filePath) {
      return createErrorResponse('File path is required', 400)
    }

    // Initialize supabase clients first
    const supabase = await createClient()
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Ensure user can only access their own files
    // Allow old-style job paths like "jobId.txt" if it matches a job owned by the user
    const isOldStylePath = /^[a-f0-9-]+\.(txt|pdf|md|json)$/.test(filePath);
    const hasUserIdInPath = filePath.startsWith(user.id + '/') || filePath.includes(`/${user.id}/`);
    
    if (!hasUserIdInPath && !isOldStylePath) {
      return createErrorResponse('Access denied', 403)
    }
    
    // For old-style paths, verify job ownership
    if (isOldStylePath) {
      const jobId = filePath.replace(/\.(txt|pdf)$/, '');
      const { data: job } = await supabase
        .from('jobs')
        .select('user_id')
        .eq('job_id', jobId)
        .single();
      
      if (!job || job.user_id !== user.id) {
        return createErrorResponse('Access denied - job not found or not owned by user', 403)
      }
    }
    
    // Try user-uploads bucket first
    let { data: fileData, error } = await supabase.storage
      .from('user-uploads')
      .download(filePath)
    
    // If not found, try generated-notes bucket with admin client
    if (error || !fileData) {
      const result = await supabaseAdmin.storage
        .from('generated-notes')
        .download(filePath)
      
      fileData = result.data
      error = result.error
    }

    if (error || !fileData) {
      console.log('File not found in storage, checking alternatives:', filePath)
      
      // For old-style job files that don't exist, try multiple strategies
      if (isOldStylePath) {
        const jobId = filePath.replace(/\.(txt|pdf|md|json)$/, '');
        const fileExtension = filePath.split('.').pop()?.toLowerCase();
        console.log('Attempting alternatives for job:', jobId, 'extension:', fileExtension)
        
        // Get job and notes data from database 
        const { data: job } = await supabase
          .from('jobs')
          .select('lecture_title, original_filename, txt_file_path, output_pdf_path, md_file_path')
          .eq('job_id', jobId)
          .single();
          
        const { data: notes } = await supabase
          .from('notes')
          .select('transcript_text, title, content, cue_column, notes_column')
          .eq('job_id', jobId)
          .single();
        
        // First, try to use the actual stored path if it exists
        if (job && fileExtension === 'txt' && job.txt_file_path) {
          console.log('Found txt_file_path in database, attempting to download:', job.txt_file_path);
          const { data: storedFile, error: storedError } = await supabaseAdmin.storage
            .from('generated-notes')
            .download(job.txt_file_path);
            
          if (storedFile && !storedError) {
            const buffer = await storedFile.arrayBuffer();
            const baseTitle = job.original_filename 
              ? job.original_filename.replace(/\.[^/.]+$/, '')
              : (job.lecture_title || 'document');
            const cleanTitle = baseTitle.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_');
            const fileName = `${cleanTitle}_transcript.txt`;
            
            return new Response(buffer, {
              status: 200,
              headers: {
                'Content-Type': 'text/plain',
                'Content-Disposition': `attachment; filename="${customFilename || fileName}"`
              }
            });
          }
        }
        
        // Otherwise, try to generate on-demand
        if (job && notes) {
          // Use original filename or lecture title for clean filename
          const baseTitle = job.original_filename 
            ? job.original_filename.replace(/\.[^/.]+$/, '') // Remove extension from original
            : (notes.title || job.lecture_title || 'document');
          const cleanTitle = baseTitle.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_');
          
          let content = '';
          let fileName = '';
          let contentType = 'application/octet-stream';
          
          switch (fileExtension) {
            case 'txt':
              if (notes.transcript_text) {
                content = notes.transcript_text;
                fileName = `${cleanTitle}_transcript.txt`;
                contentType = 'text/plain';
                console.log('Generated transcript content for:', fileName);
              }
              break;
              
            case 'md':
              // Generate markdown from notes content
              if (notes.content || notes.notes_column) {
                const notesContent = notes.content || notes.notes_column || '';
                const cueContent = notes.cue_column || '';
                content = `# ${notes.title || job.lecture_title}\n\n`;
                if (cueContent) content += `## Key Points\n${cueContent}\n\n`;
                content += `## Notes\n${notesContent}`;
                fileName = `${cleanTitle}_notes.md`;
                contentType = 'text/markdown';
                console.log('Generated markdown content for:', fileName);
              }
              break;
              
            case 'json':
              // Generate JSON structure
              const jsonData = {
                title: notes.title || job.lecture_title,
                jobId: jobId,
                transcript: notes.transcript_text || '',
                notes: notes.content || notes.notes_column || '',
                cues: notes.cue_column || '',
                originalFilename: job.original_filename
              };
              content = JSON.stringify(jsonData, null, 2);
              fileName = `${cleanTitle}_data.json`;
              contentType = 'application/json';
              console.log('Generated JSON content for:', fileName);
              break;
          }
          
          if (content) {
            return new Response(content, {
              status: 200,
              headers: {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${customFilename || fileName}"`
              }
            });
          }
        }
      }
      
      console.error('File download error:', error)
      return createErrorResponse('File not found', 404)
    }

    // For old-style paths (jobId.extension), generate clean filename from database
    let downloadFilename = customFilename || filePath.split('/').pop() || 'download'
    
    if (isOldStylePath && !customFilename) {
      const jobId = filePath.replace(/\.(txt|pdf|md|json)$/, '');
      const { data: job } = await supabase
        .from('jobs')
        .select('lecture_title, original_filename')
        .eq('job_id', jobId)
        .single();
        
      if (job) {
        // Use original filename or lecture title for clean filename
        const baseTitle = job.original_filename 
          ? job.original_filename.replace(/\.[^/.]+$/, '') // Remove extension from original
          : (job.lecture_title || 'document');
        const cleanTitle = baseTitle.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_');
        const fileExtension = filePath.split('.').pop()?.toLowerCase();
        
        switch (fileExtension) {
          case 'txt':
            downloadFilename = `${cleanTitle}_transcript.txt`;
            break;
          case 'pdf':
            downloadFilename = `${cleanTitle}_notes.pdf`;
            break;
          case 'md':
            downloadFilename = `${cleanTitle}_notes.md`;
            break;
          case 'json':
            downloadFilename = `${cleanTitle}_data.json`;
            break;
          default:
            downloadFilename = `${cleanTitle}.${fileExtension}`;
        }
      }
    }

    // Determine content type based on file extension
    const extension = downloadFilename.split('.').pop()?.toLowerCase()
    let contentType = 'application/octet-stream'
    
    switch (extension) {
      case 'pdf':
        contentType = 'application/pdf'
        break
      case 'txt':
        contentType = 'text/plain'
        break
      case 'md':
        contentType = 'text/markdown'
        break
      case 'json':
        contentType = 'application/json'
        break
      case 'mp3':
        contentType = 'audio/mpeg'
        break
      case 'wav':
        contentType = 'audio/wav'
        break
      case 'm4a':
        contentType = 'audio/mp4'
        break
    }

    // Convert blob to array buffer
    const buffer = await fileData.arrayBuffer()

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${downloadFilename}"`,
        'Cache-Control': 'private, max-age=3600'
      }
    })

  } catch (error) {
    console.error('File download API error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}