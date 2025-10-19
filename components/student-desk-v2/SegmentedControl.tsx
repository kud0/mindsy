import React from 'react';
import { FileText, BookOpen, GitBranch } from 'lucide-react';

interface SegmentedOption {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const SEGMENTED_OPTIONS: SegmentedOption[] = [
  {
    id: 'transcript',
    label: 'Original',
    icon: FileText,
    description: 'View original lecture content with timestamps'
  },
  {
    id: 'summary',
    label: 'Study Materials',
    icon: BookOpen,
    description: 'Access organized study content and materials'
  },
  {
    id: 'mindmap',
    label: 'Mind Map',
    icon: GitBranch,
    description: 'Visual representation of key concepts'
  },
];

interface SegmentedControlProps {
  activeOptionId: string;
  onOptionChange: (optionId: string) => void;
  isScrolled?: boolean;
}

export function SegmentedControl({ activeOptionId, onOptionChange, isScrolled = false }: SegmentedControlProps) {
  return (
    <div className={`fixed left-0 right-0 px-4 pointer-events-none transition-all duration-300 ${isScrolled ? 'bottom-4 z-40' : 'bottom-20 z-[60]'}`}>
      <div className={`mx-auto pointer-events-auto transition-all duration-300 ${isScrolled ? 'max-w-[184px]' : 'max-w-md'}`}>
        <div
          className={`bg-white/80 backdrop-blur-xl rounded-full shadow-lg border border-gray-200/50 flex gap-1 ${isScrolled ? 'px-1 py-2' : 'p-1'}`}
          role="tablist"
          aria-label="Content navigation"
        >
          {SEGMENTED_OPTIONS.map((option) => {
            const isActive = activeOptionId === option.id;
            const IconComponent = option.icon;

            return (
              <button
                key={option.id}
                id={`segmented-${option.id}`}
                role="tab"
                aria-selected={isActive}
                aria-controls={`segmented-panel-${option.id}`}
                aria-label={`${option.label}: ${option.description}`}
                tabIndex={isActive ? 0 : -1}
                className={`
                  relative flex flex-col items-center justify-center
                  rounded-full transition-all duration-200
                  flex-1 text-xs font-medium
                  touch-manipulation active:scale-95
                  ${isActive
                    ? 'bg-gray-100 text-blue-600 shadow-sm'
                    : 'bg-transparent text-gray-600 hover:bg-gray-100/50'
                  }
                  ${isScrolled ? 'py-1.5 px-1' : 'py-2 px-2'}
                `}
                onClick={() => onOptionChange(option.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOptionChange(option.id);
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

                    onOptionChange(SEGMENTED_OPTIONS[newIndex].id);
                  }
                }}
              >
                <IconComponent
                  className={`transition-colors duration-200 ${isScrolled ? 'w-5 h-5' : 'w-5 h-5 mb-0.5'}`}
                />
                {!isScrolled && (
                  <span className="font-medium leading-tight text-center text-[9px]">
                    {option.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}