-- Add Google OAuth support to profiles table
-- This migration adds fields needed for Google OAuth integration

-- Add Google OAuth fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'email',
ADD COLUMN IF NOT EXISTS course_name TEXT,
ADD COLUMN IF NOT EXISTS course_url TEXT;

-- Update avatar_url column if it doesn't exist (from GitHub OAuth migration)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_google_id ON public.profiles(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_provider ON public.profiles(provider);

-- Update the oauth_connections table to support Google if it exists
-- (This table was created in the GitHub OAuth migration)
DO $$ 
BEGIN
    -- Check if oauth_connections table exists and add Google support
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'oauth_connections') THEN
        -- Ensure the table can handle Google OAuth connections
        -- The existing structure should already support it via the provider field
        
        -- Add any Google-specific indexes if needed
        CREATE INDEX IF NOT EXISTS idx_oauth_connections_google ON public.oauth_connections(provider, provider_user_id) 
        WHERE provider = 'google';
    END IF;
END $$;

-- Create or update the function to handle Google profile updates
CREATE OR REPLACE FUNCTION public.update_google_profile(
    p_user_id UUID,
    p_google_id TEXT,
    p_google_email TEXT DEFAULT NULL,
    p_avatar_url TEXT DEFAULT NULL,
    p_full_name TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET 
        google_id = p_google_id,
        provider = 'google',
        avatar_url = COALESCE(p_avatar_url, avatar_url),
        email = COALESCE(p_google_email, email),
        full_name = COALESCE(p_full_name, full_name),
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- If no rows were updated, the profile might not exist
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found for user ID: %', p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user's OAuth providers
CREATE OR REPLACE FUNCTION public.get_user_oauth_providers(p_user_id UUID)
RETURNS TABLE(
    provider TEXT,
    provider_user_id TEXT,
    provider_username TEXT,
    connected_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- Return data from oauth_connections if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'oauth_connections') THEN
        RETURN QUERY
        SELECT 
            oc.provider,
            oc.provider_user_id,
            oc.provider_username,
            oc.created_at
        FROM public.oauth_connections oc
        WHERE oc.user_id = p_user_id
        ORDER BY oc.created_at DESC;
    ELSE
        -- Fallback: determine provider from profile data
        RETURN QUERY
        SELECT 
            CASE 
                WHEN p.google_id IS NOT NULL THEN 'google'::TEXT
                WHEN p.github_id IS NOT NULL THEN 'github'::TEXT
                ELSE p.provider
            END as provider,
            COALESCE(p.google_id, p.github_id, p.id::TEXT) as provider_user_id,
            COALESCE(p.github_username, p.full_name) as provider_username,
            p.created_at as connected_at
        FROM public.profiles p
        WHERE p.id = p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the handle_new_user function to support Google OAuth users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_provider TEXT := 'email';
    v_google_id TEXT;
    v_avatar_url TEXT;
    v_full_name TEXT;
BEGIN
    -- Determine provider and extract OAuth data
    IF NEW.raw_user_meta_data IS NOT NULL THEN
        -- Check for Google OAuth data
        IF NEW.raw_user_meta_data->>'iss' = 'https://accounts.google.com' OR 
           NEW.raw_user_meta_data->>'provider' = 'google' THEN
            v_provider := 'google';
            v_google_id := NEW.raw_user_meta_data->>'sub';
            v_avatar_url := COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture');
            v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name');
        -- Check for GitHub OAuth data (existing logic)
        ELSIF NEW.raw_user_meta_data->>'provider' = 'github' THEN
            v_provider := 'github';
            v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name');
            v_avatar_url := NEW.raw_user_meta_data->>'avatar_url';
        ELSE
            -- Email signup
            v_full_name := NEW.raw_user_meta_data->>'full_name';
        END IF;
    END IF;
    
    -- Insert profile with provider-specific data
    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        provider,
        google_id,
        avatar_url
    )
    VALUES (
        NEW.id, 
        NEW.email, 
        v_full_name,
        v_provider,
        v_google_id,
        v_avatar_url
    );
    
    -- Initialize usage for current month
    INSERT INTO public.usage (user_id, month_year)
    VALUES (NEW.id, TO_CHAR(NOW(), 'YYYY-MM'))
    ON CONFLICT (user_id, month_year) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.update_google_profile(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_oauth_providers(UUID) TO authenticated;

-- Add RLS policies for new fields
-- (The existing policies should cover the new fields, but we can add specific ones if needed)

COMMENT ON FUNCTION public.update_google_profile IS 'Updates user profile with Google OAuth data';
COMMENT ON FUNCTION public.get_user_oauth_providers IS 'Returns all OAuth providers connected to a user account';