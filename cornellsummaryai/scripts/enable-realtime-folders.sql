-- Enable real-time for folders table
-- This is required for real-time subscriptions to work

-- Enable real-time for the folders table
ALTER PUBLICATION supabase_realtime ADD TABLE folders;

-- Also ensure jobs table has real-time enabled (if not already)
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;

-- Verify real-time is enabled for both tables
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';