-- Create table for storing YouTube OAuth2 tokens
CREATE TABLE IF NOT EXISTS youtube_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    scope TEXT NOT NULL DEFAULT 'https://www.googleapis.com/auth/youtube.readonly',
    token_type TEXT NOT NULL DEFAULT 'Bearer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Ensure one token set per user
    UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE youtube_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own tokens
CREATE POLICY "Users can access own YouTube tokens" ON youtube_tokens
    FOR ALL USING (auth.uid() = user_id);

-- Index for efficient user lookups
CREATE INDEX IF NOT EXISTS youtube_tokens_user_id_idx ON youtube_tokens(user_id);

-- Index for token expiration cleanup
CREATE INDEX IF NOT EXISTS youtube_tokens_expires_at_idx ON youtube_tokens(expires_at);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_youtube_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_youtube_tokens_updated_at
    BEFORE UPDATE ON youtube_tokens
    FOR EACH ROW EXECUTE PROCEDURE update_youtube_tokens_updated_at();

-- Add comment for documentation
COMMENT ON TABLE youtube_tokens IS 'Stores YouTube OAuth2 access tokens for authenticated API access';
COMMENT ON COLUMN youtube_tokens.access_token IS 'OAuth2 access token for YouTube Data API';
COMMENT ON COLUMN youtube_tokens.refresh_token IS 'OAuth2 refresh token (optional, not always provided)';
COMMENT ON COLUMN youtube_tokens.expires_at IS 'When the access token expires';
COMMENT ON COLUMN youtube_tokens.scope IS 'OAuth2 scopes granted (e.g., youtube.readonly)';