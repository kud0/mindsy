import { ExamDashboard } from '@/components/exams/ExamDashboard';
import { createClient } from '@/lib/supabase/server';

export default async function ExamsPage() {
  const supabase = await createClient();
  
  // Get user from layout context
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return <div>Loading...</div>;
  }

  // Get user's folders for exam generation
  const { data: folders = [] } = await supabase
    .from('study_nodes')
    .select(`
      id,
      name,
      parent_id,
      type,
      description,
      created_at
    `)
    .eq('user_id', user.id)
    .order('name');

  // Transform folders with note counts
  const foldersWithCounts = await Promise.all(
    folders.map(async (folder) => {
      const { count } = await supabase
        .from('jobs')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('folder_id', folder.id)
        .eq('status', 'completed');

      return {
        id: folder.id,
        name: folder.name,
        count: count || 0,
        parentId: folder.parent_id,
        type: folder.type,
        description: folder.description
      };
    })
  );

  // Filter folders that have notes
  const foldersWithNotes = foldersWithCounts.filter(folder => folder.count > 0);

  return <ExamDashboard initialFolders={foldersWithNotes} />;
}