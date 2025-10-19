import React from 'react';
import { FileText, AlignLeft, GitBranch } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SecondaryTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SECONDARY_TABS: SecondaryTab[] = [
  { id: 'transcript', label: 'Transcript', icon: FileText },
  { id: 'summary', label: 'Summary', icon: AlignLeft },
  { id: 'mindmap', label: 'Mind-map', icon: GitBranch },
];

interface SecondaryTabsProps {
  activeTabId: string;
  onTabChange: (tabId: string) => void;
}

export function SecondaryTabs({ activeTabId, onTabChange }: SecondaryTabsProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="w-full bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-center px-4 py-2">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide justify-center">
            {SECONDARY_TABS.map((tab) => {
              const isActive = activeTabId === tab.id;
              const IconComponent = tab.icon;
              const isSummaryTab = tab.id === 'summary';
              
              // Conditional rendering based on active state
              const tabButton = (
                <button
                  key={tab.id}
                  id={`secondary-tab-${tab.id}`}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`secondary-tabpanel-${tab.id}`}
                  aria-label={tab.label}
                  tabIndex={isActive ? 0 : -1}
                  className={`
                    relative flex items-center justify-center gap-2 rounded-full
                    transition-all duration-300 ease-out whitespace-nowrap
                    min-h-[44px] touch-manipulation
                    ${isActive 
                      ? isSummaryTab
                        ? 'bg-blue-600 text-white shadow-lg scale-105 px-5 py-2.5 min-w-fit'
                        : 'bg-gray-900 text-white shadow-md px-5 py-2.5 min-w-fit'
                      : 'bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-100 hover:shadow-sm border border-gray-200 px-3 py-2.5 w-[44px] hover:scale-105'
                    }
                  `}
                  onClick={() => onTabChange(tab.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onTabChange(tab.id);
                    }
                    // Arrow key navigation
                    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                      e.preventDefault();
                      const currentIndex = SECONDARY_TABS.findIndex(t => t.id === tab.id);
                      let newIndex = currentIndex;
                      
                      if (e.key === 'ArrowRight') {
                        newIndex = (currentIndex + 1) % SECONDARY_TABS.length;
                      } else {
                        newIndex = currentIndex === 0 ? SECONDARY_TABS.length - 1 : currentIndex - 1;
                      }
                      
                      onTabChange(SECONDARY_TABS[newIndex].id);
                    }
                  }}
                >
                  <IconComponent 
                    className={`
                      shrink-0 transition-all duration-300
                      ${isActive ? 'w-4 h-4' : 'w-5 h-5'}
                    `} 
                  />
                  {/* Conditionally render label with smooth animation */}
                  <span 
                    className={`
                      font-medium overflow-hidden transition-all duration-300 ease-out
                      ${isActive 
                        ? 'text-sm opacity-100 max-w-[150px] ml-0' 
                        : 'text-sm opacity-0 max-w-0 ml-0'
                      }
                    `}
                    style={{
                      width: isActive ? 'auto' : '0',
                    }}
                  >
                    {tab.label}
                  </span>
                  {isSummaryTab && isActive && (
                    <span className="text-xs ml-1 opacity-90 transition-all duration-300">▼</span>
                  )}
                </button>
              );
              
              // Wrap inactive tabs with tooltip
              if (!isActive) {
                return (
                  <Tooltip key={tab.id}>
                    <TooltipTrigger asChild>
                      {tabButton}
                    </TooltipTrigger>
                    <TooltipContent 
                      side="bottom" 
                      className="bg-gray-900 text-white text-xs px-2 py-1"
                    >
                      <p>{tab.label}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              }
              
              return tabButton;
            })}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}