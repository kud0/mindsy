import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth/require-auth'

// POST /api/debug/create-sample - Create sample lecture for testing (development only)
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return createErrorResponse('Not available in production', 403)
  }

  const authResult = await requireAuth(request)
  if (authResult.error) {
    return createErrorResponse(authResult.error.message, authResult.error.status)
  }

  const { user } = authResult

  try {
    const supabase = await createClient()
    
    // Create a sample job
    const jobId = `sample-${Date.now()}`
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        job_id: jobId,
        user_id: user.id,
        lecture_title: 'Sample Lecture: Introduction to Machine Learning',
        course_subject: 'Computer Science',
        status: 'completed',
        processing_metadata: {
          upload_type: 'audio',
          processing_mode: 'enhance',
          original_filenames: {
            audio: 'ml_intro.mp3'
          }
        }
      })
      .select()
      .single()

    if (jobError) {
      console.error('Job creation error:', jobError)
      return createErrorResponse('Failed to create sample job', 500)
    }

    // Create sample notes for the job
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .insert({
        job_id: jobId,
        content: `# Introduction to Machine Learning

## What is Machine Learning?
Machine Learning is a subset of artificial intelligence that enables computers to learn and make decisions from data without being explicitly programmed for every task.

## Key Concepts
- **Supervised Learning**: Learning with labeled examples
- **Unsupervised Learning**: Finding patterns in unlabeled data  
- **Reinforcement Learning**: Learning through trial and error

## Types of Machine Learning Algorithms
1. Linear Regression
2. Decision Trees
3. Neural Networks
4. Support Vector Machines
5. Random Forest

## Applications
Machine learning is used in:
- Image recognition
- Natural language processing
- Recommendation systems
- Fraud detection
- Autonomous vehicles

## Summary
Machine learning is transforming how we solve complex problems by allowing computers to learn patterns from data and make predictions or decisions without explicit programming.`,
        summary: 'An introduction to machine learning covering basic concepts, types of algorithms, and real-world applications. Machine learning enables computers to learn from data without explicit programming.',
        key_points: [
          'Machine learning is a subset of AI that learns from data',
          'Three main types: supervised, unsupervised, and reinforcement learning',
          'Common algorithms include linear regression, decision trees, and neural networks',
          'Applications range from image recognition to autonomous vehicles',
          'Transforms problem-solving by finding patterns in data'
        ]
      })
      .select()
      .single()

    if (noteError) {
      console.error('Note creation error:', noteError)
      return createErrorResponse('Failed to create sample note', 500)
    }

    return createSuccessResponse({
      message: 'Sample lecture created successfully',
      job_id: jobId,
      lecture_title: job.lecture_title,
      url: `/dashboard/lectures/${jobId}`
    })

  } catch (error) {
    console.error('Create sample API error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}