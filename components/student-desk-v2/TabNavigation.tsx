import React from 'react';
import Image from 'next/image';

interface Tab {
  id: string;
  label: string;
  iconPath: string;
}

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview', iconPath: '/images/file.png' },
  { id: 'explanations', label: 'Explanations', iconPath: '/images/document.png' },
  { id: 'summary', label: 'Summary', iconPath: '/images/assistant.png' },
  { id: 'questions', label: 'Questions', iconPath: '/images/quiz.png' },
  { id: 'study-time', label: 'Study Time', iconPath: '/images/work-in-progress.png' },
  { id: 'materials', label: 'Materials', iconPath: '/images/attached-file.png' },
];

interface TabNavigationProps {
  activeTabId: string;
  onTabChange: (tabId: string) => void;
}

export function TabNavigation({ activeTabId, onTabChange }: TabNavigationProps) {
  return (
    <nav className="flex bg-white/5 dark:bg-white/8 backdrop-blur-2xl backdrop-saturate-150 border-b border-border">
      {TABS.map((tab) => {
        const isActive = activeTabId === tab.id;

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
              rounded-lg transition-all duration-200
              ${isActive
                ? 'bg-accent text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
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
            <Image
              src={tab.iconPath}
              alt={tab.label}
              width={28}
              height={28}
              className="w-7 h-7 mb-1.5"
            />
            <span className="text-xs font-medium sr-only">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}