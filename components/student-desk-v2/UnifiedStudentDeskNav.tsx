"use client"

import React from 'react';
import Link from 'next/link';
import { Home, FileText, BookOpen, GitBranch, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCommandBar } from '@/components/dashboard/DashboardWrapper';

interface SegmentedOption {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SEGMENTED_OPTIONS: SegmentedOption[] = [
  {
    id: 'transcript',
    label: 'Transcript',
    icon: FileText,
  },
  {
    id: 'summary',
    label: 'Study',
    icon: BookOpen,
  },
  {
    id: 'mindmap',
    label: 'Mind Map',
    icon: GitBranch,
  },
];

interface UnifiedStudentDeskNavProps {
  activeMode: 'transcript' | 'summary' | 'mindmap';
  onModeChange: (mode: string) => void;
  jobId: string;
}

export function UnifiedStudentDeskNav({
  activeMode,
  onModeChange,
  jobId
}: UnifiedStudentDeskNavProps) {
  const { openCommandBar } = useCommandBar();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-4 px-4 pointer-events-none">
      <div className="flex items-center justify-center gap-2 mx-auto max-w-md">
        {/* Home Button (Left) */}
        <Link
          href="/dashboard"
          className={cn(
            "relative bg-white/5 dark:bg-white/8 backdrop-blur-2xl backdrop-saturate-150 rounded-full shadow-lg dark:shadow-2xl dark:shadow-black/40 border border-border pointer-events-auto",
            "flex items-center justify-center w-14 h-14 transition-all duration-200",
            "hover:bg-accent/50 hover:scale-105 active:scale-95"
          )}
          aria-label="Go to dashboard"
        >
          <Home className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors duration-200 relative z-10" strokeWidth={1.5} />
        </Link>

        {/* Compact Segmented Control (Center) */}
        <div
          className={cn(
            "relative bg-white/5 dark:bg-white/8 backdrop-blur-2xl backdrop-saturate-150 rounded-full shadow-lg dark:shadow-2xl dark:shadow-black/40 border border-border pointer-events-auto",
            "px-1 py-1"
          )}
          role="tablist"
          aria-label="Content mode navigation"
        >
          <div className="flex items-center gap-0.5 relative z-10">
            {SEGMENTED_OPTIONS.map((option) => {
              const isActive = activeMode === option.id;
              const IconComponent = option.icon;

              return (
                <button
                  key={option.id}
                  id={`mode-${option.id}`}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`mode-panel-${option.id}`}
                  aria-label={option.label}
                  tabIndex={isActive ? 0 : -1}
                  className={cn(
                    "flex items-center justify-center",
                    "rounded-full transition-all duration-200",
                    "w-12 h-12",
                    "touch-manipulation active:scale-95",
                    isActive
                      ? "bg-accent text-primary shadow-sm"
                      : "bg-transparent text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                  onClick={() => onModeChange(option.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onModeChange(option.id);
                    }
                    // Arrow key navigation
                    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                      e.preventDefault();
                      const currentIndex = SEGMENTED_OPTIONS.findIndex(opt => opt.id === option.id);
                      let newIndex = currentIndex;

                      if (e.key === 'ArrowRight') {
                        newIndex = (currentIndex + 1) % SEGMENTED_OPTIONS.length;
                      } else {
                        newIndex = currentIndex === 0 ? SEGMENTED_OPTIONS.length - 1 : currentIndex - 1;
                      }

                      onModeChange(SEGMENTED_OPTIONS[newIndex].id);
                    }
                  }}
                >
                  <IconComponent
                    className="w-5 h-5 transition-colors duration-200"
                    strokeWidth={isActive ? 2.5 : 1.5}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Button (Right) */}
        <button
          onClick={openCommandBar}
          className={cn(
            "relative bg-white/5 dark:bg-white/8 backdrop-blur-2xl backdrop-saturate-150 rounded-full shadow-lg dark:shadow-2xl dark:shadow-black/40 border border-border pointer-events-auto",
            "flex items-center justify-center w-14 h-14 transition-all duration-200",
            "hover:bg-accent/50 hover:scale-105 active:scale-95"
          )}
          aria-label="Open search"
        >
          <Search className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors duration-200 relative z-10" strokeWidth={1.5} />
        </button>
      </div>
    </nav>
  );
}
