import React, { useState, useEffect, lazy, Suspense, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, ZoomIn, ZoomOut, Edit, Paperclip, Highlighter } from 'lucide-react';
import { AttachmentsViewer } from './AttachmentsViewer';
import { HighlightToolbar } from './HighlightToolbar';
import { usePdfSelection } from '@/hooks/usePdfSelection';
import type { PDFTextSelection, HighlightColor, Highlight } from '@/types/highlights';
import { HIGHLIGHT_COLORS } from '@/types/highlights';

// Lazy load react-pdf to avoid SSR issues
const ReactPDF = lazy(() => import('react-pdf'));
const Document = lazy(() => import('react-pdf').then(module => ({ default: module.Document })));
const Page = lazy(() => import('react-pdf').then(module => ({ default: module.Page })));

// Import styles
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure worker
if (typeof window !== 'undefined') {
  import('react-pdf').then(({ pdfjs }) => {
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  });
}

interface PdfViewerProps {
  jobId: string;
  title: string;
  onClose: () => void;
  onViewModeChange?: () => void;
  format?: 'pdf' | 'original'; // Add format prop to specify which document to view
}

export function PdfViewer({ jobId, title, onClose, onViewModeChange, format = 'pdf' }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAttachments, setShowAttachments] = useState(false);
  const [attachmentCount, setAttachmentCount] = useState(0);
  
  // Highlighting state
  const [highlightingMode, setHighlightingMode] = useState(false);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [editingHighlight, setEditingHighlight] = useState<Highlight | null>(null);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const [showToolbar, setShowToolbar] = useState(false);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  
  // Responsive scale based on screen size
  const [scale, setScale] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 ? 0.6 : 1.3;
    }
    return 1.3;
  });

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      setScale(isMobile ? 0.6 : 1.3);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch attachment count only after PDF loads successfully
  useEffect(() => {
    if (!loading) {
      const fetchAttachmentCount = async () => {
        try {
          const response = await fetch(`/api/notes/${jobId}/attachments`, {
            credentials: 'include'
          });
          if (response.ok) {
            const data = await response.json();
            setAttachmentCount(data.attachments?.length || 0);
          }
        } catch (error) {
          console.error('Error fetching attachments:', error);
        }
      };
      
      fetchAttachmentCount();
    }
  }, [jobId, loading]);

  const pdfUrl = `/api/download/${jobId}?format=${format}&inline=true`;

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error);
    setError('Failed to load PDF. Please try again.');
    setLoading(false);
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = `/api/download/${jobId}?format=${format}`;
    // For original documents, preserve original extension, otherwise use .pdf
    const extension = format === 'original' ? 'pdf' : 'pdf'; // Most originals will be PDFs, API handles extension
    a.download = `${title}_${format === 'original' ? 'original' : 'notes'}.${extension}`;
    a.click();
  };

  const zoomIn = () => setScale((prev) => Math.min(prev + 0.1, 3.0));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.1, 0.4));

  // Handle creating a highlight (called from toolbar)
  const handleCreateHighlight = async (selection: PDFTextSelection, color: HighlightColor = 'yellow', note?: string) => {
    console.log('Creating highlight for jobId:', jobId);
    
    try {
      const highlightData = {
        job_id: jobId,
        page_number: selection.pageNumber,
        selected_text: selection.text,
        position_data: selection.position,
        color: color,
        note: note || null
      };

      const response = await fetch('/api/highlights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(highlightData)
      });

      if (response.ok) {
        const data = await response.json();
        setHighlights(prev => [...prev, data.highlight]);
        clearSelection();
        
        console.log('Highlight created successfully');
      } else {
        const errorData = await response.text();
        console.error('Failed to create highlight:', response.status, errorData);
      }
    } catch (error) {
      console.error('Error creating highlight:', error);
    }
  };

  // Initialize PDF selection hook - back to immediate highlighting
  const { clearSelection } = usePdfSelection({
    onTextSelected: (selection) => {
      if (highlightingMode) {
        // Create highlight immediately (restore original behavior)
        handleCreateHighlight(selection, 'yellow'); // Default yellow color
      }
    },
    containerRef: pdfContainerRef,
    scale: scale
  });

  // Fetch existing highlights
  useEffect(() => {
    if (!loading && jobId) {
      fetchHighlights();
    }
  }, [loading, jobId]);
  
  // Keyboard shortcuts for highlight management
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC to cancel/close toolbar
      if (e.key === 'Escape' && showToolbar) {
        e.preventDefault();
        setShowToolbar(false);
        setEditingHighlight(null);
      }
      
      // Delete key to delete selected highlight
      if (e.key === 'Delete' && editingHighlight && showToolbar) {
        e.preventDefault();
        handleDeleteHighlight(editingHighlight.id);
        setShowToolbar(false);
        setEditingHighlight(null);
      }
    };
    
    if (showToolbar) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [showToolbar, editingHighlight]);

  const fetchHighlights = async () => {
    try {
      const response = await fetch(`/api/highlights?job_id=${jobId}`);
      if (response.ok) {
        const data = await response.json();
        setHighlights(data.highlights || []);
      }
    } catch (error) {
      console.error('Error fetching highlights:', error);
    }
  };

  // Handle clicking on existing highlights to edit them
  const handleHighlightClick = (highlight: Highlight, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    setEditingHighlight(highlight); // Set highlight for editing
    
    // Position toolbar near the clicked highlight
    const rect = event.currentTarget.getBoundingClientRect();
    const containerRect = pdfContainerRef.current?.getBoundingClientRect();
    
    setToolbarPosition({
      x: Math.min(rect.right - (containerRect?.left || 0), window.innerWidth - 350),
      y: Math.max(rect.top - (containerRect?.top || 0) - 10, 10)
    });
    
    setShowToolbar(true);
  };

  const handleUpdateHighlight = async (highlightId: string, color: HighlightColor, note?: string) => {
    try {
      const response = await fetch(`/api/highlights/${highlightId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ color, note })
      });

      if (response.ok) {
        const data = await response.json();
        setHighlights(prev => prev.map(h => h.id === highlightId ? data.highlight : h));
      }
    } catch (error) {
      console.error('Error updating highlight:', error);
    }
  };

  const handleDeleteHighlight = async (highlightId: string) => {
    try {
      const response = await fetch(`/api/highlights/${highlightId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setHighlights(prev => prev.filter(h => h.id !== highlightId));
      }
    } catch (error) {
      console.error('Error deleting highlight:', error);
    }
  };

  // Loading component
  const LoadingPDF = () => (
    <div className="flex flex-col h-full bg-background animate-in fade-in slide-in-from-bottom-4 duration-300 overflow-hidden">
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading PDF viewer...</p>
      </div>
    </div>
  );

  // Don't render PDF viewer on server side - let Suspense handle it
  if (typeof window === 'undefined') {
    return null;
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
    <div className="flex flex-col h-full bg-background animate-in fade-in slide-in-from-bottom-4 duration-300 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-2 sm:p-4 border-b bg-background flex-shrink-0">
        <div className="flex flex-col">
          <h2 className="font-semibold text-xs sm:text-sm truncate max-w-[150px] sm:max-w-none">{title}</h2>
          {format === 'original' && (
            <span className="text-xs text-muted-foreground">Original Document</span>
          )}
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          {/* View mode toggle */}
          {onViewModeChange && (
            <>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onViewModeChange}
                title="Switch to Edit mode"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <div className="w-px h-5 bg-border/60" />
            </>
          )}
          {/* Zoom controls */}
          <Button variant="ghost" size="sm" onClick={zoomOut} disabled={scale <= 0.5}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="hidden sm:inline text-xs text-muted-foreground min-w-[3rem] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button variant="ghost" size="sm" onClick={zoomIn} disabled={scale >= 2.5}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-5 bg-border/60" />
          
          {/* Attachments button */}
          {attachmentCount > 0 && (
            <>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowAttachments(true)}
                className="relative"
              >
                <Paperclip className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                  {attachmentCount}
                </span>
              </Button>
              <div className="w-px h-5 bg-border/60" />
            </>
          )}
          
          {/* Highlighting toggle */}
          <Button 
            variant={highlightingMode ? "default" : "ghost"} 
            size="sm" 
            onClick={() => {
              setHighlightingMode(!highlightingMode);
              // Clear any open edit dialogs when toggling highlight mode
              if (!highlightingMode) {
                setShowToolbar(false);
                setEditingHighlight(null);
              }
            }}
            title={highlightingMode ? "Exit highlighting mode - Click text to highlight immediately" : "Enter highlighting mode"}
            className={highlightingMode ? "bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200" : ""}
          >
            <Highlighter className="h-4 w-4" />
            {highlightingMode && <span className="ml-1 text-xs">ON</span>}
          </Button>
          
          {/* Download button */}
          <Button variant="ghost" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
          
          {/* Close button */}
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Content */}
      <div 
        className="flex-1 min-h-0 overflow-auto bg-gray-100"
        onClick={(e) => {
          // Close toolbar when clicking outside highlights
          const target = e.target as Element;
          const isBackgroundClick = e.target === e.currentTarget || 
                                   target?.classList?.contains('react-pdf__Page__canvas') ||
                                   target?.classList?.contains('textLayer') ||
                                   target?.tagName === 'SPAN';
          
          if (isBackgroundClick && showToolbar) {
            setShowToolbar(false);
            setEditingHighlight(null);
          }
        }}
      >
        <div className="flex justify-center p-1 sm:p-2">
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Loading PDF...</p>
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
          
          <div ref={pdfContainerRef} className="relative">
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading=""
            >
              {/* Render all pages for continuous scrolling */}
              {numPages && Array.from(new Array(numPages), (el, index) => (
                <div key={`page_${index + 1}`} className="mb-2 sm:mb-4 relative" data-page-number={index + 1}>
                  <div className="relative">
                    <Page
                      pageNumber={index + 1}
                      scale={scale}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      className="shadow-lg max-w-full"
                      loading=""
                    />
                    {/* Highlight overlay - positioned to match text layer exactly */}
                    <div 
                      className="absolute pointer-events-none textLayer-highlights"
                      style={{
                        // Match the text layer positioning exactly using inset: 0
                        inset: 0,
                        zIndex: 1, // Below text layer (z-index: 2) but above canvas
                        transform: 'translateZ(0)' // Force hardware acceleration
                      }}
                    >
                      {highlights
                        .filter(highlight => highlight.page_number === index + 1)
                        .map(highlight => {
                          const rects = highlight.position_data.rects || [];
                          return rects.length > 0 ? rects.map((rect, rectIndex) => {
                            // Calculate scale adjustment ratio
                            const storedScale = highlight.position_data.scale || 1;
                            const scaleRatio = scale / storedScale;
                            
                            // Apply scale adjustment to coordinates
                            const adjustedRect = {
                              left: rect.left * scaleRatio,
                              top: rect.top * scaleRatio,
                              width: rect.width * scaleRatio,
                              height: rect.height * scaleRatio
                            };
                            
                            return (
                              <div
                                key={`${highlight.id}-${rectIndex}`}
                                className="absolute cursor-pointer pointer-events-auto group"
                                style={{
                                  left: `${adjustedRect.left}px`,
                                  top: `${adjustedRect.top}px`,
                                  width: `${adjustedRect.width}px`,
                                  height: `${adjustedRect.height}px`,
                                  backgroundColor: HIGHLIGHT_COLORS[highlight.color]?.bg || HIGHLIGHT_COLORS.yellow.bg,
                                  borderRadius: '2px',
                                  pointerEvents: 'auto',
                                  transition: 'all 0.2s ease-in-out',
                                  border: `1px solid ${HIGHLIGHT_COLORS[highlight.color]?.border || HIGHLIGHT_COLORS.yellow.border}`,
                                }}
                                title={`Click to edit or delete\n"${highlight.selected_text}"${highlight.note ? `\n\nNote: ${highlight.note}` : ''}`}
                                onClick={(e) => handleHighlightClick(highlight, e)}
                              />
                            );
                          }) : null;
                        })
                      }
                    </div>
                  </div>
                </div>
              ))}
            </Document>
          </div>
        </div>
      </div>

      {/* Page count info */}
      {numPages && numPages > 1 && (
        <div className="flex items-center justify-center gap-4 p-2 border-t bg-background flex-shrink-0">
          <span className="text-sm text-muted-foreground">
            {numPages} pages • Scroll to navigate
          </span>
        </div>
      )}

      {/* Highlight Toolbar - only for editing existing highlights */}
      {showToolbar && editingHighlight && (
        <HighlightToolbar
          isVisible={showToolbar}
          position={toolbarPosition}
          existingHighlight={editingHighlight}
          onUpdate={async (color: HighlightColor, note?: string) => {
            if (editingHighlight) {
              await handleUpdateHighlight(editingHighlight.id, color, note);
            }
            setShowToolbar(false);
            setEditingHighlight(null);
          }}
          onDelete={async () => {
            if (editingHighlight) {
              await handleDeleteHighlight(editingHighlight.id);
            }
            setShowToolbar(false);
            setEditingHighlight(null);
          }}
          onCancel={() => {
            setShowToolbar(false);
            setEditingHighlight(null);
          }}
        />
      )}

      {/* Attachments Viewer Modal */}
      <AttachmentsViewer
        noteId={jobId}
        open={showAttachments}
        onOpenChange={setShowAttachments}
        onViewAttachment={(attachment) => {
          // If viewing a PDF attachment, could open it in a new tab or another viewer
          if (attachment.download_url) {
            window.open(attachment.download_url, '_blank');
          }
        }}
      />
    </div>
    </Suspense>
  );
}