'use client';

import { useState } from 'react';
import { Hand, Loader2 } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { MobileSelectionToolbar } from './MobileSelectionToolbar';

interface TutorContextMenuProps {
  children: React.ReactNode;
  onExplain: (selectedText: string) => void;
  isLoading?: boolean;
}

/**
 * TutorContextMenu - Wrap any content to enable "Raise Your Hand" AI tutor
 * Desktop: Select text → right-click → "Explain this" to get AI help
 * Mobile: Select text → tap floating "Explain" button to get AI help
 */
export function TutorContextMenu({
  children,
  onExplain,
  isLoading = false
}: TutorContextMenuProps) {
  const [selectedText, setSelectedText] = useState('');

  // Capture selected text when context menu is opened
  const handleContextMenu = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim() || '';
    setSelectedText(text);
  };

  // Handle "Explain this" click
  const handleExplainClick = () => {
    if (selectedText && selectedText.length > 0) {
      onExplain(selectedText);
    }
  };

  return (
    <>
      {/* Desktop: Right-click context menu */}
      <ContextMenu>
        <ContextMenuTrigger
          asChild
          onContextMenu={handleContextMenu}
        >
          {children}
        </ContextMenuTrigger>

        <ContextMenuContent className="w-64 hidden md:block">
          {selectedText && selectedText.length > 0 ? (
            <>
              {/* Show selected text preview */}
              <div className="px-2 py-1.5 text-xs text-muted-foreground border-b">
                Selected: "{selectedText.substring(0, 50)}{selectedText.length > 50 ? '...' : ''}"
              </div>

              {/* Explain this option */}
              <ContextMenuItem
                onClick={handleExplainClick}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Hand className="w-4 h-4" />
                )}
                <span className="font-medium">
                  {isLoading ? 'Generating explanation...' : 'Explain this'}
                </span>
              </ContextMenuItem>

              {/* Hint about the feature */}
              <div className="px-2 py-1.5 text-xs text-muted-foreground border-t mt-1">
                Get AI help to understand concepts
              </div>
            </>
          ) : (
            <>
              {/* No selection */}
              <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                <Hand className="w-5 h-5 mx-auto mb-1 opacity-50" />
                <p className="font-medium">Need help?</p>
                <p className="text-xs mt-0.5">Select text and right-click to ask</p>
              </div>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {/* Mobile: Floating selection toolbar */}
      <MobileSelectionToolbar
        onExplain={onExplain}
        isLoading={isLoading}
      />
    </>
  );
}
