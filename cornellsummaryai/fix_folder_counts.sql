-- Fix folder counts to include all relevant job statuses
-- Update the get_folder_hierarchy function to count completed and cached jobs

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
LEFT JOIN jobs j ON j.folder_id = ft.id 
    AND j.user_id = p_user_id 
    AND j.status IN ('completed', 'cached')  -- Count completed and cached jobs
GROUP BY ft.id, ft.name, ft.parent_id, ft.color, ft.icon, ft.level, ft.path
ORDER BY ft.level, ft.name;
$$ LANGUAGE SQL SECURITY DEFINER;