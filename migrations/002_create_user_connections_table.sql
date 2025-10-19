-- Create user_connections table for friend relationships
-- Bidirectional friendship system (mutual friendship required)

CREATE TABLE IF NOT EXISTS user_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',

  -- Who initiated the request
  requested_by UUID NOT NULL REFERENCES auth.users(id),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure unique connections (no duplicates)
  CONSTRAINT unique_connection UNIQUE (user_id, friend_id),

  -- Prevent self-connections
  CONSTRAINT no_self_connection CHECK (user_id != friend_id),

  -- Ensure user_id < friend_id for consistent ordering (prevents both A→B and B→A)
  CONSTRAINT ordered_connection CHECK (user_id < friend_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_connections_user_status ON user_connections(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_connections_friend_status ON user_connections(friend_id, status);
CREATE INDEX IF NOT EXISTS idx_user_connections_status ON user_connections(status, created_at DESC);

-- RLS Policies
ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own connections (as either user_id or friend_id)
CREATE POLICY "Users can view their connections"
  ON user_connections
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR auth.uid() = friend_id
  );

-- Policy: Users can create connection requests
CREATE POLICY "Users can create connection requests"
  ON user_connections
  FOR INSERT
  WITH CHECK (
    auth.uid() = requested_by
    AND (auth.uid() = user_id OR auth.uid() = friend_id)
  );

-- Policy: Users can update their own connections
CREATE POLICY "Users can update their connections"
  ON user_connections
  FOR UPDATE
  USING (
    auth.uid() = user_id
    OR auth.uid() = friend_id
  )
  WITH CHECK (
    auth.uid() = user_id
    OR auth.uid() = friend_id
  );

-- Policy: Users can delete their own connections
CREATE POLICY "Users can delete their connections"
  ON user_connections
  FOR DELETE
  USING (
    auth.uid() = user_id
    OR auth.uid() = friend_id
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE TRIGGER update_user_connections_timestamp
  BEFORE UPDATE ON user_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_user_connections_updated_at();

-- Function to normalize connection order (ensure user_id < friend_id)
CREATE OR REPLACE FUNCTION normalize_connection_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Swap if needed to ensure user_id < friend_id
  IF NEW.user_id > NEW.friend_id THEN
    DECLARE
      temp_id UUID;
    BEGIN
      temp_id := NEW.user_id;
      NEW.user_id := NEW.friend_id;
      NEW.friend_id := temp_id;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to normalize on insert
CREATE TRIGGER normalize_connection_order_trigger
  BEFORE INSERT ON user_connections
  FOR EACH ROW
  EXECUTE FUNCTION normalize_connection_order();

-- Comment on table
COMMENT ON TABLE user_connections IS 'Friend connections between users - bidirectional friendship system';
COMMENT ON COLUMN user_connections.status IS 'pending: waiting for acceptance, accepted: friends, blocked: blocked user';
COMMENT ON COLUMN user_connections.requested_by IS 'The user who initiated the friend request';
