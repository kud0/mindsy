import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Link } from '@tiptap/extension-link';
import { Placeholder } from '@tiptap/extension-placeholder';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { Typography } from '@tiptap/extension-typography';
import { createLowlight } from 'lowlight';
import { Markdown } from 'tiptap-markdown';
import { Button } from '@/components/ui/button';
import { 
  X, 
  Save, 
  Bold, 
  Italic, 
  Strikethrough, 
  Code,
  List,
  ListOrdered,
  CheckSquare,
  Table as TableIcon,
  Link as LinkIcon,
  Quote,
  Minus,
  Undo,
  Redo,
  Loader2,
  Check,
  FileText,
  Edit,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import '@/styles/tiptap.css';

// Create lowlight instance
const lowlight = createLowlight();

interface MarkdownEditorProps {
  jobId: string;
  title: string;
  onClose: () => void;
  onViewModeChange?: () => void;
}

export function MarkdownEditor({ jobId, title, onClose, onViewModeChange }: MarkdownEditorProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedRecently, setSavedRecently] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regeneratingPdf, setRegeneratingPdf] = useState(false);
  const [pdfRegenerated, setPdfRegenerated] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContent = useRef<string>('');

  // Validate jobId
  if (!jobId) {
    console.error('MarkdownEditor: jobId is required');
    return (
      <div className="flex flex-col h-full bg-background animate-in fade-in slide-in-from-bottom-4 duration-300 overflow-hidden">
        <div className="flex items-center justify-between p-2 sm:p-4 border-b bg-background flex-shrink-0">
          <h2 className="font-semibold text-xs sm:text-sm">Error</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-destructive">Invalid note ID</p>
        </div>
      </div>
    );
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // We use CodeBlockLowlight instead
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      // Link is already included in StarterKit, so we don't add it separately
      Placeholder.configure({
        placeholder: 'Start writing...',
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Typography,
      Markdown.configure({
        html: true,
        tightLists: true,
        bulletListMarker: '-',
        linkify: true,
        breaks: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[400px] px-8 py-4',
      },
    },
    onUpdate: ({ editor }) => {
      // Auto-save with debouncing
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        const markdown = editor.storage.markdown.getMarkdown();
        if (markdown !== lastSavedContent.current) {
          saveContent(markdown);
        }
      }, 2000); // Auto-save after 2 seconds of inactivity
    },
  });


  // Set markdown content in editor
  const setMarkdownContent = (markdown: string) => {
    if (editor) {
      // The Markdown extension handles parsing markdown directly
      editor.commands.setContent(markdown);
    }
  };

  // Fetch markdown content
  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/download/${jobId}?format=md&inline=true`);
        
        if (!response.ok) {
          throw new Error('Failed to load markdown content');
        }
        
        const text = await response.text();
        setContent(text);
        lastSavedContent.current = text;
        
        if (editor) {
          setMarkdownContent(text);
        }
      } catch (err) {
        console.error('Error loading markdown:', err);
        setError('Failed to load content. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchContent();
  }, [jobId, editor]);

  // Save content
  const saveContent = useCallback(async (markdown: string) => {
    // Don't save if jobId is missing
    if (!jobId) {
      console.error('Cannot save: jobId is missing');
      return;
    }
    
    try {
      setSaving(true);
      
      // Save to the proper content endpoint
      const response = await fetch(`/api/notes/${jobId}/content`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: markdown, format: 'md' }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save content');
      }
      
      lastSavedContent.current = markdown;
      setSavedRecently(true);
      setTimeout(() => setSavedRecently(false), 2000);
    } catch (err) {
      console.error('Error saving:', err);
      setError('Failed to save. Changes may be lost.');
    } finally {
      setSaving(false);
    }
  }, [jobId]);

  // Manual save
  const handleManualSave = () => {
    if (editor) {
      const markdown = editor.storage.markdown.getMarkdown();
      saveContent(markdown);
    }
  };

  // Regenerate PDF from current markdown
  const regeneratePdf = async () => {
    if (!editor || regeneratingPdf) return;
    
    try {
      setRegeneratingPdf(true);
      setPdfRegenerated(false);
      
      const markdown = editor.storage.markdown.getMarkdown();
      
      const response = await fetch(`/api/notes/${jobId}/regenerate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ markdown }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to regenerate PDF');
      }
      
      setPdfRegenerated(true);
      setTimeout(() => setPdfRegenerated(false), 3000);
      
      // Save the content as well
      await saveContent(markdown);
      
    } catch (err) {
      console.error('Error regenerating PDF:', err);
      setError('Failed to regenerate PDF. Please try again.');
    } finally {
      setRegeneratingPdf(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Toolbar actions
  const addTable = () => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const addLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run();
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in slide-in-from-bottom-4 duration-300 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-2 sm:p-4 border-b bg-background flex-shrink-0">
        <h2 className="font-semibold text-xs sm:text-sm truncate max-w-[150px] sm:max-w-none">{title}</h2>
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Regenerate PDF button */}
          <Button 
            variant={pdfRegenerated ? "default" : "outline"}
            size="sm" 
            onClick={regeneratePdf}
            disabled={regeneratingPdf}
            title="Regenerate PDF with current content"
            className="gap-1.5"
          >
            {regeneratingPdf ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="hidden sm:inline text-xs">Generating...</span>
              </>
            ) : pdfRegenerated ? (
              <>
                <Check className="h-3 w-3 text-green-500" />
                <span className="hidden sm:inline text-xs">PDF Updated!</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3" />
                <span className="hidden sm:inline text-xs">Update PDF</span>
              </>
            )}
          </Button>
          
          {/* View mode toggle */}
          {onViewModeChange && (
            <>
              <div className="w-px h-5 bg-border/60" />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onViewModeChange}
                title="Switch to PDF view"
              >
                <FileText className="h-4 w-4" />
              </Button>
            </>
          )}
          {/* Save status */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {saving && (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="hidden sm:inline">Saving...</span>
              </>
            )}
            {savedRecently && !saving && (
              <>
                <Check className="h-3 w-3 text-green-500" />
                <span className="hidden sm:inline">Saved</span>
              </>
            )}
          </div>
          
          <div className="w-px h-5 bg-border/60" />
          
          {/* Manual save button */}
          <Button variant="ghost" size="sm" onClick={handleManualSave} disabled={saving}>
            <Save className="h-4 w-4" />
          </Button>
          
          {/* Close button */}
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b bg-background flex-shrink-0 overflow-x-auto">
        <div className="flex items-center gap-1">
          <Button
            variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className="h-8 w-8 p-0"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className="h-8 w-8 p-0"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant={editor.isActive('strike') ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className="h-8 w-8 p-0"
          >
            <Strikethrough className="h-4 w-4" />
          </Button>
          <Button
            variant={editor.isActive('code') ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className="h-8 w-8 p-0"
          >
            <Code className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-5 bg-border" />

        <div className="flex items-center gap-1">
          <Button
            variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className="h-8 w-8 p-0"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className="h-8 w-8 p-0"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            variant={editor.isActive('taskList') ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className="h-8 w-8 p-0"
          >
            <CheckSquare className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-5 bg-border" />

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={addTable}
            className="h-8 w-8 p-0"
          >
            <TableIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={editor.isActive('link') ? 'secondary' : 'ghost'}
            size="sm"
            onClick={addLink}
            className="h-8 w-8 p-0"
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={editor.isActive('blockquote') ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className="h-8 w-8 p-0"
          >
            <Quote className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="h-8 w-8 p-0"
          >
            <Minus className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-5 bg-border" />

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="h-8 w-8 p-0"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="h-8 w-8 p-0"
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 min-h-0 overflow-auto bg-white dark:bg-gray-950">
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Loading content...</p>
          </div>
        )}
        
        {error && (
          <div className="text-center py-12">
            <p className="text-sm text-destructive mb-4">{error}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Reload
            </Button>
          </div>
        )}
        
        {!loading && !error && (
          <EditorContent editor={editor} className="h-full" />
        )}
      </div>
    </div>
  );
}