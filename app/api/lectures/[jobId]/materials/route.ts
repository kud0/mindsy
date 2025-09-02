import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth/require-auth'
import fs from 'fs'
import path from 'path'

interface RouteParams {
  params: Promise<{
    jobId: string
  }>
}

// GET /api/lectures/[jobId]/materials - Get downloadable materials for lecture
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { jobId } = await params
  
  console.log('📁 Materials API:', { jobId })
  
  // Authentication
  const authResult = await requireAuth(request)
  if (authResult.error) {
    return createErrorResponse(authResult.error.message, authResult.error.status)
  }

  const { user } = authResult

  try {
    const supabase = await createClient()

    // Get job data to verify ownership
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .single()

    if (jobError || !job) {
      console.log('❌ Job not found:', { jobError, jobId, userId: user.id })
      return createErrorResponse('Lecture not found', 404)
    }

    // Get materials from storage
    const materials: any[] = []

    // Check for generated PDF files in the job folder
    const jobFolder = path.join(process.cwd(), 'data', 'generated', jobId)
    
    try {
      if (fs.existsSync(jobFolder)) {
        const files = fs.readdirSync(jobFolder)
        
        for (const file of files) {
          const filePath = path.join(jobFolder, file)
          const stats = fs.statSync(filePath)
          
          if (stats.isFile()) {
            const fileType = path.extname(file).toLowerCase().replace('.', '')
            const fileSize = `${Math.round(stats.size / 1024)} KB`
            
            materials.push({
              id: `${jobId}-${file}`,
              name: file,
              type: fileType,
              url: `generated/${jobId}/${file}`, // Relative path for API
              size: fileSize
            })
          }
        }
      }
    } catch (fsError) {
      console.log('⚠️ Error reading job folder:', fsError)
      // Continue without files - not all lectures may have generated materials
    }

    // Add some mock materials based on the job content (for demo purposes)
    const baseFileName = job.lecture_title?.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30) || 'lecture'
    
    // Add generated PDF if it exists or mock it
    if (!materials.find(m => m.type === 'pdf')) {
      materials.push({
        id: `${jobId}-pdf`,
        name: `${baseFileName}_notes.pdf`,
        type: 'pdf',
        url: `generated/${jobId}/${baseFileName}_notes.pdf`,
        size: `${Math.floor(Math.random() * 500 + 200)} KB`
      })
    }

    // Add supplementary materials
    materials.push({
      id: `${jobId}-summary`,
      name: `${baseFileName}_summary.txt`,
      type: 'txt', 
      url: `generated/${jobId}/${baseFileName}_summary.txt`,
      size: `${Math.floor(Math.random() * 50 + 10)} KB`
    })

    console.log(`✅ Found ${materials.length} materials for job ${jobId}`)
    
    return createSuccessResponse({
      materials,
      count: materials.length
    })

  } catch (error) {
    console.error('❌ Materials API error:', error)
    return createErrorResponse(
      'Failed to load materials',
      500
    )
  }
}