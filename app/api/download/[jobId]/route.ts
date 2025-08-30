import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, createErrorResponse } from '@/lib/auth/require-auth'

interface RouteParams {
  params: Promise<{
    jobId: string
  }>
}

// GET /api/download/[jobId] - Download generated notes in various formats
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { jobId } = await params
  const authResult = await requireAuth(request)
  if (authResult.error) {
    return createErrorResponse(authResult.error.message, authResult.error.status)
  }

  const { user } = authResult
  const searchParams = request.nextUrl.searchParams
  const format = searchParams.get('format') || 'pdf'

  try {
    const supabase = await createClient()

    // Verify ownership and get job details with file paths
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        job_id,
        lecture_title,
        status,
        user_id,
        output_pdf_path,
        md_file_path,
        txt_file_path
      `)
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .single()

    if (jobError || !job) {
      return createErrorResponse('Note not found', 404)
    }

    if (job.status !== 'completed') {
      return createErrorResponse('Note is not ready for download', 400)
    }

    // Generate filename
    const sanitizedTitle = job.lecture_title.replace(/[^a-zA-Z0-9]/g, '_')
    const timestamp = new Date().toISOString().split('T')[0]

    // Create admin supabase client for file downloads
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
      switch (format.toLowerCase()) {
        case 'pdf':
          if (!job.output_pdf_path) {
            return createErrorResponse('PDF file not available for this note', 404)
          }
          
          const { data: pdfData, error: pdfError } = await supabaseAdmin.storage
            .from('generated-notes')
            .download(job.output_pdf_path)
          
          if (pdfError || !pdfData) {
            console.error('PDF download error:', pdfError)
            return createErrorResponse('Failed to download PDF file', 500)
          }

          return new Response(pdfData, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="${sanitizedTitle}_${timestamp}.pdf"`
            }
          })

        case 'markdown':
        case 'md':
          if (!job.md_file_path) {
            return createErrorResponse('Markdown file not available for this note', 404)
          }
          
          const { data: mdData, error: mdError } = await supabaseAdmin.storage
            .from('generated-notes')
            .download(job.md_file_path)
          
          if (mdError || !mdData) {
            console.error('Markdown download error:', mdError)
            return createErrorResponse('Failed to download Markdown file', 500)
          }
          
          const markdownContent = await mdData.text()

          return new Response(markdownContent, {
            headers: {
              'Content-Type': 'text/markdown',
              'Content-Disposition': `attachment; filename="${sanitizedTitle}_${timestamp}.md"`
            }
          })

        case 'txt':
        case 'text':
          if (!job.txt_file_path) {
            return createErrorResponse('Text file not available for this note', 404)
          }
          
          const { data: txtData, error: txtError } = await supabaseAdmin.storage
            .from('generated-notes')
            .download(job.txt_file_path)
          
          if (txtError || !txtData) {
            console.error('Text download error:', txtError)
            return createErrorResponse('Failed to download text file', 500)
          }
          
          const textContent = await txtData.text()

          return new Response(textContent, {
            headers: {
              'Content-Type': 'text/plain',
              'Content-Disposition': `attachment; filename="${sanitizedTitle}_${timestamp}.txt"`
            }
          })

        case 'json':
          // Get notes data from database for JSON export
          const { data: notesData, error: notesError } = await supabase
            .from('notes')
            .select('cue_column, notes_column, summary_section, transcript_text')
            .eq('job_id', jobId)
            .single()
          
          if (notesError || !notesData) {
            return createErrorResponse('Notes data not found', 404)
          }
          
          const jsonContent = {
            title: job.lecture_title,
            jobId: job.job_id,
            cueColumn: notesData.cue_column,
            notesColumn: notesData.notes_column,
            summarySection: notesData.summary_section,
            transcriptText: notesData.transcript_text,
            exportedAt: new Date().toISOString()
          }

          return Response.json(jsonContent, {
            headers: {
              'Content-Disposition': `attachment; filename="${sanitizedTitle}_${timestamp}.json"`
            }
          })

        case 'original':
          // TODO: Return original uploaded file if available
          return createErrorResponse('Original file format not available', 404)

        case 'zip':
          // TODO: Create ZIP with multiple formats
          return createErrorResponse('ZIP format not implemented yet', 501)

        default:
          return createErrorResponse(`Unsupported format: ${format}. Supported formats: pdf, markdown, txt, json`, 400)
      }
    } catch (formatError) {
      console.error('Format generation error:', formatError)
      return createErrorResponse('Failed to generate requested format', 500)
    }

  } catch (error) {
    console.error('Download API error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}