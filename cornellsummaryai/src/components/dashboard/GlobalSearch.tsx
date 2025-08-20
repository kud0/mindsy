import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  FileText, 
  Clock, 
  Loader2, 
  X, 
  MoreVertical,
  Download,
  FolderPlus,
  Eye,
  Edit,
  Trash,
  Share2,
  Copy,
  Star
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface SearchResult {
  id: string;
  noteId?: string | null;
  title: string;
  createdAt: string;
  status: string;
  courseSubject?: string;
  fileSize?: number;
  hasNotes?: boolean;
  matchType?: 'title' | 'content';
  excerpt?: string | null;
  studyNode?: {
    id: string;
    name: string;
    type: string;
  } | null;
  studyNodeId?: string | null;
  generatedPdfPath?: string | null;
  audioFilePath?: string | null;
  pdfFilePath?: string | null;
  type: 'note';
}

interface GlobalSearchProps {
  onResultClick: (noteId: string) => void;
  placeholder?: string;
  className?: string;
}

export function GlobalSearch({ onResultClick, placeholder = "Search notes...", className }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim().length > 0) {
        performSearch(query);
      } else {
        setResults([]);
        setShowResults(false);
        setSearchError(null);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Handle clicks outside to close results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global Command+K shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Keyboard navigation within search results
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showResults) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < results.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : results.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && results[selectedIndex]) {
            handleResultClick(results[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowResults(false);
          setSelectedIndex(-1);
          inputRef.current?.blur();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showResults, selectedIndex, results]);

  const performSearch = async (searchQuery: string) => {
    try {
      setLoading(true);
      setSearchError(null);
      console.log('Performing search for:', searchQuery);
      
      const response = await fetch(`/api/notes/search?q=${encodeURIComponent(searchQuery)}`, {
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Search response status:', response.status);
      
      // Check if unauthorized (401)
      if (response.status === 401) {
        console.error('Authentication failed - user may not be logged in');
        setSearchError('Please log in to search');
        setResults([]);
        setShowResults(false);
        // Optionally redirect to login page
        // window.location.href = '/auth/login';
        return;
      }
      
      if (!response.ok) {
        console.error('Search failed with status:', response.status);
        setSearchError(`Search failed: ${response.status}`);
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('Search results:', data);
      setResults(data.results || []);
      setShowResults(true);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Search error:', error);
      setSearchError(error instanceof Error ? error.message : 'Search failed');
      setResults([]);
      setShowResults(false);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    onResultClick(result.id);
    setQuery('');
    setResults([]);
    setShowResults(false);
    setSelectedIndex(-1);
    setSearchError(null);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      'day'
    );
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    setSelectedIndex(-1);
    setSearchError(null);
    inputRef.current?.focus();
  };

  // Action handlers for dropdown menu
  const handleDownload = async (result: SearchResult) => {
    if (!result.generatedPdfPath) {
      toast.error('No PDF available for download');
      return;
    }
    
    setActionLoading(result.id);
    try {
      // Get signed URL for download
      const { data, error } = await supabase.storage
        .from('generated-notes')
        .createSignedUrl(result.generatedPdfPath, 60); // 60 seconds expiry
      
      if (error) throw error;
      
      // Open in new tab for download
      window.open(data.signedUrl, '_blank');
      toast.success('Download started');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    } finally {
      setActionLoading(null);
    }
  };

  const handleView = (result: SearchResult) => {
    // Navigate to the note view
    if (result.noteId) {
      window.location.href = `/dashboard/notes?noteId=${result.noteId}`;
    } else {
      onResultClick(result.id);
    }
  };

  const handleMoveToFolder = async (result: SearchResult) => {
    // This would open a dialog to select folder
    // For now, just show a toast
    toast.info('Folder selection dialog would open here');
    // TODO: Implement folder selection dialog
  };

  const handleEdit = (result: SearchResult) => {
    // Navigate to edit view
    if (result.noteId) {
      window.location.href = `/dashboard/notes/edit?noteId=${result.noteId}`;
    } else {
      toast.info('Edit functionality coming soon');
    }
  };

  const handleDelete = async (result: SearchResult) => {
    if (!confirm(`Are you sure you want to delete "${result.title}"?`)) {
      return;
    }
    
    setActionLoading(result.id);
    try {
      // Delete the job and associated notes
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('job_id', result.id);
      
      if (error) throw error;
      
      // Remove from results
      setResults(results.filter(r => r.id !== result.id));
      toast.success('Note deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete note');
    } finally {
      setActionLoading(null);
    }
  };

  const handleShare = async (result: SearchResult) => {
    // Copy share link to clipboard
    const shareUrl = `${window.location.origin}/shared/note/${result.id}`;
    await navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copied to clipboard');
  };

  const handleDuplicate = async (result: SearchResult) => {
    setActionLoading(result.id);
    try {
      // Fetch the note data
      const { data: noteData, error: noteError } = await supabase
        .from('notes')
        .select('*')
        .eq('job_id', result.id)
        .single();
      
      if (noteError) throw noteError;
      
      // Create a duplicate
      const { error: duplicateError } = await supabase
        .from('notes')
        .insert({
          ...noteData,
          id: undefined,
          title: `${noteData.title} (Copy)`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (duplicateError) throw duplicateError;
      
      toast.success('Note duplicated successfully');
      // Refresh search results
      performSearch(query);
    } catch (error) {
      console.error('Duplicate error:', error);
      toast.error('Failed to duplicate note');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStar = async (result: SearchResult) => {
    // Toggle starred status
    toast.info('Star functionality coming soon');
    // TODO: Implement star/favorite functionality
  };

  return (
    <div ref={searchRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) {
              setShowResults(true);
            }
          }}
          className="pl-10 pr-10 w-full bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800"
        />
        
        {/* Loading spinner */}
        {loading && (
          <Loader2 className="absolute right-8 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
        )}
        
        {/* Clear button */}
        {query && !loading && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
        
        {/* Keyboard shortcut hint */}
        <kbd className="absolute right-3 top-1/2 transform -translate-y-1/2 hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 px-1.5 font-mono text-[10px] font-medium text-gray-600 dark:text-gray-400">
          {query ? '' : '⌘K'}
        </kbd>
      </div>

      {/* Search Results */}
      {showResults && (
        <Card className="absolute top-full left-0 right-0 mt-2 max-h-96 overflow-y-auto z-50 shadow-lg">
          <CardContent className="p-0">
            {searchError && (
              <div className="p-4 text-center text-red-500">
                <p>{searchError}</p>
              </div>
            )}
            
            {results.length === 0 && !loading && query && !searchError && (
              <div className="p-4 text-center text-gray-500">
                <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No notes found for "{query}"</p>
              </div>
            )}
            
            {results.map((result, index) => (
              <div
                key={result.id}
                className={cn(
                  "flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 last:border-b-0",
                  selectedIndex === index && "bg-gray-50 dark:bg-gray-800"
                )}
              >
                {/* Note Icon */}
                <div 
                  className="flex-shrink-0 cursor-pointer"
                  onClick={() => handleResultClick(result)}
                >
                  <FileText className="h-4 w-4 text-blue-500" />
                </div>
                
                {/* Note Info */}
                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => handleResultClick(result)}
                >
                  <p className="font-medium text-sm truncate">{result.title}</p>
                  {result.excerpt && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-1">
                      {result.excerpt}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatDate(result.createdAt)}</span>
                    
                    {result.courseSubject && (
                      <>
                        <span>•</span>
                        <span>{result.courseSubject}</span>
                      </>
                    )}
                    
                    {result.studyNode && (
                      <>
                        <span>•</span>
                        <span className="text-purple-600">{result.studyNode.name}</span>
                      </>
                    )}
                    
                    {result.matchType === 'content' && (
                      <>
                        <span>•</span>
                        <span className="text-blue-600">Found in content</span>
                      </>
                    )}
                    
                    {result.hasNotes && (
                      <>
                        <span>•</span>
                        <span className="text-green-600">✓ Notes</span>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Status Badge */}
                <div className="flex-shrink-0">
                  <Badge variant="secondary" className="text-xs">
                    {result.status}
                  </Badge>
                </div>
                
                {/* 3-dot menu */}
                <div className="flex-shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={actionLoading === result.id}
                      >
                        {actionLoading === result.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MoreVertical className="h-4 w-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => handleView(result)}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Note
                      </DropdownMenuItem>
                      
                      {result.generatedPdfPath && (
                        <DropdownMenuItem onClick={() => handleDownload(result)}>
                          <Download className="w-4 h-4 mr-2" />
                          Download PDF
                        </DropdownMenuItem>
                      )}
                      
                      <DropdownMenuItem onClick={() => handleMoveToFolder(result)}>
                        <FolderPlus className="w-4 h-4 mr-2" />
                        Move to Folder
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuItem onClick={() => handleEdit(result)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem onClick={() => handleDuplicate(result)}>
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem onClick={() => handleStar(result)}>
                        <Star className="w-4 h-4 mr-2" />
                        Add to Favorites
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem onClick={() => handleShare(result)}>
                        <Share2 className="w-4 h-4 mr-2" />
                        Share
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuItem 
                        onClick={() => handleDelete(result)}
                        className="text-red-600"
                      >
                        <Trash className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}