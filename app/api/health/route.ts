import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  environment: string
  services: {
    [key: string]: {
      status: 'up' | 'down' | 'unknown'
      message?: string
      responseTime?: number
      lastChecked?: string
    }
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const detailed = searchParams.get('detailed') === 'true'
  
  const healthStatus: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services: {}
  }

  // Check Supabase connection
  try {
    const start = performance.now()
    const supabase = await createClient()
    const { data, error } = await supabase.from('jobs').select('count').limit(1)
    const end = performance.now()
    const responseTime = end - start
    
    if (error) {
      healthStatus.services.supabase = {
        status: 'down',
        message: `Error: ${error.message}`,
        responseTime,
        lastChecked: new Date().toISOString()
      }
      healthStatus.status = 'degraded'
    } else {
      healthStatus.services.supabase = {
        status: 'up',
        message: 'Database connection successful',
        responseTime,
        lastChecked: new Date().toISOString()
      }
    }
  } catch (error) {
    healthStatus.services.supabase = {
      status: 'down',
      message: `Exception: ${error instanceof Error ? error.message : 'Unknown error'}`,
      lastChecked: new Date().toISOString()
    }
    healthStatus.status = 'degraded'
  }

  // Check environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_KEY'
  ]
  
  const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar])
  
  if (missingVars.length > 0) {
    healthStatus.services.environment = {
      status: 'down',
      message: `Missing environment variables: ${missingVars.join(', ')}`,
      lastChecked: new Date().toISOString()
    }
    healthStatus.status = 'degraded'
  } else {
    healthStatus.services.environment = {
      status: 'up',
      message: 'All required environment variables configured',
      lastChecked: new Date().toISOString()
    }
  }

  // Check OpenAI configuration
  healthStatus.services.openai = {
    status: process.env.OPENAI_KEY ? 'up' : 'down',
    message: process.env.OPENAI_KEY ? 'API key configured' : 'OpenAI API key not configured',
    lastChecked: new Date().toISOString()
  }
  
  if (!process.env.OPENAI_KEY) {
    healthStatus.status = 'degraded'
  }

  // Determine final status
  const criticalServices = ['supabase', 'environment', 'openai']
  const downCriticalServices = criticalServices.filter(
    service => healthStatus.services[service]?.status === 'down'
  )
  
  if (downCriticalServices.length > 0) {
    healthStatus.status = 'unhealthy'
  }

  // Return appropriate status code
  const statusCode = healthStatus.status === 'healthy' ? 200 : 
                    healthStatus.status === 'degraded' ? 200 : 503

  return Response.json(healthStatus, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Health-Status': healthStatus.status
    }
  })
}