-- Re-enable Row Level Security for profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- The policies already exist, so RLS is now re-enabled with existing policies