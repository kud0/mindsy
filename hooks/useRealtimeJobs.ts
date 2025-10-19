"use client";

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Job {
  job_id: string;
  lecture_title: string;
  status: 'processing' | 'completed' | 'failed';
  created_at: string;
  user_folder_id?: string | null;
  audio_duration?: number;
  txt_file_path?: string;
  output_pdf_path?: string;
  user_id: string;
  course_subject?: string;
  processing_completed_at?: string;
}

interface StudyGuide {
  id: string;
  job_id: string;
  user_id: string;
  title: string;
  subject?: string;
  language?: string;
  questions?: any[];
  explanations?: any[];
  summary?: any;
  table_of_contents?: string;
  created_at: string;
  updated_at: string;
}

interface UseRealtimeJobsProps {
  userId: string;
  onJobInsert?: (job: Job) => void;
  onJobUpdate?: (job: Job) => void;
  onJobDelete?: (jobId: string) => void;
  onStudyGuideInsert?: (guide: StudyGuide) => void;
  onStudyGuideUpdate?: (guide: StudyGuide) => void;
  onStudyGuideDelete?: (guideId: string) => void;
}

export function useRealtimeJobs({
  userId,
  onJobInsert,
  onJobUpdate,
  onJobDelete,
  onStudyGuideInsert,
  onStudyGuideUpdate,
  onStudyGuideDelete
}: UseRealtimeJobsProps) {
  useEffect(() => {
    if (!userId || userId.trim() === '') {
      console.log('⏳ Real-time: Waiting for valid userId...');
      return;
    }

    const supabase = createClient();

    console.log('🔄 Setting up real-time subscriptions for user:', userId);
    
    const channel = supabase
      .channel('lectures-realtime')
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
          console.log('📥 New job inserted:', payload.new);
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
          console.log('📝 Job updated:', payload.new);
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
          console.log('🗑️ Job deleted:', payload.old);
          if (onJobDelete) {
            onJobDelete((payload.old as Job).job_id);
          }
        }
      )
      // Study guides subscriptions
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'study_guides',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('📚 New study guide inserted:', payload.new);
          if (onStudyGuideInsert) {
            onStudyGuideInsert(payload.new as StudyGuide);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'study_guides',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('📝 Study guide updated (streaming progress):', payload.new);
          if (onStudyGuideUpdate) {
            onStudyGuideUpdate(payload.new as StudyGuide);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'study_guides',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('🗑️ Study guide deleted:', payload.old);
          if (onStudyGuideDelete) {
            onStudyGuideDelete((payload.old as StudyGuide).id);
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
      console.log('🧹 Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [userId, onJobInsert, onJobUpdate, onJobDelete, onStudyGuideInsert, onStudyGuideUpdate, onStudyGuideDelete]);
}