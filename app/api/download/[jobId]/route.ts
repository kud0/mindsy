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

    // Verify ownership and get job details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        job_id,
        lecture_title,
        status,
        user_id,
        notes!inner (
          id,
          content,
          summary,
          key_points
        )
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

    const note = job.notes[0]
    if (!note) {
      return createErrorResponse('Note content not found', 404)
    }

    // Generate filename
    const sanitizedTitle = job.lecture_title.replace(/[^a-zA-Z0-9]/g, '_')
    const timestamp = new Date().toISOString().split('T')[0]

    try {
      switch (format.toLowerCase()) {
        case 'pdf':
          // TODO: Generate PDF using a PDF library like Puppeteer or react-pdf
          // For now, return a simple text response
          const pdfContent = `
# ${job.lecture_title}

## Summary
${note.summary || 'No summary available'}

## Key Points
${Array.isArray(note.key_points) ? note.key_points.join('\n- ') : 'No key points available'}

## Full Content
${note.content || 'No content available'}
          `.trim()

          return new Response(pdfContent, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="${sanitizedTitle}_${timestamp}.pdf"`
            }
          })

        case 'markdown':
        case 'md':
          const markdownContent = `
# ${job.lecture_title}

## Summary
${note.summary || 'No summary available'}

## Key Points
${Array.isArray(note.key_points) ? note.key_points.map(point => `- ${point}`).join('\n') : '- No key points available'}

## Full Content
${note.content || 'No content available'}
          `.trim()

          return new Response(markdownContent, {
            headers: {
              'Content-Type': 'text/markdown',
              'Content-Disposition': `attachment; filename="${sanitizedTitle}_${timestamp}.md"`
            }
          })

        case 'txt':
        case 'text':
          const textContent = `
${job.lecture_title}
${'='.repeat(job.lecture_title.length)}

SUMMARY
-------
${note.summary || 'No summary available'}

KEY POINTS
----------
${Array.isArray(note.key_points) ? note.key_points.map(point => `• ${point}`).join('\n') : '• No key points available'}

FULL CONTENT
------------
${note.content || 'No content available'}
          `.trim()

          return new Response(textContent, {
            headers: {
              'Content-Type': 'text/plain',
              'Content-Disposition': `attachment; filename="${sanitizedTitle}_${timestamp}.txt"`
            }
          })

        case 'json':
          const jsonContent = {
            title: job.lecture_title,
            jobId: job.job_id,
            summary: note.summary,
            keyPoints: note.key_points,
            content: note.content,
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