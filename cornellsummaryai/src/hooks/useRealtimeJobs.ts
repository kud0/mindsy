import { useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

declare global {
  interface Window {
    supabase: ReturnType<typeof createClient>;
  }
}

interface Job {
  job_id: string;
  lecture_title: string;
  status: string;
  created_at: string;
  folder_id?: string;
  audio_duration?: number;
  txt_file_path?: string; // Path to text/original document file
  user_id: string;
}

interface Folder {
  id: string;
  name: string;
  parent_id?: string;
  user_id: string;
  created_at: string;
}

interface UseRealtimeJobsProps {
  userId: string;
  onJobInsert?: (job: Job) => void;
  onJobUpdate?: (job: Job) => void;
  onJobDelete?: (jobId: string) => void;
  onFolderInsert?: (folder: Folder) => void;
  onFolderUpdate?: (folder: Folder) => void;
  onFolderDelete?: (folderId: string) => void;
}

export function useRealtimeJobs({ 
  userId, 
  onJobInsert, 
  onJobUpdate, 
  onJobDelete,
  onFolderInsert,
  onFolderUpdate,
  onFolderDelete
}: UseRealtimeJobsProps) {
  useEffect(() => {
    if (!userId) return;

    // Use existing global client or create one (avoid multiple instances)
    let supabase;
    if (typeof window !== 'undefined' && window.supabase) {
      supabase = window.supabase;
    } else {
      supabase = createClient(
        import.meta.env.PUBLIC_SUPABASE_URL,
        import.meta.env.PUBLIC_SUPABASE_ANON_KEY
      );
    }

    // Subscribe to changes in jobs and folders tables for this user
    console.log('🔄 Setting up real-time subscriptions for user:', userId);
    
    const channel = supabase
      .channel('dashboard-changes')
      // Jobs subscriptions
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'jobs',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('New job inserted:', payload.new);
          if (onJobInsert) {
            onJobInsert(payload.new as Job);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Job updated:', payload.new);
          if (onJobUpdate) {
            onJobUpdate(payload.new as Job);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'jobs',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Job deleted:', payload.old);
          if (onJobDelete) {
            onJobDelete((payload.old as Job).job_id);
          }
        }
      )
      // Folders subscriptions
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'folders',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('➕ Real-time folder INSERT event:', payload.new);
          console.log('➕ Folder INSERT payload:', payload);
          if (onFolderInsert) {
            onFolderInsert(payload.new as Folder);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'folders',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('✏️ Real-time folder UPDATE event:', payload.new);
          console.log('✏️ Folder UPDATE payload:', payload);
          if (onFolderUpdate) {
            onFolderUpdate(payload.new as Folder);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'folders',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('🗑️ Real-time folder DELETE event received');
          console.log('🗑️ Folder delete payload.old:', payload.old);
          console.log('🗑️ Full delete payload:', JSON.stringify(payload, null, 2));
          
          // Extract ID from payload.old
          const deletedFolder = payload.old as any;
          const folderId = deletedFolder?.id;
          
          console.log('🗑️ Extracted folder ID:', folderId, 'Type:', typeof folderId);
          
          if (onFolderDelete && folderId) {
            console.log('🗑️ Calling onFolderDelete with ID:', folderId);
            onFolderDelete(String(folderId));
          } else {
            console.error('🗑️ Missing onFolderDelete callback or folder ID');
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Real-time subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to real-time changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error subscribing to real-time changes');
        }
      });

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, onJobInsert, onJobUpdate, onJobDelete, onFolderInsert, onFolderUpdate, onFolderDelete]);
}