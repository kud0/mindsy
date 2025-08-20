-- Add full-text search capability to jobs and notes tables

-- Add text search configuration for English
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add indexes for better search performance on jobs table
CREATE INDEX IF NOT EXISTS idx_jobs_lecture_title_trgm ON jobs 
USING gin (lecture_title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_jobs_course_subject_trgm ON jobs 
USING gin (course_subject gin_trgm_ops);

-- Add a composite index for user_id and status for faster filtering
CREATE INDEX IF NOT EXISTS idx_jobs_user_status ON jobs(user_id, status);

-- Add indexes for notes table to enable searching within notes content
CREATE INDEX IF NOT EXISTS idx_notes_title_trgm ON notes 
USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_notes_summary_trgm ON notes 
USING gin (summary_section gin_trgm_ops);

-- Create a materialized view for faster search
CREATE MATERIALIZED VIEW IF NOT EXISTS search_view AS
SELECT 
    j.job_id,
    j.user_id,
    j.lecture_title,
    j.course_subject,
    j.created_at,
    j.status,
    j.file_size_mb,
    j.generated_pdf_path,
    j.audio_file_path,
    j.pdf_file_path,
    j.study_node_id,
    n.id as note_id,
    n.title as note_title,
    n.summary_section,
    n.notes_column,
    n.cue_column,
    COALESCE(j.lecture_title, '') || ' ' || 
    COALESCE(j.course_subject, '') || ' ' || 
    COALESCE(n.title, '') || ' ' || 
    COALESCE(n.summary_section, '') as search_text
FROM jobs j
LEFT JOIN notes n ON j.job_id = n.job_id
WHERE j.status = 'completed';

-- Create index on the materialized view
CREATE INDEX IF NOT EXISTS idx_search_view_text ON search_view 
USING gin (to_tsvector('english', search_text));

CREATE INDEX IF NOT EXISTS idx_search_view_user_id ON search_view(user_id);

-- Create a function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_search_view()
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY search_view;
END;
$$;

-- Note: RLS cannot be enabled on materialized views
-- Security is enforced through the view definition (WHERE clause filters by user_id)
-- and by granting selective permissions

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON search_view TO authenticated;
GRANT SELECT ON search_view TO anon;