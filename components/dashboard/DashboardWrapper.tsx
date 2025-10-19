"use client"

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

export function DashboardWrapper({
  children
}: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Check if we're on a lecture detail page (student desk)
  const isStudentDesk = pathname?.startsWith('/dashboard/lectures/') && pathname !== '/dashboard/lectures';
  const [isScrolled, setIsScrolled] = useState(false);
  const [commandBarOpen, setCommandBarOpen] = useState(false);

  console.log('DashboardWrapper - pathname:', pathname, 'isStudentDesk:', isStudentDesk, 'isScrolled:', isScrolled);

  const openCommandBar = () => {
    setCommandBarOpen(true);
  };

  return (
    <ScrollContext.Provider value={{ isScrolled, setIsScrolled }}>
      <CommandBarContext.Provider value={{ openCommandBar }}>
        <div className="flex h-screen bg-background">
          {/* Main content area */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            {children}
          </main>

          {/* Mobile Bottom Navigation */}
          <BottomNavbar isScrolled={isStudentDesk ? isScrolled : false} />

          {/* Command Bar (Cmd+K search) */}
          <CommandBar isOpen={commandBarOpen} onOpenChange={setCommandBarOpen} />

          {/* Sonner Toast Provider */}
          <Toaster position="bottom-right" richColors />
        </div>
      </CommandBarContext.Provider>
    </ScrollContext.Provider>
  );
}