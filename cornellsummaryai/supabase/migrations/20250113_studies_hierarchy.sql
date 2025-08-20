-- Create studies hierarchy tables
-- This replaces the old folder system with a flexible hierarchical structure

-- Create enum for hierarchy types
CREATE TYPE hierarchy_type AS ENUM ('course', 'year', 'subject', 'semester', 'custom');

-- Main hierarchy table with recursive parent-child relationship
CREATE TABLE study_nodes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES study_nodes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type hierarchy_type NOT NULL,
    description TEXT,
    color TEXT, -- For UI customization (hex color)
    icon TEXT, -- Icon identifier for UI
    sort_order INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT FALSE, -- Whether this node is pinned to sidebar
    metadata JSONB DEFAULT '{}', -- Flexible storage for additional properties
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique names within same parent for same user
    CONSTRAINT unique_name_per_parent UNIQUE (user_id, parent_id, name)
);

-- Create indexes for performance
CREATE INDEX idx_study_nodes_user_id ON study_nodes(user_id);
CREATE INDEX idx_study_nodes_parent_id ON study_nodes(parent_id);
CREATE INDEX idx_study_nodes_is_pinned ON study_nodes(is_pinned);
CREATE INDEX idx_study_nodes_sort_order ON study_nodes(sort_order);

-- Update the notes table to reference study_nodes instead of folders
ALTER TABLE notes 
    ADD COLUMN study_node_id UUID REFERENCES study_nodes(id) ON DELETE SET NULL;

-- Create index for the new column
CREATE INDEX idx_notes_study_node_id ON notes(study_node_id);

-- Migrate existing folder data to study_nodes (if folders table exists)
-- Note: Since the notes table doesn't have a folder_id column yet, 
-- we'll skip the migration of note associations
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'folders') THEN
        -- Insert existing folders as study_nodes with type 'custom'
        INSERT INTO study_nodes (user_id, name, type, created_at, updated_at)
        SELECT user_id, name, 'custom'::hierarchy_type, created_at, COALESCE(updated_at, created_at)
        FROM folders;
        
        -- Skip note migration since notes don't have folder_id yet
        -- Notes will need to be manually associated with study nodes through the UI
    END IF;
END $$;

-- Function to get the full path of a node (for breadcrumbs)
CREATE OR REPLACE FUNCTION get_node_path(node_id UUID)
RETURNS TABLE(id UUID, name TEXT, type hierarchy_type, level INTEGER) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE path AS (
        SELECT sn.id, sn.name, sn.type, sn.parent_id, 0 as level
        FROM study_nodes sn
        WHERE sn.id = node_id
        
        UNION ALL
        
        SELECT sn.id, sn.name, sn.type, sn.parent_id, p.level + 1
        FROM study_nodes sn
        JOIN path p ON sn.id = p.parent_id
    )
    SELECT p.id, p.name, p.type, p.level
    FROM path p
    ORDER BY p.level DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get all descendants of a node (for tree display)
CREATE OR REPLACE FUNCTION get_node_descendants(node_id UUID, max_depth INTEGER DEFAULT NULL)
RETURNS TABLE(
    id UUID, 
    parent_id UUID,
    name TEXT, 
    type hierarchy_type, 
    description TEXT,
    color TEXT,
    icon TEXT,
    sort_order INTEGER,
    is_pinned BOOLEAN,
    depth INTEGER,
    has_children BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE tree AS (
        -- Base case: the node itself
        SELECT 
            sn.id, 
            sn.parent_id,
            sn.name, 
            sn.type, 
            sn.description,
            sn.color,
            sn.icon,
            sn.sort_order,
            sn.is_pinned,
            0 as depth
        FROM study_nodes sn
        WHERE sn.id = node_id
        
        UNION ALL
        
        -- Recursive case: children
        SELECT 
            sn.id, 
            sn.parent_id,
            sn.name, 
            sn.type, 
            sn.description,
            sn.color,
            sn.icon,
            sn.sort_order,
            sn.is_pinned,
            t.depth + 1
        FROM study_nodes sn
        JOIN tree t ON sn.parent_id = t.id
        WHERE max_depth IS NULL OR t.depth < max_depth - 1
    )
    SELECT 
        t.*,
        EXISTS(SELECT 1 FROM study_nodes WHERE parent_id = t.id) as has_children
    FROM tree t
    ORDER BY t.depth, t.sort_order, t.name;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's pinned nodes for sidebar
CREATE OR REPLACE FUNCTION get_pinned_nodes(p_user_id UUID)
RETURNS TABLE(
    id UUID,
    parent_id UUID,
    name TEXT,
    type hierarchy_type,
    description TEXT,
    color TEXT,
    icon TEXT,
    sort_order INTEGER,
    depth INTEGER,
    has_children BOOLEAN,
    note_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH pinned AS (
        SELECT sn.id
        FROM study_nodes sn
        WHERE sn.user_id = p_user_id AND sn.is_pinned = true
    ),
    tree AS (
        SELECT * FROM pinned
        UNION
        SELECT DISTINCT d.id
        FROM pinned p
        CROSS JOIN LATERAL get_node_descendants(p.id) d
    )
    SELECT 
        sn.id,
        sn.parent_id,
        sn.name,
        sn.type,
        sn.description,
        sn.color,
        sn.icon,
        sn.sort_order,
        CASE 
            WHEN sn.parent_id IS NULL THEN 0
            ELSE (
                SELECT COUNT(*)
                FROM study_nodes sn2
                WHERE sn2.id IN (SELECT id FROM tree)
                AND sn.id = ANY(
                    WITH RECURSIVE ancestors AS (
                        SELECT id, parent_id FROM study_nodes WHERE id = sn2.id
                        UNION ALL
                        SELECT s.id, s.parent_id FROM study_nodes s
                        JOIN ancestors a ON s.id = a.parent_id
                    )
                    SELECT id FROM ancestors
                )
            )
        END as depth,
        EXISTS(SELECT 1 FROM study_nodes WHERE parent_id = sn.id) as has_children,
        (SELECT COUNT(*) FROM notes WHERE study_node_id = sn.id) as note_count
    FROM study_nodes sn
    WHERE sn.id IN (SELECT id FROM tree)
    ORDER BY depth, sn.sort_order, sn.name;
END;
$$ LANGUAGE plpgsql;

-- RLS policies
ALTER TABLE study_nodes ENABLE ROW LEVEL SECURITY;

-- Users can only see their own study nodes
CREATE POLICY "Users can view own study nodes"
    ON study_nodes FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create their own study nodes
CREATE POLICY "Users can create own study nodes"
    ON study_nodes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own study nodes
CREATE POLICY "Users can update own study nodes"
    ON study_nodes FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own study nodes
CREATE POLICY "Users can delete own study nodes"
    ON study_nodes FOR DELETE
    USING (auth.uid() = user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_study_nodes_updated_at
    BEFORE UPDATE ON study_nodes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add some helpful comments
COMMENT ON TABLE study_nodes IS 'Hierarchical organization structure for student studies';
COMMENT ON COLUMN study_nodes.type IS 'Type of node: course, year, subject, semester, or custom';
COMMENT ON COLUMN study_nodes.is_pinned IS 'Whether this node appears in the sidebar';
COMMENT ON COLUMN study_nodes.metadata IS 'Flexible JSON storage for additional properties like semester dates, credits, etc.';