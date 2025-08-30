"use client"

import React from 'react';
import { BottomNavbar } from '../navigation/BottomNavbar';
import { Toaster } from 'sonner';

export function DashboardWrapper({ 
  children 
}: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background">
      {/* Main content area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNavbar />
      
      {/* Sonner Toast Provider */}
      <Toaster position="bottom-right" richColors />
    </div>
  );
}