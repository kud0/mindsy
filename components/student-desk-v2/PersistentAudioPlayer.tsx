import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';

interface PersistentAudioPlayerProps {
  jobId: string;
}

export interface PersistentAudioPlayerRef {
  seekTo: (timeInSeconds: number) => void;
}

export const PersistentAudioPlayer = forwardRef<PersistentAudioPlayerRef, PersistentAudioPlayerProps>(
  ({ jobId }, ref) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [hasAudio, setHasAudio] = useState(true);

    // Expose seekTo method to parent via ref
    useImperativeHandle(ref, () => ({
      seekTo: (timeInSeconds: number) => {
        if (audioRef.current) {
          audioRef.current.currentTime = timeInSeconds;
          audioRef.current.play();
        }
      }
    }));

    // Handle audio error (file not found)
    const handleAudioError = () => {
      console.log('⚠️ Audio file not available for this lecture');
      setHasAudio(false);
    };

    if (!hasAudio) {
      return null; // Don't show player if no audio
    }

    return (
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-2">
          {/* Main Audio Control */}
          <audio
            ref={audioRef}
            controls
            className="w-full h-10"
            src={`/api/audio/${jobId}`}
            preload="metadata"
            onError={handleAudioError}
          >
            <source src={`/api/audio/${jobId}`} type="audio/mpeg" />
            <source src={`/api/audio/${jobId}`} type="audio/mp4" />
            <source src={`/api/audio/${jobId}`} type="audio/wav" />
            Your browser does not support the audio element.
          </audio>
        </div>
      </div>
    );
  }
);

PersistentAudioPlayer.displayName = 'PersistentAudioPlayer';
