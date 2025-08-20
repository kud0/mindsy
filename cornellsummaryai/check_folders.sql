-- Verify folder system is properly set up
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'folders'
) as folders_table_exists,
EXISTS (
  SELECT FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'jobs' 
  AND column_name = 'folder_id'
) as folder_id_column_exists,
EXISTS (
  SELECT FROM pg_proc 
  WHERE proname = 'get_folder_hierarchy'
) as get_folder_hierarchy_exists,
EXISTS (
  SELECT FROM pg_proc 
  WHERE proname = 'move_jobs_to_folder'
) as move_jobs_to_folder_exists;
