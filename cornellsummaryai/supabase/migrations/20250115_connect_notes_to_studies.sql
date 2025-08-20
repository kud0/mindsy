-- Migration to connect notes to study_nodes and remove old folder system
-- This updates the notes system to use the new hierarchical study structure

-- First, check if jobs table has folder_id column and migrate data
DO $$
BEGIN
    -- Check if folder_id exists in jobs table
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'jobs' 
        AND column_name = 'folder_id'
    ) THEN
        -- Add study_node_id to jobs table if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'jobs' 
            AND column_name = 'study_node_id'
        ) THEN
            ALTER TABLE jobs 
            ADD COLUMN study_node_id UUID REFERENCES study_nodes(id) ON DELETE SET NULL;
            
            CREATE INDEX idx_jobs_study_node_id ON jobs(study_node_id);
        END IF;
        
        -- Migrate folder associations to study_nodes
        -- This will map old folder_ids to new study_node_ids based on matching names
        UPDATE jobs j
        SET study_node_id = sn.id
        FROM folders f
        JOIN study_nodes sn ON f.name = sn.name AND f.user_id = sn.user_id
        WHERE j.folder_id = f.id
        AND j.study_node_id IS NULL;
        
        -- Now we can safely drop the folder_id column
        ALTER TABLE jobs DROP COLUMN IF EXISTS folder_id;
    ELSE
        -- If folder_id doesn't exist, just add study_node_id if needed
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'jobs' 
            AND column_name = 'study_node_id'
        ) THEN
            ALTER TABLE jobs 
            ADD COLUMN study_node_id UUID REFERENCES study_nodes(id) ON DELETE SET NULL;
            
            CREATE INDEX idx_jobs_study_node_id ON jobs(study_node_id);
        END IF;
    END IF;
END $$;

-- Create a function to get notes count for a study node and all its descendants
CREATE OR REPLACE FUNCTION get_study_node_notes_count(node_id UUID)
RETURNS INTEGER AS $$
DECLARE
    total_count INTEGER;
