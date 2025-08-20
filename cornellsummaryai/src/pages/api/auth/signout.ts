import type { APIRoute } from 'astro';
import pkg from '@supabase/ssr';
const { createServerClient } = pkg;

const handleSignOut = async ({ cookies, redirect }: { cookies: any, redirect: any }) => {
  const supabase = createServerClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(key) {
          return cookies.get(key)?.value;
        },
        set(key, value, options) {
          cookies.set(key, value, options);
        },
        remove(key, options) {
          cookies.delete(key, options);
        },
      },
    }
  );

  const { error } = await supabase.auth.signOut();

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  return redirect('/auth/login');
};

// Support both GET and POST for signout (GET for direct browser access, POST for forms)
export const GET: APIRoute = handleSignOut;
export const POST: APIRoute = handleSignOut;