import React from 'react';
import { Eye, HelpCircle, BookOpen, FileText, Clock, FolderOpen } from 'lucide-react';

interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview', icon: Eye },
  { id: 'explanations', label: 'Explanations', icon: BookOpen },
  { id: 'summary', label: 'Summary', icon: FileText },
  { id: 'questions', label: 'Questions', icon: HelpCircle },
  { id: 'study-time', label: 'Study Time', icon: Clock },
  { id: 'materials', label: 'Materials', icon: FolderOpen },
];

interface TabNavigationProps {
  activeTabId: string;
  onTabChange: (tabId: string) => void;
}

export function TabNavigation({ activeTabId, onTabChange }: TabNavigationProps) {
  return (
    <nav className="flex bg-white">
      {TABS.map((tab) => {
        const isActive = activeTabId === tab.id;
        const IconComponent = tab.icon;
        
        return (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            className={`
              flex-1 flex flex-col items-center justify-center py-3 px-2 min-h-[48px]
              border-b-2 transition-colors duration-200
              ${isActive 
                ? 'border-gray-900 text-gray-900' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }
            `}
            onClick={() => onTabChange(tab.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onTabChange(tab.id);
              }
            }}
          >
            <IconComponent className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium sr-only">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}