BEGIN
    WITH RECURSIVE descendants AS (
        -- Start with the given node
        SELECT id FROM study_nodes WHERE id = node_id
        
        UNION ALL
        
        -- Recursively get all descendants
        SELECT sn.id 
        FROM study_nodes sn
        JOIN descendants d ON sn.parent_id = d.id
    )
    SELECT COUNT(DISTINCT j.job_id) INTO total_count
    FROM jobs j
    WHERE j.study_node_id IN (SELECT id FROM descendants)
    AND j.status = 'completed';
    
    RETURN COALESCE(total_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Create a view for easy access to notes with their study path
CREATE OR REPLACE VIEW notes_with_study_path AS
SELECT 
    j.job_id,
    j.user_id,
    j.lecture_title,
    j.course_subject,
    j.created_at,
    j.status,
    j.study_node_id,
    sn.name as study_node_name,
    sn.type as study_node_type,
    sn.parent_id as study_parent_id,
    -- Get the full path as a JSON array
    (
        SELECT json_agg(json_build_object(
            'id', p.id,
            'name', p.name,
            'type', p.type
        ) ORDER BY p.level DESC)
        FROM get_node_path(j.study_node_id) p
    ) as study_path,
    -- Get the path as a string for display
    (
        SELECT string_agg(p.name, ' / ' ORDER BY p.level DESC)
        FROM get_node_path(j.study_node_id) p
    ) as study_path_string
FROM jobs j
LEFT JOIN study_nodes sn ON j.study_node_id = sn.id
WHERE j.status = 'completed';

-- Function to move notes to a study node
CREATE OR REPLACE FUNCTION move_notes_to_study_node(
    p_user_id UUID,
    p_job_ids UUID[],
    p_study_node_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Verify the study node belongs to the user if not null
    IF p_study_node_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM study_nodes 
            WHERE id = p_study_node_id 
            AND user_id = p_user_id
        ) THEN
            RAISE EXCEPTION 'Study node does not exist or does not belong to user';
        END IF;
    END IF;
    
    -- Update the jobs with the new study_node_id
    UPDATE jobs
    SET study_node_id = p_study_node_id,
        updated_at = NOW()
    WHERE job_id = ANY(p_job_ids)
    AND user_id = p_user_id;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get all notes in a study node and its descendants
CREATE OR REPLACE FUNCTION get_study_node_notes(
    p_study_node_id UUID,
    p_user_id UUID,
    p_include_descendants BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
    job_id UUID,
    lecture_title TEXT,
    course_subject TEXT,
    created_at TIMESTAMPTZ,
    status TEXT,
    study_node_id UUID,
    study_node_name TEXT,
    study_path_string TEXT
) AS $$
BEGIN
    IF p_include_descendants THEN
        -- Get notes from this node and all descendants
        RETURN QUERY
        WITH RECURSIVE descendants AS (
            SELECT id FROM study_nodes WHERE id = p_study_node_id AND user_id = p_user_id
            
            UNION ALL
            
            SELECT sn.id 
            FROM study_nodes sn
            JOIN descendants d ON sn.parent_id = d.id
            WHERE sn.user_id = p_user_id
        )
        SELECT 
            j.job_id,
            j.lecture_title,
            j.course_subject,
            j.created_at,
            j.status,
            j.study_node_id,
            sn.name,
            (
                SELECT string_agg(p.name, ' / ' ORDER BY p.level DESC)
                FROM get_node_path(j.study_node_id) p
            ) as path_string
        FROM jobs j
        LEFT JOIN study_nodes sn ON j.study_node_id = sn.id
        WHERE j.study_node_id IN (SELECT id FROM descendants)
        AND j.user_id = p_user_id
        AND j.status = 'completed'
        ORDER BY j.created_at DESC;
    ELSE
        -- Get notes from this node only
        RETURN QUERY
        SELECT 
            j.job_id,
            j.lecture_title,
            j.course_subject,
            j.created_at,
            j.status,
            j.study_node_id,
            sn.name,
            (
                SELECT string_agg(p.name, ' / ' ORDER BY p.level DESC)
                FROM get_node_path(j.study_node_id) p
            ) as path_string
        FROM jobs j
        LEFT JOIN study_nodes sn ON j.study_node_id = sn.id
        WHERE j.study_node_id = p_study_node_id
        AND j.user_id = p_user_id
        AND j.status = 'completed'
        ORDER BY j.created_at DESC;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Update RLS policies for the new structure
-- Ensure users can only see their own notes with study nodes
-- Only create if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'jobs' 
        AND policyname = 'Users can view own notes with study nodes'
    ) THEN
        CREATE POLICY "Users can view own notes with study nodes"
            ON jobs FOR SELECT
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- Add helpful comments
COMMENT ON COLUMN jobs.study_node_id IS 'Reference to the study node (course/year/subject/etc) this note belongs to';
COMMENT ON FUNCTION get_study_node_notes_count IS 'Gets the total count of completed notes in a study node and all its descendants';
COMMENT ON FUNCTION move_notes_to_study_node IS 'Moves multiple notes to a specified study node';
COMMENT ON FUNCTION get_study_node_notes IS 'Gets all notes in a study node, optionally including descendants';
COMMENT ON VIEW notes_with_study_path IS 'View showing notes with their full study hierarchy path';

-- Create a function to get study nodes with note counts
CREATE OR REPLACE FUNCTION get_study_nodes_with_counts(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    parent_id UUID,
    name TEXT,
    type hierarchy_type,
    description TEXT,
    is_pinned BOOLEAN,
    sort_order INTEGER,
    note_count INTEGER,
    total_note_count INTEGER  -- Including descendants
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sn.id,
        sn.parent_id,
        sn.name,
        sn.type,
        sn.description,
        sn.is_pinned,
        sn.sort_order,
        (SELECT COUNT(*)::INTEGER FROM jobs WHERE study_node_id = sn.id AND status = 'completed') as note_count,
        get_study_node_notes_count(sn.id) as total_note_count
    FROM study_nodes sn
    WHERE sn.user_id = p_user_id
    ORDER BY sn.sort_order, sn.name;
END;
$$ LANGUAGE plpgsql;

-- Drop old folder-related functions if they exist
DROP FUNCTION IF EXISTS move_jobs_to_folder CASCADE;
DROP VIEW IF EXISTS folders_with_counts CASCADE;

-- Migration complete message
DO $$
BEGIN
    RAISE NOTICE 'Migration complete: Notes system now connected to study_nodes structure';
END $$;