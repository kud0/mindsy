import React from 'react';
import ExamDashboard from './ExamDashboard';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  plan: 'free' | 'student';
  minutesUsed?: number;
  minutesLimit?: number;
}

interface Folder {
  id: string;
  name: string;
  parentId?: string;
  count: number;
}

interface ExamContentProps {
  user: User;
  initialFolders: Folder[];
}

export function ExamContent({ user, initialFolders }: ExamContentProps) {
  return (
    <div className="flex-1 overflow-hidden">
      <ExamDashboard 
        user={user}
        folders={initialFolders}
      />
    </div>
  );
}