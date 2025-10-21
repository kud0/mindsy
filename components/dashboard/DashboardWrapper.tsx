"use client"

// ========================================
// Dashboard Layout Wrapper
// ========================================
// This wrapper provides context and navigation for ALL dashboard pages
// It wraps children from app/dashboard/layout.tsx
// IMPORTANT: Keep this wrapper TRANSPARENT (no bg-* classes)
// so that child pages can set their own backgrounds
// ========================================

import React, { createContext, useContext, useState } from 'react';
import { usePathname } from 'next/navigation';
import { BottomNavbar } from '../navigation/BottomNavbar';
import { CommandBar } from '../command-bar/CommandBar';
import { Toaster } from 'sonner';

interface ScrollContextType {
  isScrolled: boolean;
  setIsScrolled: (value: boolean) => void;
}

interface CommandBarContextType {
  openCommandBar: () => void;
}

const ScrollContext = createContext<ScrollContextType>({
  isScrolled: false,
  setIsScrolled: () => {}
});

const CommandBarContext = createContext<CommandBarContextType>({
  openCommandBar: () => {}
});

export const useScroll = () => useContext(ScrollContext);
export const useCommandBar = () => useContext(CommandBarContext);

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  plan: 'free' | 'pro';
}

export function DashboardWrapper({
  children,
  user
}: {
  children: React.ReactNode;
  user: User;
}) {
  const pathname = usePathname();
  // Check if we're on a lecture detail page (student desk)
  // Pattern: /dashboard/lectures/[jobId] (but not /dashboard/lectures itself)
  const isStudentDesk = pathname?.startsWith('/dashboard/lectures/') && pathname !== '/dashboard/lectures';
  const [isScrolled, setIsScrolled] = useState(false);
  const [commandBarOpen, setCommandBarOpen] = useState(false);

  const openCommandBar = () => {
    setCommandBarOpen(true);
  };

  return (
    <ScrollContext.Provider value={{ isScrolled, setIsScrolled }}>
      <CommandBarContext.Provider value={{ openCommandBar }}>
        <div className="flex h-screen relative">
          {/* Subtle gradient background for glassmorphism effects */}
          <div className="fixed inset-0 -z-10 bg-gradient-to-br from-purple-900/15 via-blue-900/15 to-pink-900/15 dark:from-purple-500/8 dark:via-blue-500/8 dark:to-pink-500/8" />

          {/* Main content area */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden pb-24 md:pb-0">
            {children}
          </main>

          {/* Mobile Bottom Navigation - Hidden on student desk */}
          {!isStudentDesk && <BottomNavbar isScrolled={false} />}

          {/* Command Bar (Cmd+K search) */}
          <CommandBar isOpen={commandBarOpen} onOpenChange={setCommandBarOpen} />

          {/* Sonner Toast Provider */}
          <Toaster position="bottom-right" richColors />
        </div>
      </CommandBarContext.Provider>
    </ScrollContext.Provider>
  );
}