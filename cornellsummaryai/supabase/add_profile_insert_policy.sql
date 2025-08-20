-- Add INSERT policy for profiles table to allow users to create their own profile
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- This allows users to create a profile for themselves if it doesn't exist
-- The WITH CHECK ensures they can only create a profile with their own user ID 