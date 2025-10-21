"use client"

import React from 'react';
import { ShareButton } from '@/components/share/ShareButton';
import { cn } from '@/lib/utils';

interface FloatingShareButtonProps {
  jobId: string;
  lectureTitle: string;
}

export function FloatingShareButton({
  jobId,
  lectureTitle
}: FloatingShareButtonProps) {
  return (
    <div className="fixed top-20 right-4 z-40 pointer-events-auto">
      <div
        className={cn(
          "relative bg-white/80 backdrop-blur-xl rounded-full shadow-lg border border-gray-200/50",
          "transition-all duration-200 hover:shadow-xl hover:scale-105 active:scale-95",
          "before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-b before:from-white/20 before:to-transparent before:pointer-events-none"
        )}
      >
        <ShareButton
          jobId={jobId}
          lectureTitle={lectureTitle}
          variant="icon"
          className="p-3 relative z-10"
        />
      </div>
    </div>
  );
}
