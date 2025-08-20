// Database types for migrated components

export interface Note {
  job_id: string;
  lecture_title: string;
  course_subject: string | null;
  created_at: string;
  status: string;
  study_node_id: string | null;
}

export interface StudyNode {
  id: string;
  name: string;
  type: 'course' | 'year' | 'subject' | 'semester' | 'custom';
  parent_id: string | null;
  color?: string;
  children?: StudyNode[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  plan: 'free' | 'student' | 'premium';
}