import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export interface AuthResult {
  user: {
    id: string
    email: string
  }
  error?: never
}

export interface AuthError {
  user?: never
  error: {
    message: string
    status: number
  }
}

export type AuthResponse = AuthResult | AuthError

/**
 * Require authentication for API routes
 * Returns user data or error response
 */
export async function requireAuth(request: NextRequest): Promise<AuthResponse> {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return {
        error: {
          message: 'Authentication required',
          status: 401
        }
      }
    }

    return {
      user: {
        id: user.id,
        email: user.email || ''
      }
    }
  } catch (error) {
    return {
      error: {
        message: 'Authentication failed',
        status: 401
      }
    }
  }
}

/**
 * Create standardized API error response
 */
export function createErrorResponse(message: string, status: number = 400) {
  return Response.json({ error: message }, { status })
}

/**
 * Create standardized API success response
 */
export function createSuccessResponse(data: Record<string, unknown>, status: number = 200) {
  return Response.json({ data }, { status })
}