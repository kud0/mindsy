import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Create a Supabase client optimized for large file uploads
 * Uses service role key for admin access and longer timeouts
 */
export function createLargeFileClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase configuration for large file uploads')
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      // Custom fetch with longer timeout for large file uploads
      fetch: (url, options = {}) => {
        // Create an AbortController for timeout handling
        const controller = new AbortController()
        const timeoutId = setTimeout(() => {
          controller.abort()
        }, 600000) // 10 minutes timeout
        
        return fetch(url, {
          ...options,
          signal: controller.signal,
        }).finally(() => {
          clearTimeout(timeoutId)
        })
      }
    }
  })
}