-- Migration: NULL out old study folder references
-- This migration removes references to the deprecated study_nodes system
-- Setting all study_node_id values to NULL in preparation for course folder migration

-- NULL out study_node_id in jobs table (lectures)
UPDATE jobs
SET study_node_id = NULL
WHERE study_node_id IS NOT NULL;

-- NULL out study_node_id in study_sessions table
UPDATE study_sessions
SET study_node_id = NULL
WHERE study_node_id IS NOT NULL;

-- Note: We're keeping the study_node_id columns for now for rollback safety
-- They will be dropped in a future migration after confirming everything works
