import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { X, MessageSquare, Palette, Trash2, Edit } from 'lucide-react';
import { HIGHLIGHT_COLORS, type HighlightColor, type Highlight } from '@/types/highlights';
import { cn } from '@/lib/utils';

interface HighlightToolbarProps {
  isVisible: boolean;
  position: { x: number; y: number };
  selectedText?: string;
  existingHighlight?: Highlight | null; // For editing existing highlights
  onHighlight?: (color: HighlightColor, note?: string) => void;
  onUpdate?: (color: HighlightColor, note?: string) => void;
  onDelete?: () => void;
  onCancel: () => void;
  className?: string;
}

export function HighlightToolbar({
  isVisible,
  position,
  selectedText,
  existingHighlight,
  onHighlight,
  onUpdate,
  onDelete,
  onCancel,
  className
}: HighlightToolbarProps) {
  const [selectedColor, setSelectedColor] = useState<HighlightColor>(existingHighlight?.color || 'yellow');
  const [note, setNote] = useState(existingHighlight?.note || '');
  const [showNoteInput, setShowNoteInput] = useState(!!existingHighlight?.note);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const isEditMode = !!existingHighlight;
  const displayText = selectedText || existingHighlight?.selected_text || '';
  
  // Only show toolbar if we have something to display
  if (!displayText) return null;

  if (!isVisible) return null;

  const handleAction = () => {
    const finalNote = note.trim() || undefined;
    
    if (isEditMode && onUpdate) {
      onUpdate(selectedColor, finalNote);
    } else if (onHighlight) {
      onHighlight(selectedColor, finalNote);
    }
    
    resetState();
  };
  
  const handleDelete = () => {
    if (onDelete) {
      onDelete();
    }
    resetState();
  };
  
  const resetState = () => {
    setNote('');
    setShowNoteInput(false);
    setShowDeleteConfirm(false);
  };

  const handleCancel = () => {
    resetState();
    onCancel();
  };
  
  // Update state when existingHighlight changes
  useEffect(() => {
    if (existingHighlight) {
      setSelectedColor(existingHighlight.color);
      setNote(existingHighlight.note || '');
      setShowNoteInput(!!existingHighlight.note);
    }
  }, [existingHighlight]);

  return (
    <div
      className={cn(
        "fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 min-w-72",
        className
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translateY(-100%)'
      }}
    >
      {/* Header with mode indicator */}
      <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
        <div className="flex items-center gap-2 mb-1">
          {isEditMode ? (
            <><Edit className="w-3 h-3" /><span className="text-gray-600 dark:text-gray-300 text-xs font-medium">Edit Highlight</span></>
          ) : (
            <><Palette className="w-3 h-3" /><span className="text-gray-600 dark:text-gray-300 text-xs font-medium">New Highlight</span></>
          )}
        </div>
        <div className="font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
          "{displayText.length > 100 ? displayText.substring(0, 100) + '...' : displayText}"
        </div>
      </div>

      {/* Color picker */}
      <div className="mb-3">
        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
          Highlight Color:
        </div>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(HIGHLIGHT_COLORS).map(([color, config]) => (
            <button
              key={color}
              onClick={() => setSelectedColor(color as HighlightColor)}
              className={cn(
                "w-8 h-8 rounded-full border-2 transition-all",
                selectedColor === color 
                  ? "border-gray-900 dark:border-gray-100 scale-110" 
                  : "border-gray-300 dark:border-gray-600 hover:scale-105"
              )}
              style={{ backgroundColor: config.border }}
              title={config.name}
            />
          ))}
        </div>
      </div>

      {/* Note input toggle/input */}
      {!showNoteInput ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowNoteInput(true)}
          className="mb-3 w-full justify-start text-gray-600 dark:text-gray-300"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Add note (optional)
        </Button>
      ) : (
        <div className="mb-3">
          <Textarea
            placeholder="Add a note about this highlight..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="text-sm"
            rows={2}
            autoFocus
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 justify-between">
        {/* Delete button for edit mode */}
        {isEditMode && (
          <div className="flex gap-1">
            {!showDeleteConfirm ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                title="Delete highlight (DEL key)"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-gray-600 dark:text-gray-300 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Confirm Delete
                </Button>
              </>
            )}
          </div>
        )}
        
        {/* Main action buttons */}
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="text-gray-600 dark:text-gray-300"
            title="Cancel (ESC)"
          >
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleAction}
            style={{ 
              backgroundColor: HIGHLIGHT_COLORS[selectedColor].border,
              color: selectedColor === 'yellow' ? '#000' : '#fff'
            }}
          >
            {isEditMode ? (
              <><Edit className="w-4 h-4 mr-1" />Update</>
            ) : (
              <><Palette className="w-4 h-4 mr-1" />Highlight</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}