'use client';

import { useState } from 'react';
import { Swords } from 'lucide-react';
import { BattleChallengeModal } from './BattleChallengeModal';

interface Friend {
  id: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

interface Folder {
  id: string;
  folder_name: string;
  lecture_count?: number;
}

interface BattleChallengeButtonProps {
  friend: Friend;
  userFolders?: Folder[];
}

export function BattleChallengeButton({ friend, userFolders = [] }: BattleChallengeButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-purple-600 hover:bg-purple-50 rounded-lg text-sm font-medium transition-colors"
        title="Challenge to quiz battle"
      >
        <Swords className="w-4 h-4" />
        Challenge
      </button>

      <BattleChallengeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        friend={friend}
        folders={userFolders}
      />
    </>
  );
}
