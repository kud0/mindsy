'use client';

import { useEffect, useState, useRef } from 'react';
import { Hand } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPortal } from 'react-dom';

interface MobileSelectionToolbarProps {
  onExplain: (selectedText: string) => void;
  isLoading?: boolean;
}

interface ToolbarPosition {
  top: number;
  left: number;
  visible: boolean;
}

/**
 * MobileSelectionToolbar - Shows floating toolbar when text is selected on mobile
 * Provides "Explain this" action for selected text without requiring right-click
 */
export function MobileSelectionToolbar({
  onExplain,
  isLoading = false
}: MobileSelectionToolbarProps) {
  const [selectedText, setSelectedText] = useState('');
  const [position, setPosition] = useState<ToolbarPosition>({
    top: 0,
    left: 0,
    visible: false
  });
  const toolbarRef = useRef<HTMLDivElement>(null);
  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle text selection
  useEffect(() => {
    const handleSelectionChange = () => {
      // Clear any pending timeout
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }

      // Debounce selection change to avoid too many updates
      selectionTimeoutRef.current = setTimeout(() => {
        const selection = window.getSelection();
        const text = selection?.toString().trim() || '';

        // Hide toolbar if no text selected
        if (!text || text.length === 0) {
          setPosition(prev => ({ ...prev, visible: false }));
          setSelectedText('');
          return;
        }

        // Only show on mobile (check window width)
        // We check at selection time rather than mount to handle resize
        if (window.innerWidth >= 768) {
          return; // Let desktop context menu handle it
        }

        // Get selection position
        const range = selection?.getRangeAt(0);
        if (!range) return;

        const rect = range.getBoundingClientRect();

        // Calculate toolbar position
        const toolbarHeight = 48; // Approximate toolbar height
        const padding = 8;
        const viewportHeight = window.innerHeight;

        // Decide whether to show above or below selection
        const spaceAbove = rect.top;
        const spaceBelow = viewportHeight - rect.bottom;
        const showAbove = spaceAbove > toolbarHeight + padding || spaceBelow < toolbarHeight + padding;

        // Calculate centered horizontal position
        const selectionCenter = rect.left + (rect.width / 2);
        const toolbarWidth = 160; // Approximate toolbar width
        let leftPosition = selectionCenter - (toolbarWidth / 2);

        // Keep toolbar within viewport bounds
        const viewportWidth = window.innerWidth;
        const minLeft = padding;
        const maxLeft = viewportWidth - toolbarWidth - padding;
        leftPosition = Math.max(minLeft, Math.min(maxLeft, leftPosition));

        // Set position (add scroll offset)
        const topPosition = showAbove
          ? rect.top + window.scrollY - toolbarHeight - padding
          : rect.bottom + window.scrollY + padding;

        setSelectedText(text);
        setPosition({
          top: topPosition,
          left: leftPosition,
          visible: true
        });
      }, 100);
    };

    // Listen for selection changes
    document.addEventListener('selectionchange', handleSelectionChange);

    // Also handle touch events for better mobile UX
    const handleTouchEnd = () => {
      // Small delay to let selection settle
      setTimeout(handleSelectionChange, 150);
    };
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('touchend', handleTouchEnd);
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
    };
  }, []);

  // Handle explain button click
  const handleExplainClick = () => {
    if (selectedText && selectedText.length > 0) {
      onExplain(selectedText);

      // Clear selection and hide toolbar
      window.getSelection()?.removeAllRanges();
      setPosition(prev => ({ ...prev, visible: false }));
      setSelectedText('');
    }
  };

  // Don't render anything if not visible or on desktop
  if (!position.visible || typeof window === 'undefined') {
    return null;
  }

  // Render toolbar using portal to avoid z-index issues
  return createPortal(
    <div
      ref={toolbarRef}
      className="fixed z-[200] animate-in fade-in slide-in-from-bottom-2 duration-200 md:hidden"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2 flex items-center gap-2">
        {/* Selected text preview (truncated) */}
        <span className="text-xs text-gray-500 max-w-[80px] truncate hidden sm:inline">
          "{selectedText.substring(0, 20)}..."
        </span>

        {/* Explain button */}
        <Button
          onClick={handleExplainClick}
          disabled={isLoading}
          size="sm"
          className="h-8 px-3 gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm active:scale-95 transition-transform"
        >
          {isLoading ? (
            <>
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium">...</span>
            </>
          ) : (
            <>
              <Hand className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Explain</span>
            </>
          )}
        </Button>
      </div>
    </div>,
    document.body
  );
}
