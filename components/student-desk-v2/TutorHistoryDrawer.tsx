'use client';

import { X, Hand, Clock, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';

interface TutorQuestion {
  id: string;
  tab_name: string;
  selected_text: string;
  ai_explanation: string;
  created_at: string;
}

interface TutorHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  questions: TutorQuestion[];
  onSelectQuestion: (question: TutorQuestion) => void;
  isLoading?: boolean;
}

/**
 * TutorHistoryDrawer - Shows history of all tutor questions for this lecture
 * Slides in from the right side
 */
export function TutorHistoryDrawer({
  isOpen,
  onClose,
  questions,
  onSelectQuestion,
  isLoading = false
}: TutorHistoryDrawerProps) {
  if (!isOpen) return null;

  // Get tab display name
  const getTabDisplayName = (tabName: string): string => {
    const names: Record<string, string> = {
      'overview': 'Overview',
      'explanations': 'Explanations',
      'summary': 'Summary',
      'transcript': 'Original'
    };
    return names[tabName] || tabName;
  };

  return (
    <>
      {/* Backdrop - Above everything */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer - Mobile: Full width bottom sheet, Desktop: Right sidebar */}
      <div
        className="fixed z-[100] bg-white shadow-2xl flex flex-col animate-in
                   bottom-0 left-0 right-0 rounded-t-3xl max-h-[90vh]
                   md:top-0 md:right-0 md:bottom-0 md:left-auto md:w-[500px] md:rounded-none md:max-h-none
                   slide-in-from-bottom md:slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile: Drag handle + Desktop: Close button */}
        <div className="flex justify-between items-center px-4 py-3 border-b shrink-0">
          {/* Drag handle (mobile only) */}
          <div className="flex-1 flex justify-center md:hidden">
            <button
              onClick={onClose}
              className="w-12 h-1.5 bg-gray-300 rounded-full hover:bg-gray-400 transition-colors active:scale-95"
              aria-label="Close"
            />
          </div>

          {/* Title and close button */}
          <div className="flex items-center gap-2 flex-1 md:flex-initial">
            <Hand className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-lg">History</h3>
          </div>

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
        <ScrollArea className="flex-1 p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3" />
              <p className="text-sm text-muted-foreground">Loading history...</p>
            </div>
          ) : questions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-600 font-medium mb-1">No questions yet</p>
              <p className="text-sm text-gray-500">
                Select text and right-click to ask your first question
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((question) => (
                <button
                  key={question.id}
                  onClick={() => onSelectQuestion(question)}
                  className="w-full text-left p-4 border rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-200 group"
                >
                  {/* Tab badge */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                      {getTabDisplayName(question.tab_name)}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}
                    </div>
                  </div>

                  {/* Question preview */}
                  <p className="text-sm font-medium text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-700">
                    "{question.selected_text}"
                  </p>

                  {/* Explanation preview */}
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {question.ai_explanation.substring(0, 150)}...
                  </p>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="px-4 py-3 border-t bg-gray-50 shrink-0 safe-area-bottom">
          <div className="text-center text-xs text-gray-600">
            {questions.length > 0 ? (
              <span>{questions.length} question{questions.length !== 1 ? 's' : ''} • Tap to view</span>
            ) : (
              <span>Select text and right-click to ask</span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
