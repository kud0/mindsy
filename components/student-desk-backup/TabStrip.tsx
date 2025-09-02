"use client"

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Tab {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface TabStripProps {
  tabs: Tab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
}

export const TabStrip: React.FC<TabStripProps> = ({ tabs, activeTabId, onTabChange }) => {
  return (
    <div className="sticky top-14 z-30 bg-white">
      <div 
        role="tablist" 
        className="flex overflow-x-auto scrollbar-hide"
        aria-label="Lecture content tabs"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const Icon = tab.icon;
          
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              aria-label={tab.label}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex-1 min-w-0 p-3 flex items-center justify-center",
                "min-h-[48px]",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:z-10",
                isActive 
                  ? "text-blue-600 bg-blue-50" 
                  : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              )}
              style={{
                borderBottom: isActive ? '2px solid #2563eb' : '2px solid transparent'
              }}
            >
              <Icon className="w-5 h-5" />
            </button>
          );
        })}
      </div>
      <div className="h-px bg-gray-200"></div>
    </div>
  );
};