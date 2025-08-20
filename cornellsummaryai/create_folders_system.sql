-- Create folder system for organizing Mindsy Notes
-- This allows users to organize their notes into a hierarchical folder structure

-- 1. Create folders table
CREATE TABLE IF NOT EXISTS public.folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#3B82F6', -- Default blue color
    icon TEXT DEFAULT '📁', -- Default folder emoji
    position INTEGER DEFAULT 0, -- For custom ordering
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, parent_id, name) -- No duplicate folder names at same level
);

-- 2. Add folder_id to jobs table to link notes to folders
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL;

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON public.folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON public.folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_jobs_folder_id ON public.jobs(folder_id);

-- 4. Enable RLS
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for folders
-- Users can only see their own folders
CREATE POLICY "Users can view own folders" ON public.folders
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own folders
CREATE POLICY "Users can create own folders" ON public.folders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own folders
CREATE POLICY "Users can update own folders" ON public.folders
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own folders
CREATE POLICY "Users can delete own folders" ON public.folders
    FOR DELETE USING (auth.uid() = user_id);

-- 6. Update jobs policies to allow folder updates
CREATE POLICY "Users can update folder for own jobs" ON public.jobs
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 7. Create function to get folder hierarchy
CREATE OR REPLACE FUNCTION get_folder_hierarchy(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    parent_id UUID,
    color TEXT,
    icon TEXT,
    level INTEGER,
    path TEXT,
    note_count INTEGER
) AS $$
WITH RECURSIVE folder_tree AS (
    -- Base case: root folders
    SELECT 
        f.id,
        f.name,
        f.parent_id,
        f.color,
        f.icon,
        0 as level,
        f.name::TEXT as path
    FROM folders f
    WHERE f.user_id = p_user_id AND f.parent_id IS NULL
    
    UNION ALL
    
    -- Recursive case: child folders
    SELECT 
        f.id,
        f.name,
        f.parent_id,
        f.color,
        f.icon,
        ft.level + 1,
        ft.path || ' > ' || f.name
    FROM folders f
    INNER JOIN folder_tree ft ON f.parent_id = ft.id
    WHERE f.user_id = p_user_id
)
SELECT 
    ft.*,
    COALESCE(COUNT(j.job_id), 0)::INTEGER as note_count
FROM folder_tree ft
LEFT JOIN jobs j ON j.folder_id = ft.id AND j.status = 'completed'
GROUP BY ft.id, ft.name, ft.parent_id, ft.color, ft.icon, ft.level, ft.path
ORDER BY ft.level, ft.name;
$$ LANGUAGE SQL SECURITY DEFINER;

-- 8. Create default folders for new users (optional)
CREATE OR REPLACE FUNCTION create_default_folders()
RETURNS TRIGGER AS $$
BEGIN
    -- Create some starter folders for new users
    INSERT INTO public.folders (user_id, name, color, icon, position) VALUES
    (NEW.id, 'Lectures', '#10B981', '🎓', 1),
    (NEW.id, 'Study Notes', '#F59E0B', '📚', 2),
    (NEW.id, 'Quick Notes', '#EF4444', '⚡', 3);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Optional: Automatically create default folders for new users
-- CREATE TRIGGER create_user_default_folders
-- AFTER INSERT ON public.profiles
-- FOR EACH ROW EXECUTE FUNCTION create_default_folders();

-- 9. Function to move multiple jobs to a folder
CREATE OR REPLACE FUNCTION move_jobs_to_folder(
    p_user_id UUID,
    p_job_ids UUID[],
    p_folder_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE jobs 
    SET folder_id = p_folder_id,
        updated_at = NOW()
    WHERE user_id = p_user_id 
        AND job_id = ANY(p_job_ids);
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_folder_hierarchy(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION move_jobs_to_folder(UUID, UUID[], UUID) TO authenticated;