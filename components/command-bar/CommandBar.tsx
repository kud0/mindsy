"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format, addDays, addHours, addMinutes, setHours, setMinutes, startOfToday, startOfTomorrow } from 'date-fns';
import { Calendar, Clock, BookOpen, Check, X, Sparkles, Search, FileText, Folder, ArrowRight, Command } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

type CommandMode = 'schedule' | 'search';

interface ParsedCommand {
  isValid: boolean;
  subject?: string;
  startTime?: Date;
  duration?: number; // in minutes
  type?: 'study' | 'review' | 'exam-prep' | 'break';
  action?: 'create' | 'move' | 'cancel' | 'extend';
  error?: string;
  preview?: string;
}

interface StudyFolder {
  id: string;
  name: string;
}

interface SearchResult {
  id: string;
  title: string;
  type: 'lecture' | 'note' | 'folder';
  path?: string;
  subject?: string;
  created_at?: string;
}

export function CommandBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [command, setCommand] = useState('');
  const [mode, setMode] = useState<CommandMode>('search');
  const [parsed, setParsed] = useState<ParsedCommand | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [studyFolders, setStudyFolders] = useState<StudyFolder[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const router = useRouter();

  // Load study folders for subject matching
  useEffect(() => {
    const loadFolders = async () => {
      const { data: folders } = await supabase
        .from('study_nodes')
        .select('id, name')
        .order('name');
      
      if (folders) {
        setStudyFolders(folders);
      }
    };
    
    if (isOpen) {
      loadFolders();
    }
  }, [isOpen]);

  // Parse natural language command
  const parseCommand = useCallback((input: string): ParsedCommand => {
    if (!input.trim()) {
      return { isValid: false };
    }

    const lowered = input.toLowerCase();
    const words = lowered.split(' ');
    
    // Initialize result
    let result: ParsedCommand = {
      isValid: false,
      type: 'study',
      duration: 60, // default 1 hour
      action: 'create'
    };

    // Parse subject - look for folder matches
    for (const folder of studyFolders) {
      if (lowered.includes(folder.name.toLowerCase())) {
        result.subject = folder.name;
        break;
      }
    }
    
    // Common subject shortcuts
    const subjectMap: Record<string, string> = {
      'math': 'Mathematics',
      'maths': 'Mathematics',
      'calc': 'Calculus',
      'phys': 'Physics',
      'chem': 'Chemistry',
      'bio': 'Biology',
      'eng': 'English',
      'hist': 'History',
      'cs': 'Computer Science'
    };

    for (const [shortcut, fullName] of Object.entries(subjectMap)) {
      if (lowered.includes(shortcut)) {
        result.subject = result.subject || fullName;
        break;
      }
    }

    // Parse time and date
    const now = new Date();
    let baseDate = startOfToday();

    // Date parsing
    if (lowered.includes('now')) {
      result.startTime = now;
    } else if (lowered.includes('tomorrow') || lowered.includes('tmrw')) {
      baseDate = startOfTomorrow();
    } else if (lowered.includes('today')) {
      baseDate = startOfToday();
    } else {
      // Check for day names with "next" modifier
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const dayIndex = days.findIndex(day => lowered.includes(day));
      if (dayIndex !== -1) {
        const today = now.getDay();
        let daysUntil = (dayIndex - today + 7) % 7;
        
        // If it's "next [day]", always go to next week's occurrence
        if (lowered.includes('next')) {
          daysUntil = daysUntil === 0 ? 7 : daysUntil;
        } else {
          // Otherwise, if it's the same day, go to next week
          daysUntil = daysUntil || 7;
        }
        
        baseDate = addDays(startOfToday(), daysUntil);
      }
    }

    // Time parsing
    const timeRegex = /(\d{1,2})(?::(\d{2}))?\s*(am|pm|p)?/;
    const timeMatch = lowered.match(timeRegex);
    
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2] || '0');
      const meridiem = timeMatch[3];
      
      // Handle PM
      if (meridiem === 'pm' || meridiem === 'p') {
        if (hours < 12) hours += 12;
      } else if (meridiem === 'am' && hours === 12) {
        hours = 0;
      } else if (!meridiem) {
        // If no meridiem and hour is small, assume PM for afternoon times
        if (hours <= 6) hours += 12;
      }
      
      result.startTime = setMinutes(setHours(baseDate, hours), minutes);
    } else if (!lowered.includes('now')) {
      // Default to 9 AM if date is specified but no time
      if (baseDate.getTime() !== startOfToday().getTime() || lowered.includes('today')) {
        result.startTime = setHours(setMinutes(baseDate, 0), 9);
      } else {
        // Default to next hour if no date or time specified
        result.startTime = addHours(setMinutes(now, 0), 1);
      }
    }

    // Duration parsing
    const durationRegex = /(?:for\s+)?(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|m|min|mins|minute|minutes)/;
    const durationMatch = lowered.match(durationRegex);
    
    if (durationMatch) {
      const amount = parseFloat(durationMatch[1]);
      const unit = durationMatch[2];
      
      if (unit.startsWith('h')) {
        result.duration = amount * 60;
      } else {
        result.duration = amount;
      }
    }

    // Session type parsing
    if (lowered.includes('review')) {
      result.type = 'review';
    } else if (lowered.includes('exam') || lowered.includes('test') || lowered.includes('prep')) {
      result.type = 'exam-prep';
    } else if (lowered.includes('break')) {
      result.type = 'break';
      result.duration = 15; // Default break duration
    }

    // Quick duration shortcuts
    if (lowered.includes('quick')) {
      result.duration = 30;
    } else if (lowered.includes('deep') || lowered.includes('long')) {
      result.duration = 120;
    }

    // Generate preview
    if (result.startTime) {
      const endTime = addMinutes(result.startTime, result.duration!);
      result.preview = `${result.subject || 'Study Session'} • ${format(result.startTime, 'MMM d, h:mm a')} - ${format(endTime, 'h:mm a')}`;
      result.isValid = true;
    } else {
      result.error = "Couldn't understand the time. Try 'tomorrow 2pm' or 'today 3:30pm'";
    }

    return result;
  }, [studyFolders]);

  // Search lectures and notes
  const performSearch = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      // Search in jobs (lectures)
      const { data: lectures } = await supabase
        .from('jobs')
        .select('job_id, lecture_title, course_subject')
        .or(`lecture_title.ilike.%${query}%,course_subject.ilike.%${query}%`)
        .limit(5);

      // Search in study_nodes (folders)
      const { data: folders } = await supabase
        .from('study_nodes')
        .select('id, name, type')
        .ilike('name', `%${query}%`)
        .limit(3);

      const results: SearchResult[] = [];
      
      if (lectures) {
        lectures.forEach(lecture => {
          results.push({
            id: lecture.job_id,
            title: lecture.lecture_title || 'Untitled Lecture',
            type: 'lecture',
            subject: lecture.course_subject,
            path: `/dashboard/lectures/${lecture.job_id}`
          });
        });
      }

      if (folders) {
        folders.forEach(folder => {
          results.push({
            id: folder.id,
            title: folder.name,
            type: 'folder',
            path: `/dashboard/lectures?folder=${folder.id}`
          });
        });
      }

      setSearchResults(results);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Search error:', error);
    }
  }, [supabase]);

  // Determine mode and update accordingly
  useEffect(() => {
    // Detect mode based on input
    if (command.startsWith('/')) {
      // Search mode with / prefix
      setMode('search');
      const searchQuery = command.slice(1).trim();
      performSearch(searchQuery);
      setParsed(null);
    } else if (command.includes('tomorrow') || command.includes('today') || 
               command.includes('now') || command.includes('min') || 
               command.includes('hour') || command.includes('pm') || 
               command.includes('am') || command.includes('monday') ||
               command.includes('tuesday') || command.includes('wednesday') ||
               command.includes('thursday') || command.includes('friday') ||
               command.includes('saturday') || command.includes('sunday') ||
               command.includes('next') || command.includes('prep') ||
               command.includes('study') || command.includes('review') ||
               command.includes('exam') || command.includes('session') ||
               /\d/.test(command)) {
      // Schedule mode - contains time-related keywords or numbers
      setMode('schedule');
      const parsed = parseCommand(command);
      setParsed(parsed);
      setSearchResults([]);
    } else if (command.length > 0) {
      // Default to search for general queries
      setMode('search');
      performSearch(command);
      setParsed(null);
    } else {
      // Empty state
      setSearchResults([]);
      setParsed(null);
    }
  }, [command, parseCommand, performSearch]);

  // Handle keyboard shortcut and navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setCommand('');
        setMode('search');
        setSearchResults([]);
        setParsed(null);
        setSelectedIndex(0);
      }
      
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setCommand('');
        setSearchResults([]);
        setParsed(null);
      }

      // Arrow navigation for search results
      if (isOpen && mode === 'search' && searchResults.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % searchResults.length);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + searchResults.length) % searchResults.length);
        }
      }
    };

    // Use capture phase to handle before other listeners
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, mode, searchResults.length]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Create the study session
  const createSession = async () => {
    if (!parsed?.isValid || !parsed.startTime) return;
    
    setIsProcessing(true);
    try {
      const endTime = addMinutes(parsed.startTime, parsed.duration!);
      
      const response = await fetch('/api/study-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: parsed.subject || 'Study Session',
          start_time: parsed.startTime.toISOString(),
          end_time: endTime.toISOString(),
          session_type: parsed.type,
          subject: parsed.subject,
          description: `Created via quick command: "${command}"`
        })
      });

      if (response.ok) {
        toast.success('✨ Session created!', {
          description: parsed.preview
        });
        setIsOpen(false);
        setCommand('');
        
        // Trigger a calendar refresh if the calendar is visible
        window.dispatchEvent(new CustomEvent('calendar-refresh'));
      } else {
        throw new Error('Failed to create session');
      }
    } catch (error) {
      toast.error('Failed to create session');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'schedule' && parsed?.isValid) {
      createSession();
    } else if (mode === 'search' && searchResults.length > 0) {
      const selected = searchResults[selectedIndex];
      if (selected?.path) {
        router.push(selected.path);
        setIsOpen(false);
        setCommand('');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />
      
      {/* Command Bar */}
      <div className="relative w-full max-w-2xl bg-popover rounded-lg shadow-2xl mx-4">
        <form onSubmit={handleSubmit}>
          {/* Input */}
          <div className="flex items-center px-4 py-3 border-b border-border">
            {mode === 'search' ? (
              <Search className="w-5 h-5 text-blue-500 mr-3" />
            ) : (
              <Sparkles className="w-5 h-5 text-purple-500 mr-3 animate-pulse" />
            )}
            <input
              ref={inputRef}
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Search lectures or create session: 'math tomorrow 2pm'"
              className="flex-1 bg-transparent outline-none text-lg text-popover-foreground placeholder-muted-foreground"
            />
            {command && (
              <button
                type="button"
                onClick={() => {
                  setCommand('');
                  setSearchResults([]);
                  setParsed(null);
                }}
                className="ml-2 p-1 hover:bg-accent rounded"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Results Display */}
          {command && (
            <div className="max-h-96 overflow-y-auto">
              {mode === 'search' && searchResults.length > 0 ? (
                // Search Results
                <div className="py-2">
                  {searchResults.map((result, index) => (
                    <button
                      key={result.id}
                      type={index === selectedIndex ? 'submit' : 'button'}
                      onClick={() => {
                        if (result.path) {
                          router.push(result.path);
                          setIsOpen(false);
                        }
                      }}
                      className={`w-full px-4 py-2 flex items-center gap-3 hover:bg-accent ${
                        index === selectedIndex ? 'bg-muted' : ''
                      }`}
                    >
                      <div className="p-1.5 bg-muted rounded">
                        {result.type === 'lecture' ? (
                          <FileText className="w-4 h-4 text-blue-500" />
                        ) : (
                          <Folder className="w-4 h-4 text-yellow-500" />
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-foreground">
                          {result.title}
                        </p>
                        {result.subject && (
                          <p className="text-xs text-muted-foreground">
                            {result.subject}
                          </p>
                        )}
                      </div>
                      {index === selectedIndex && (
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  ))}
                </div>
              ) : mode === 'schedule' && parsed?.isValid ? (
                // Schedule Preview
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {parsed.subject || 'Study Session'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {parsed.preview}
                        </p>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isProcessing ? (
                        <>
                          <Clock className="w-4 h-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Create
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : mode === 'search' && command.length > 0 ? (
                // No search results
                <div className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <Search className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      No results found for "{command}"
                    </p>
                  </div>
                </div>
              ) : parsed?.error ? (
                // Schedule error
                <div className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                      <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {parsed.error}
                    </p>
                  </div>
                </div>
              ) : (
                // Empty state
                <div className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <Command className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Start typing to search or create a session...
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Hints */}
          <div className="px-4 py-2 bg-muted/50 rounded-b-lg">
            <p className="text-xs text-muted-foreground">
              {mode === 'search' ? (
                <>
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">↑↓</kbd> to navigate
                  <span className="mx-2">•</span>
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter</kbd> to open
                  <span className="mx-2">•</span>
                  Type time to schedule: "math tomorrow 2pm"
                </>
              ) : (
                <>
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter</kbd> to create
                  <span className="mx-2">•</span>
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Esc</kbd> to cancel
                  <span className="mx-2">•</span>
                  Try: "calc today 3pm" or just type to search
                </>
              )}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}