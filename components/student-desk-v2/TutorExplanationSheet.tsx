'use client';

import { useEffect } from 'react';
import { X, Quote, Clock, Hand, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

interface TutorExplanationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: string;
  explanation: string;
  createdAt?: string;
  isLoading?: boolean;
  onBackToHistory?: () => void; // Show "Back to History" button if provided
}

/**
 * TutorExplanationSheet - Bottom sheet displaying AI tutor explanations
 * Slides up from bottom with the explanation for selected text
 */
export function TutorExplanationSheet({
  isOpen,
  onClose,
  selectedText,
  explanation,
  createdAt,
  isLoading = false,
  onBackToHistory
}: TutorExplanationSheetProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when sheet is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - Above everything */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer - Mobile: Bottom sheet, Desktop: Right sidebar */}
      <div
        className="fixed z-[100] bg-white shadow-2xl flex flex-col animate-in
                   bottom-0 left-0 right-0 rounded-t-3xl max-h-[90vh]
                   md:top-0 md:right-0 md:bottom-0 md:left-auto md:w-[500px] md:rounded-none md:max-h-none
                   slide-in-from-bottom md:slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
          {/* Back to History button (if from history) */}
          {onBackToHistory ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBackToHistory}
              className="h-9 w-9 rounded-full hover:bg-gray-100 -ml-2"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Button>
          ) : (
            /* Drag handle (mobile only, when not from history) */
            <div className="flex-1 flex justify-center md:hidden -ml-2">
              <button
                onClick={onClose}
                className="w-12 h-1.5 bg-gray-300 rounded-full hover:bg-gray-400 transition-colors active:scale-95"
                aria-label="Close"
              />
            </div>
          )}

          {/* Title */}
          <div className="flex items-center gap-2 flex-1">
            <Hand className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-lg">
              {onBackToHistory ? 'AI Tutor' : 'AI Tutor'}
            </h3>
          </div>

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 rounded-full hover:bg-gray-100 -mr-2"
          >
            <X className="h-5 w-5 text-gray-600" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Selected Text Quote */}
          <div className="p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
            <div className="flex items-start gap-2">
              <Quote className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-blue-700 mb-1">YOU ASKED ABOUT:</div>
                <p className="text-sm text-gray-700 italic leading-relaxed">
                  "{selectedText}"
                </p>
              </div>
            </div>
          </div>

          {/* AI Explanation */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
              <p className="text-muted-foreground">AI is thinking...</p>
              <p className="text-xs text-muted-foreground mt-1">This may take a few seconds</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900">Explanation</h4>
                {createdAt && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
                  </div>
                )}
              </div>

              <div className="prose prose-sm max-w-none">
                {explanation.split('\n').map((paragraph, index) => (
                  paragraph.trim() && (
                    <p key={index} className="text-gray-700 leading-relaxed mb-3">
                      {paragraph}
                    </p>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Help Text */}
          {!isLoading && (
            <div className="p-3 bg-gray-50 border rounded-lg text-xs text-gray-600">
              <p className="font-medium mb-1">💡 Tip:</p>
              <p>Select any text and right-click to ask more questions!</p>
            </div>
          )}
        </div>

        {/* Footer - Mobile only (desktop has X button) */}
        <div className="px-4 py-4 border-t bg-white shrink-0 safe-area-bottom md:hidden">
          <Button
            onClick={onClose}
            className="w-full h-12 text-base font-medium"
            variant="default"
          >
            Close
          </Button>
        </div>
      </div>
    </>
  );
}
