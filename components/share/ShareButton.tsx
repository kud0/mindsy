'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { ShareModal } from './ShareModal';

interface ShareButtonProps {
  jobId: string;
  lectureTitle: string;
  variant?: 'default' | 'icon';
  className?: string;
}

export function ShareButton({
  jobId,
  lectureTitle,
  variant = 'default',
  className = ''
}: ShareButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className={`p-2 hover:bg-gray-100 rounded-full transition-colors ${className}`}
          title="Share with friends"
        >
          <Share2 className="w-5 h-5 text-gray-600" />
        </button>

        <ShareModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          jobId={jobId}
          lectureTitle={lectureTitle}
        />
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${className}`}
      >
        <Share2 className="w-4 h-4" />
        Share
      </button>

      <ShareModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        jobId={jobId}
        lectureTitle={lectureTitle}
      />
    </>
  );
}
