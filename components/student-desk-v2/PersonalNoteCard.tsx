'use client';

import { useState, useEffect, useRef } from 'react';
import { Edit3, Save, X, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

interface PersonalNoteCardProps {
  jobId: string;
  contentType: 'explanation' | 'summary' | 'question' | 'overview' | 'general';
  contentId: string;
  initialNote?: string;
  placeholder?: string;
  onSave?: (note: string) => void;
}

/**
 * PersonalNoteCard - Collapsible component for student's personal notes
 * Features:
 * - Collapsible UI (expanded when note exists)
 * - Auto-save on blur
 * - Character counter
 * - Last saved indicator
 * - Markdown support (basic)
 */
export function PersonalNoteCard({
  jobId,
  contentType,
  contentId,
  initialNote = '',
  placeholder = 'Add your personal notes, understanding, or key takeaways...',
  onSave
}: PersonalNoteCardProps) {
  const [isExpanded, setIsExpanded] = useState(!!initialNote);
  const [noteContent, setNoteContent] = useState(initialNote);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(initialNote ? new Date() : null);
  const [hasChanges, setHasChanges] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current && isExpanded) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [noteContent, isExpanded]);

  // Handle content change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNoteContent(e.target.value);
    setHasChanges(true);

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Auto-save after 2 seconds of inactivity
    saveTimeoutRef.current = setTimeout(() => {
      handleSave(e.target.value);
    }, 2000);
  };

  // Save note to API
  const handleSave = async (content?: string) => {
    const contentToSave = content ?? noteContent;

    // Don't save if no changes
    if (!hasChanges && content === undefined) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/lectures/${jobId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content_type: contentType,
          content_id: contentId,
          note_content: contentToSave
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save note');
      }

      const data = await response.json();

      setLastSaved(new Date());
      setHasChanges(false);

      // Call optional callback
      if (onSave) {
        onSave(contentToSave);
      }

      // Show success toast (subtle)
      if (contentToSave.trim()) {
        toast.success('Note saved', { duration: 1500 });
      } else {
        toast.success('Note deleted', { duration: 1500 });
      }
    } catch (error) {
      console.error('Failed to save note:', error);
      toast.error('Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle blur (save when user leaves field)
  const handleBlur = () => {
    if (hasChanges) {
      handleSave();
    }
  };

  // Toggle expansion
  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    console.log('Toggle expand clicked, current state:', isExpanded);

    if (!isExpanded) {
      setIsExpanded(true);
      // Focus after animation (once textarea is rendered)
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    } else {
      setIsExpanded(false);
      // Save if there are unsaved changes
      if (hasChanges) {
        handleSave();
      }
    }
  };

  // Debug: Log component mount
  useEffect(() => {
    console.log('PersonalNoteCard mounted:', {
      jobId,
      contentType,
      contentId,
      hasInitialNote: !!initialNote
    });
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const hasNote = noteContent.trim().length > 0;
  const characterCount = noteContent.length;

  return (
    <div className="border-t border-gray-200 mt-4 pt-4">
      {/* Header - Always visible */}
      <button
        type="button"
        onClick={toggleExpand}
        className="flex items-center gap-2 w-full text-left hover:bg-gray-50 p-2 rounded transition-colors group cursor-pointer"
      >
        <div className={`flex items-center justify-center w-6 h-6 rounded ${
          hasNote ? 'bg-yellow-100' : 'bg-gray-100'
        } group-hover:bg-yellow-200 transition-colors`}>
          <Edit3 className={`w-3.5 h-3.5 ${
            hasNote ? 'text-yellow-700' : 'text-gray-500'
          }`} />
        </div>

        <span className={`flex-1 text-sm font-medium ${
          hasNote ? 'text-gray-900' : 'text-gray-500'
        }`}>
          {hasNote ? 'My Understanding' : 'Add your notes'}
        </span>

        {/* Note indicator */}
        {hasNote && !isExpanded && (
          <span className="text-xs text-gray-500 truncate max-w-[200px]">
            {noteContent.substring(0, 50)}...
          </span>
        )}

        {/* Last saved indicator */}
        {lastSaved && !isExpanded && (
          <span className="text-xs text-gray-400">
            Saved
          </span>
        )}

        {/* Expand/collapse icon */}
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-3 pl-8 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={noteContent}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            className="w-full min-h-[120px] p-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none bg-yellow-50/30"
            style={{ maxHeight: '400px' }}
          />

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-3">
              {/* Character count */}
              <span className={characterCount > 1000 ? 'text-amber-600' : ''}>
                {characterCount} characters
              </span>

              {/* Saving indicator */}
              {isSaving && (
                <span className="flex items-center gap-1 text-blue-600">
                  <span className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  Saving...
                </span>
              )}

              {/* Last saved */}
              {lastSaved && !isSaving && !hasChanges && (
                <span className="text-green-600">
                  ✓ Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}

              {/* Unsaved changes */}
              {hasChanges && !isSaving && (
                <span className="text-amber-600">
                  Unsaved changes
                </span>
              )}
            </div>

            {/* Manual save button */}
            {hasChanges && (
              <button
                onClick={() => handleSave()}
                disabled={isSaving}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Save className="w-3 h-3" />
                Save now
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
