-- Add full-text search capability to jobs and notes tables

-- Add text search configuration for English
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add indexes for better search performance on jobs table
CREATE INDEX IF NOT EXISTS idx_jobs_lecture_title_trgm ON public.jobs 
USING gin (lecture_title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_jobs_course_subject_trgm ON public.jobs 
USING gin (course_subject gin_trgm_ops);

-- Add a composite index for user_id and status for faster filtering
CREATE INDEX IF NOT EXISTS idx_jobs_user_status ON public.jobs(user_id, status);

-- Add indexes for notes table to enable searching within notes content
CREATE INDEX IF NOT EXISTS idx_notes_title_trgm ON public.notes 
USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_notes_summary_trgm ON public.notes 
USING gin (summary_section gin_trgm_ops);

-- Create a materialized view for faster search (optional, for better performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.search_view AS
SELECT 
    j.job_id,
    j.user_id,
    j.lecture_title,
    j.course_subject,
    j.created_at,
    j.status,
    j.file_size_mb,
    n.title as note_title,
    n.summary_section,
    n.notes_column,
    COALESCE(j.lecture_title, '') || ' ' || 
    COALESCE(j.course_subject, '') || ' ' || 
    COALESCE(n.title, '') || ' ' || 
    COALESCE(n.summary_section, '') as search_text
FROM public.jobs j
LEFT JOIN public.notes n ON j.job_id = n.job_id
WHERE j.status = 'completed';

-- Create index on the materialized view
CREATE INDEX IF NOT EXISTS idx_search_view_text ON public.search_view 
USING gin (to_tsvector('english', search_text));

CREATE INDEX IF NOT EXISTS idx_search_view_user_id ON public.search_view(user_id);

-- Create a function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_search_view()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.search_view;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to refresh the view when jobs or notes are updated
CREATE OR REPLACE FUNCTION trigger_refresh_search_view()
RETURNS trigger AS $$
BEGIN
    -- Schedule a refresh (you might want to do this asynchronously in production)
    PERFORM refresh_search_view();
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policy for the search view
ALTER MATERIALIZED VIEW public.search_view OWNER TO authenticated;

-- Grant select permissions
GRANT SELECT ON public.search_view TO authenticated;
GRANT SELECT ON public.search_view TO anon;