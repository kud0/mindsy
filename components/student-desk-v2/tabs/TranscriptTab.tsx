import React from 'react';
import { Clock, User } from 'lucide-react';

interface TranscriptSegment {
  id: number;
  start: number;  // Start time in seconds
  end: number;    // End time in seconds
  text: string;
}

interface TranscriptData {
  text?: string;
  segments?: TranscriptSegment[];
}

interface TranscriptTabProps {
  transcript?: TranscriptData | string;
  onSeekToTime?: (timeInSeconds: number) => void;
  metadata?: {
    duration?: string;
    speakers?: string[];
  };
}

export function TranscriptTab({ transcript, onSeekToTime, metadata }: TranscriptTabProps) {
  // Jump to specific time in audio via parent's audio player
  const handleTimestampClick = (timeInSeconds: number) => {
    if (onSeekToTime) {
      onSeekToTime(timeInSeconds);
    }
  };

  // Format seconds to MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  // Handle both string and structured transcript formats
  const renderTranscript = () => {
    if (!transcript) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="text-muted-foreground/40 mb-3">
            <Clock className="w-12 h-12 mx-auto" />
          </div>
          <p className="text-muted-foreground text-center">No original content available</p>
          <p className="text-sm text-muted-foreground/60 text-center mt-2">
            Original content will appear here once the lecture has been processed
          </p>
        </div>
      );
    }

    // Handle legacy string format
    if (typeof transcript === 'string') {
      return (
        <div className="p-4 space-y-4">
          <div className="prose prose-sm max-w-none">
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">
              {transcript}
            </p>
          </div>
        </div>
      );
    }

    // If transcript has segments (new format with timestamps)
    if (transcript.segments && transcript.segments.length > 0) {
      return (
        <div className="p-4 space-y-6">
          {transcript.segments.map((segment) => (
            <div key={segment.id} className="group">
              {/* Clickable Timestamp */}
              <button
                onClick={() => handleTimestampClick(segment.start)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline font-mono text-sm mb-2 transition-colors flex items-center gap-1"
                title="Click to jump to this moment"
              >
                <Clock className="w-3 h-3" />
                {formatTime(segment.start)}
              </button>

              {/* Segment Text */}
              <p className="text-foreground leading-relaxed">
                {segment.text}
              </p>
            </div>
          ))}
        </div>
      );
    }

    // Fallback to plain text if available
    if (transcript.text) {
      return (
        <div className="p-4 space-y-4">
          <div className="prose prose-sm max-w-none">
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">
              {transcript.text}
            </p>
          </div>
        </div>
      );
    }

    // No transcript data at all
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="text-muted-foreground/40 mb-3">
          <Clock className="w-12 h-12 mx-auto" />
        </div>
        <p className="text-muted-foreground text-center">No original content available</p>
      </div>
    );
  };

  return (
    <div className="min-h-full bg-background">
      {/* Metadata Bar */}
      {metadata && (metadata.duration || metadata.speakers) && (
        <div className="bg-muted border-b border-border px-4 py-3">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {metadata.duration && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{metadata.duration}</span>
              </div>
            )}
            {metadata.speakers && metadata.speakers.length > 0 && (
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span>{metadata.speakers.length} speaker{metadata.speakers.length > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Original Content */}
      <div className="max-w-4xl mx-auto">
        {renderTranscript()}
      </div>
    </div>
  );
}