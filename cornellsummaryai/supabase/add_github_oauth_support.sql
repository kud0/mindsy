-- GitHub OAuth Support Migration
-- This migration adds GitHub OAuth support to the existing database schema

-- Add GitHub-related columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN github_id TEXT UNIQUE,
ADD COLUMN github_username TEXT,
ADD COLUMN avatar_url TEXT;

-- Create oauth_connections table for managing OAuth provider relationships
CREATE TABLE public.oauth_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    provider_username TEXT,
    access_token TEXT, -- encrypted
    refresh_token TEXT, -- encrypted
    token_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(provider, provider_user_id),
    UNIQUE(user_id, provider)
);

-- Add database indexes for performance optimization
CREATE INDEX idx_profiles_github_id ON public.profiles(github_id) WHERE github_id IS NOT NULL;
CREATE INDEX idx_profiles_github_username ON public.profiles(github_username) WHERE github_username IS NOT NULL;
CREATE INDEX idx_oauth_connections_user_id ON public.oauth_connections(user_id);
CREATE INDEX idx_oauth_connections_provider ON public.oauth_connections(provider);
CREATE INDEX idx_oauth_connections_provider_user_id ON public.oauth_connections(provider_user_id);
CREATE INDEX idx_oauth_connections_token_expires ON public.oauth_connections(token_expires_at) WHERE token_expires_at IS NOT NULL;

-- Enable RLS for oauth_connections table
ALTER TABLE public.oauth_connections ENABLE ROW LEVEL SECURITY;

-- RLS policies for oauth_connections
CREATE POLICY "Users can view own oauth connections" ON public.oauth_connections
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own oauth connections" ON public.oauth_connections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own oauth connections" ON public.oauth_connections
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own oauth connections" ON public.oauth_connections
    FOR DELETE USING (auth.uid() = user_id);

-- Add trigger for updated_at timestamp on oauth_connections
CREATE TRIGGER update_oauth_connections_updated_at BEFORE UPDATE ON public.oauth_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Database functions for OAuth connection management

-- Function to create or update OAuth connection
CREATE OR REPLACE FUNCTION public.upsert_oauth_connection(
    p_user_id UUID,
    p_provider TEXT,
    p_provider_user_id TEXT,
    p_provider_username TEXT DEFAULT NULL,
    p_access_token TEXT DEFAULT NULL,
    p_refresh_token TEXT DEFAULT NULL,
    p_token_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_connection_id UUID;
BEGIN
    INSERT INTO public.oauth_connections (
        user_id,
        provider,
        provider_user_id,
        provider_username,
        access_token,
        refresh_token,
        token_expires_at
    )
    VALUES (
        p_user_id,
        p_provider,
        p_provider_user_id,
        p_provider_username,
        p_access_token,
        p_refresh_token,
        p_token_expires_at
    )
    ON CONFLICT (user_id, provider)
    DO UPDATE SET
        provider_user_id = EXCLUDED.provider_user_id,
        provider_username = EXCLUDED.provider_username,
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        token_expires_at = EXCLUDED.token_expires_at,
        updated_at = NOW()
    RETURNING id INTO v_connection_id;
    
    RETURN v_connection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get OAuth connection by provider
CREATE OR REPLACE FUNCTION public.get_oauth_connection(
    p_user_id UUID,
    p_provider TEXT
)
RETURNS TABLE(
    id UUID,
    provider TEXT,
    provider_user_id TEXT,
    provider_username TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        oc.id,
        oc.provider,
        oc.provider_user_id,
        oc.provider_username,
        oc.token_expires_at,
        oc.created_at,
        oc.updated_at
    FROM public.oauth_connections oc
    WHERE oc.user_id = p_user_id AND oc.provider = p_provider;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove OAuth connection
CREATE OR REPLACE FUNCTION public.remove_oauth_connection(
    p_user_id UUID,
    p_provider TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM public.oauth_connections
    WHERE user_id = p_user_id AND provider = p_provider;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    -- Also clear GitHub-specific fields from profiles if removing GitHub connection
    IF p_provider = 'github' AND v_deleted_count > 0 THEN
        UPDATE public.profiles
        SET 
            github_id = NULL,
            github_username = NULL,
            avatar_url = NULL
        WHERE id = p_user_id;
    END IF;
    
    RETURN v_deleted_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update GitHub profile data
CREATE OR REPLACE FUNCTION public.update_github_profile(
    p_user_id UUID,
    p_github_id TEXT,
    p_github_username TEXT,
    p_avatar_url TEXT DEFAULT NULL,
    p_full_name TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.profiles
    SET 
        github_id = p_github_id,
        github_username = p_github_username,
        avatar_url = COALESCE(p_avatar_url, avatar_url),
        full_name = COALESCE(p_full_name, full_name),
        updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if GitHub account is already linked
CREATE OR REPLACE FUNCTION public.check_github_account_exists(
    p_github_id TEXT
)
RETURNS TABLE(
    user_id UUID,
    email TEXT,
    full_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.email,
        p.full_name
    FROM public.profiles p
    WHERE p.github_id = p_github_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's OAuth connections
CREATE OR REPLACE FUNCTION public.get_user_oauth_connections(
    p_user_id UUID
)
RETURNS TABLE(
    id UUID,
    provider TEXT,
    provider_user_id TEXT,
    provider_username TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        oc.id,
        oc.provider,
        oc.provider_user_id,
        oc.provider_username,
        oc.token_expires_at,
        oc.created_at
    FROM public.oauth_connections oc
    WHERE oc.user_id = p_user_id
    ORDER BY oc.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has alternative authentication method before unlinking
CREATE OR REPLACE FUNCTION public.can_unlink_oauth_provider(
    p_user_id UUID,
    p_provider TEXT
)
RETURNS TABLE(
    can_unlink BOOLEAN,
    reason TEXT
) AS $$
DECLARE
    v_has_password BOOLEAN := FALSE;
    v_other_oauth_count INTEGER := 0;
    v_user_email TEXT;
BEGIN
    -- Get user email to check if they have a password set
    SELECT email INTO v_user_email
    FROM public.profiles
    WHERE id = p_user_id;
    
    -- Check if user has password authentication (by checking auth.users)
    SELECT EXISTS(
        SELECT 1 FROM auth.users 
        WHERE id = p_user_id 
        AND encrypted_password IS NOT NULL 
        AND encrypted_password != ''
    ) INTO v_has_password;
    
    -- Count other OAuth connections
    SELECT COUNT(*) INTO v_other_oauth_count
    FROM public.oauth_connections
    WHERE user_id = p_user_id AND provider != p_provider;
    
    -- User can unlink if they have password auth or other OAuth connections
    IF v_has_password OR v_other_oauth_count > 0 THEN
        RETURN QUERY SELECT TRUE, 'User has alternative authentication method';
    ELSE
        RETURN QUERY SELECT FALSE, 'User must have at least one authentication method';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;