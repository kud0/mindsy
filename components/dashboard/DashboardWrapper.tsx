"use client"

import React from 'react';
import { MainSidebar } from './MainSidebar';
import { TopBar } from './TopBar';
import { Toaster } from 'sonner';

interface DashboardWrapperProps {
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    plan: 'free' | 'student';
  };
  folders?: Array<{
    id: string;
    name: string;
    count: number;
  }>;
  showSearch?: boolean;
  children: React.ReactNode;
}

export function DashboardWrapper({ 
  user, 
  folders, 
  showSearch = true,
  children 
}: DashboardWrapperProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  React.useEffect(() => {
    const handleToggle = () => {
      setSidebarOpen(prev => !prev);
    };

    window.addEventListener('toggle-sidebar', handleToggle);
    return () => window.removeEventListener('toggle-sidebar', handleToggle);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Desktop Sidebar */}
      <div 
        className={`hidden lg:block lg:fixed lg:inset-y-0 lg:w-64 transition-transform duration-300 ease-in-out z-40 ${
          sidebarOpen ? 'lg:translate-x-0' : 'lg:-translate-x-full'
        }`}
      >
        <MainSidebar 
          user={user} 
          folders={folders}
        />
      </div>

      {/* Main content area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
        sidebarOpen ? 'lg:ml-64' : 'lg:ml-0'
      }`}>
        {/* Top Bar */}
        <TopBar 
          user={user}
          showSearch={showSearch}
          showSidebarToggle={true}
        />
        
        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      
      {/* Sonner Toast Provider */}
      <Toaster position="bottom-right" richColors />
    </div>
  );
}