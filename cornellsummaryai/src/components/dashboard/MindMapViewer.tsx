import React, { useEffect, useRef, useState } from 'react';
import { Markmap } from 'markmap-view';
import { Transformer } from 'markmap-lib';
import { Button } from '@/components/ui/button';
import { X, Loader2, Map, FileText, Folder } from 'lucide-react';

interface MindMapViewerProps {
  type: 'folder' | 'note';
  id: string;
  title: string;
  onClose: () => void;
  onNodeClick?: (noteId: string) => void;
}

interface NoteNode {
  id: string;
  title: string;
  createdAt: string;
  content?: string;
}

export function MindMapViewer({ type, id, title, onClose, onNodeClick }: MindMapViewerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const markmapRef = useRef<Markmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mindMapData, setMindMapData] = useState<any>(null);

  // Get color based on how recent the note is
  const getDateColor = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '#10b981'; // Green - Today
    if (diffDays <= 7) return '#eab308';   // Yellow - This week
    if (diffDays <= 30) return '#f97316';  // Orange - This month
    return '#ef4444';                      // Red - Older
  };

  // Get color label for legend
  const getDateLabel = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays <= 7) return `${diffDays} days ago`;
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return `${Math.ceil(diffDays / 30)} months ago`;
  };

  // Convert markdown content to mind map structure with color coding
  const createMindMapMarkdown = (data: any) => {
    let markdown = '';
    
    if (type === 'folder') {
      // Folder view: Show all notes with their structure
      markdown = `# ${title}\n\n`;
      
      if (data.notes && data.notes.length > 0) {
        data.notes.forEach((note: NoteNode) => {
          const color = getDateColor(note.createdAt);
          const label = getDateLabel(note.createdAt);
          
          // Add note as a colored branch with metadata - use markdown-safe format
          markdown += `## ${note.title} _(${label})_ <!-- noteId:${note.id} color:${color} -->\n\n`;
          
          if (note.content) {
            // Parse the note content to extract headings (h2 and h3)
            const lines = note.content.split('\n');
            let currentH2 = '';
            
            lines.forEach(line => {
              if (line.startsWith('## ')) {
                currentH2 = line.substring(3);
                markdown += `### ${currentH2}\n\n`;
              } else if (line.startsWith('### ') && currentH2) {
                const h3Content = line.substring(4);
                markdown += `#### ${h3Content}\n\n`;
              }
            });
          }
        });
      } else {
        markdown += '## No notes in this folder yet\n';
      }
    } else {
      // Single note view: Show detailed structure
      markdown = `# ${title}\n\n`;
      
      if (data.content) {
        // Parse the markdown content to create a detailed structure
        const lines = data.content.split('\n');
        let inCodeBlock = false;
        let currentIndent = 0;
        
        lines.forEach(line => {
          // Skip code blocks
          if (line.startsWith('```')) {
            inCodeBlock = !inCodeBlock;
            return;
          }
          if (inCodeBlock) return;
          
          // Include h1, h2, h3, h4 headings
          if (line.startsWith('# ')) {
            markdown += `## ${line.substring(2)}\n\n`;
            currentIndent = 2;
          } else if (line.startsWith('## ')) {
            markdown += `### ${line.substring(3)}\n\n`;
            currentIndent = 3;
          } else if (line.startsWith('### ')) {
            markdown += `#### ${line.substring(4)}\n\n`;
            currentIndent = 4;
          } else if (line.startsWith('#### ')) {
            markdown += `##### ${line.substring(5)}\n\n`;
            currentIndent = 5;
          }
          // Include bullet points as child nodes
          else if ((line.startsWith('- ') || line.startsWith('* ')) && line.trim().length > 2) {
            const bulletContent = line.substring(2).trim();
            if (bulletContent) {
              // Add bullets as child nodes based on current heading level
              const bulletLevel = Math.min(currentIndent + 1, 6);
              markdown += `${'#'.repeat(bulletLevel)} ${bulletContent}\n\n`;
            }
          }
        });
      }
    }
    
    return markdown;
  };

  // Fetch data based on type
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let response;
        if (type === 'folder') {
          // Fetch all notes in the folder
          response = await fetch(`/api/folders/${id}/mindmap`);
        } else {
          // Fetch single note content
          response = await fetch(`/api/notes/${id}/mindmap`);
        }
        
        if (!response.ok) {
          throw new Error('Failed to load data');
        }
        
        const responseJson = await response.json();
        // The API wraps the response in a 'data' field
        const data = responseJson.data || responseJson;
        console.log('Mind map data received:', data);
        console.log('Content field:', data.content ? `${data.content.length} chars` : 'missing');
        setMindMapData(data);
        
        // Create mind map markdown
        const markdown = createMindMapMarkdown(data);
        console.log('Generated markdown for mind map:', markdown);
        
        // Transform markdown to mind map data
        const transformer = new Transformer();
        const { root } = transformer.transform(markdown);
        console.log('Transformed root:', root);
        
        // Wait for next tick to ensure SVG is ready
        setTimeout(() => {
          if (svgRef.current) {
            // Always create a new Markmap instance
            if (markmapRef.current) {
              markmapRef.current.destroy();
              markmapRef.current = null;
            }
            
            markmapRef.current = Markmap.create(svgRef.current, {
              duration: 300,
              nodeMinHeight: 16,
              spacingVertical: 10,
              spacingHorizontal: 120,
              autoFit: true,
              color: (node: any) => {
                // Color coding for date-based freshness
                if (node.content && node.content.includes('noteId:')) {
                  const match = node.content.match(/color:([#\w]+)/);
                  return match ? match[1] : '#6b7280';
                }
                return '#6b7280';
              },
              paddingX: 20,
            });
            
            markmapRef.current.setData(root);
            markmapRef.current.fit();
          }
        }, 100);
        
      } catch (err) {
        console.error('Error loading mind map data:', err);
        setError('Failed to load mind map. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [type, id, title]);

  // Handle node clicks
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Look for the note ID in the text content (from the HTML comment)
      const textContent = target.textContent || '';
      
      if (textContent && onNodeClick) {
        // Extract noteId from comment in the rendered content
        const parentG = target.closest('g');
        if (parentG) {
          const fullText = parentG.textContent || '';
          const match = fullText.match(/noteId:([a-zA-Z0-9-]+)/);
          if (match && match[1]) {
            onNodeClick(match[1]);
          }
        }
      }
    };
    
    if (svgRef.current) {
      svgRef.current.addEventListener('click', handleClick);
      return () => {
        svgRef.current?.removeEventListener('click', handleClick);
      };
    }
  }, [onNodeClick]);

  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in slide-in-from-bottom-4 duration-300 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-2 sm:p-4 border-b bg-background flex-shrink-0">
        <div className="flex items-center gap-2">
          {type === 'folder' ? (
            <Folder className="h-4 w-4 text-muted-foreground" />
          ) : (
            <FileText className="h-4 w-4 text-muted-foreground" />
          )}
          <h2 className="font-semibold text-xs sm:text-sm truncate max-w-[200px] sm:max-w-none">
            {title} - Mind Map
          </h2>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Legend */}
          <div className="hidden sm:flex items-center gap-2 text-xs mr-4">
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              Today
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              This week
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              This month
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              Older
            </span>
          </div>
          
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mind Map Content */}
      <div className="flex-1 min-h-0 overflow-auto bg-white dark:bg-gray-950 p-4">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-sm text-muted-foreground">Generating mind map...</p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-sm text-destructive mb-4">{error}</p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          </div>
        )}
        
        {!loading && !error && (
          <div className="w-full h-full">
            <svg
              ref={svgRef}
              className="w-full h-full cursor-grab active:cursor-grabbing"
              style={{ minHeight: '500px' }}
            />
          </div>
        )}
      </div>
      
      {/* Instructions */}
      {!loading && !error && (
        <div className="p-2 border-t bg-muted/50 text-xs text-muted-foreground text-center">
          {type === 'folder' 
            ? 'Click on any note to open it • Drag to pan • Scroll to zoom'
            : 'Drag to pan • Scroll to zoom • Click nodes to expand/collapse'
          }
        </div>
      )}
    </div>
  );
}