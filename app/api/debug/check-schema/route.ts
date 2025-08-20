import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth/require-auth'

// GET /api/debug/check-schema - Check database schema (development only)
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return createErrorResponse('Not available in production', 403)
  }

  const authResult = await requireAuth(request)
  if (authResult.error) {
    return createErrorResponse(authResult.error.message, authResult.error.status)
  }

  try {
    const supabase = await createClient()
    
    console.log('🔍 Checking database schema...')
    
    // Check notes table columns
    const { data: notesSchema, error: notesError } = await supabase
      .rpc('get_table_columns', { table_name: 'notes' })
      .select()

    if (notesError) {
      console.log('❌ Could not get notes schema via RPC, trying alternative method')
      
      // Try to get a sample note to see its structure
      const { data: sampleNotes, error: sampleError } = await supabase
        .from('notes')
        .select('*')
        .limit(1)

      if (sampleError) {
        console.error('❌ Sample notes error:', sampleError)
      } else {
        console.log('✅ Sample notes structure:', sampleNotes)
      }

      // Try to get jobs table structure too
      const { data: sampleJobs, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .limit(1)

      if (jobsError) {
        console.error('❌ Sample jobs error:', jobsError)
      } else {
        console.log('✅ Sample jobs structure:', sampleJobs)
      }

      return createSuccessResponse({
        message: 'Schema check completed (see server logs)',
        notesColumns: sampleNotes?.[0] ? Object.keys(sampleNotes[0]) : [],
        jobsColumns: sampleJobs?.[0] ? Object.keys(sampleJobs[0]) : [],
        notesError: sampleError?.message,
        jobsError: jobsError?.message
      })
    }

    console.log('✅ Notes table schema:', notesSchema)
    
    // Check jobs table columns  
    const { data: jobsSchema, error: jobsSchemaError } = await supabase
      .rpc('get_table_columns', { table_name: 'jobs' })
      .select()
    
    if (jobsSchemaError) {
      console.error('❌ Jobs schema error:', jobsSchemaError)
    } else {
      console.log('✅ Jobs table schema:', jobsSchema)
    }

    return createSuccessResponse({
      message: 'Schema check completed',
      notesSchema,
      jobsSchema,
      errors: {
        notes: notesError ? String(notesError) : null,
        jobs: jobsSchemaError ? String(jobsSchemaError) : null
      }
    })

  } catch (error) {
    console.error('❌ Schema check error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}