"use client"

import React from 'react';
import Link from 'next/link';
import { Home, FileText, BookOpen, Share2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCommandBar } from '@/components/dashboard/DashboardWrapper';

interface StudentDeskNavigationProps {
  jobId: string;
}

export function StudentDeskNavigation({ jobId }: StudentDeskNavigationProps) {
  const { openCommandBar } = useCommandBar();

  return (
    <nav className="student-desk-nav fixed bottom-0 left-0 right-0 z-50 pb-4 px-4 pointer-events-none">
      <div className="flex items-center justify-center gap-2 mx-auto max-w-md">
        {/* Home button */}
        <Link
          href="/dashboard"
          className={cn(
            "relative bg-white/70 dark:bg-black/30 backdrop-blur-2xl rounded-full shadow-xl border border-white/40 dark:border-white/10 pointer-events-auto",
            "flex items-center justify-center w-14 h-14 transition-all duration-200",
            "hover:bg-white/80 dark:hover:bg-black/40 hover:scale-105 hover:shadow-2xl active:scale-95",
            "before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-b before:from-white/20 before:to-transparent before:pointer-events-none"
          )}
        >
          <Home className="w-5 h-5 text-muted-foreground transition-colors duration-200 relative z-10" strokeWidth={1.5} />
        </Link>

        {/* Middle items - combined glass bubble */}
        <div className={cn(
          "relative bg-white/70 dark:bg-black/30 backdrop-blur-2xl rounded-full shadow-xl border border-white/40 dark:border-white/10 pointer-events-auto px-1 py-1",
          "before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-b before:from-white/20 before:to-transparent before:pointer-events-none"
        )}>
          <div className="flex items-center gap-0.5 relative z-10">
            {/* Lectures */}
            <Link
              href="/dashboard/lectures"
              className="flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 hover:bg-white/30 dark:hover:bg-white/10 active:scale-95"
            >
              <FileText className="w-5 h-5 text-muted-foreground transition-colors duration-200" strokeWidth={1.5} />
            </Link>

            {/* Notes/Study */}
            <button
              className="flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 hover:bg-white/30 dark:hover:bg-white/10 active:scale-95 bg-primary/20"
            >
              <BookOpen className="w-5 h-5 text-primary transition-colors duration-200" strokeWidth={2.5} />
            </button>

            {/* Share */}
            <button
              className="flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 hover:bg-white/30 dark:hover:bg-white/10 active:scale-95"
            >
              <Share2 className="w-5 h-5 text-muted-foreground transition-colors duration-200" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Search button */}
        <button
          onClick={openCommandBar}
          className={cn(
            "relative bg-white/70 dark:bg-black/30 backdrop-blur-2xl rounded-full shadow-xl border border-white/40 dark:border-white/10 pointer-events-auto",
            "flex items-center justify-center w-14 h-14 transition-all duration-200",
            "hover:bg-white/80 dark:hover:bg-black/40 hover:scale-105 hover:shadow-2xl active:scale-95",
            "before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-b before:from-white/20 before:to-transparent before:pointer-events-none"
          )}
          aria-label="Open search"
        >
          <Search className="w-5 h-5 text-muted-foreground transition-colors duration-200 relative z-10" strokeWidth={1.5} />
        </button>
      </div>
    </nav>
  );
}
