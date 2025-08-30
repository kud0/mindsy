"use client"

import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

interface AudioStore {
  // Audio state
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Audio source
  currentLecture: {
    id: string;
    title: string;
    audioUrl: string;
  } | null;
  
  // Controls
  play: () => Promise<void>;
  pause: () => void;
  seekTo: (time: number) => void;
  loadLecture: (lecture: { id: string; title: string; audioUrl?: string }) => void;
  
  // Events
  onTimeUpdate: (callback: (time: number) => void) => void;
  removeTimeUpdateListener: (callback: (time: number) => void) => void;
}

const AudioContext = createContext<AudioStore | null>(null);

export const useAudio = (): AudioStore => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

interface AudioProviderProps {
  children: React.ReactNode;
}

export const AudioProvider: React.FC<AudioProviderProps> = ({ children }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLecture, setCurrentLecture] = useState<{
    id: string;
    title: string;
    audioUrl: string;
  } | null>(null);
  
  const timeUpdateCallbacks = useRef<Set<(time: number) => void>>(new Set());

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      const time = audio.currentTime;
      setCurrentTime(time);
      timeUpdateCallbacks.current.forEach(callback => callback(time));
    };

    const handleDurationChange = () => {
      setDuration(audio.duration || 0);
    };

    const handleCanPlay = () => {
      setIsLoaded(true);
      setIsLoading(false);
      setError(null);
    };

    const handleError = (e: Event) => {
      console.warn('Audio loading failed:', (e.target as HTMLAudioElement)?.src);
      setError('Audio not available');
      setIsLoading(false);
      setIsLoaded(false);
      // Don't retry on error to prevent infinite loops
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleLoadStart = () => {
      setIsLoading(true);
      setError(null);
    };

    // Event listeners
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('loadstart', handleLoadStart);

    // Media Session API for OS controls - only on client side
    if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('play', () => {
          audio.play().catch(console.error);
        });
        
        navigator.mediaSession.setActionHandler('pause', () => {
          audio.pause();
        });
        
        navigator.mediaSession.setActionHandler('seekbackward', () => {
          audio.currentTime = Math.max(0, audio.currentTime - 10);
        });
        
        navigator.mediaSession.setActionHandler('seekforward', () => {
          audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10);
        });
      } catch (error) {
        console.warn('Failed to set media session handlers:', error);
      }
    }

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.pause();
      audio.src = '';
    };
  }, []);

  const loadLecture = useCallback((lecture: { id: string; title: string; audioUrl?: string }) => {
    if (!audioRef.current) return;
    
    const audio = audioRef.current;
    setCurrentLecture({ ...lecture, audioUrl: lecture.audioUrl || '' });
    
    // Only attempt to load audio if URL is provided
    if (lecture.audioUrl && lecture.audioUrl.trim()) {
      setIsLoaded(false);
      setIsLoading(true);
      setError(null);
      
      audio.src = lecture.audioUrl;
      audio.load();

      // Update Media Session metadata - only on client side
      if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: lecture.title,
            artist: 'Mindsy',
            artwork: [
              { src: '/lecture.png', sizes: '512x512', type: 'image/png' }
            ]
          });
        } catch (error) {
          console.warn('Failed to set media session metadata:', error);
        }
      }
    } else {
      // No audio available
      setIsLoaded(false);
      setIsLoading(false);
      setError('No audio available for this lecture');
    }
  }, []);

  const play = useCallback(async (): Promise<void> => {
    if (!audioRef.current || !isLoaded) return;
    
    try {
      await audioRef.current.play();
    } catch (error) {
      console.error('Failed to play audio:', error);
      setError('Failed to play audio');
    }
  }, [isLoaded]);

  const pause = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
  }, []);

  const seekTo = useCallback((time: number) => {
    if (!audioRef.current || !isLoaded) return;
    
    const clampedTime = Math.max(0, Math.min(duration, time));
    audioRef.current.currentTime = clampedTime;
  }, [isLoaded, duration]);

  const onTimeUpdate = useCallback((callback: (time: number) => void) => {
    timeUpdateCallbacks.current.add(callback);
  }, []);

  const removeTimeUpdateListener = useCallback((callback: (time: number) => void) => {
    timeUpdateCallbacks.current.delete(callback);
  }, []);

  const store: AudioStore = {
    isPlaying,
    currentTime,
    duration,
    isLoaded,
    isLoading,
    error,
    currentLecture,
    play,
    pause,
    seekTo,
    loadLecture,
    onTimeUpdate,
    removeTimeUpdateListener,
  };

  return (
    <AudioContext.Provider value={store}>
      {children}
    </AudioContext.Provider>
  );
};