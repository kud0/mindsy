import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, createErrorResponse } from '@/lib/auth/require-auth'

// GET /api/files/view?path=file_path - Serve file for viewing
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult.error) {
    return createErrorResponse(authResult.error.message, authResult.error.status)
  }

  const { user } = authResult

  try {
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get('path')
    
    if (!filePath) {
      return createErrorResponse('File path is required', 400)
    }

    // Ensure user can only access their own files
    if (!filePath.startsWith(user.id + '/') && !filePath.includes(`/${user.id}/`)) {
      return createErrorResponse('Access denied', 403)
    }

    // Create admin client for accessing generated files
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const supabase = await createClient()
    
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
      console.error('File download error:', error)
      return createErrorResponse('File not found', 404)
    }

    // Determine content type based on file extension
    const extension = filePath.split('.').pop()?.toLowerCase()
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
        'Content-Disposition': 'inline',
        'Cache-Control': 'private, max-age=3600'
      }
    })

  } catch (error) {
    console.error('File view API error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}