"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useScroll } from '@/components/dashboard/DashboardWrapper';
import { ArrowLeft, RefreshCw, Settings, Hand } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TabNavigation } from './TabNavigation';
import { SegmentedControl } from './SegmentedControl';
import { OverviewTab } from './tabs/OverviewTab';
import { QuestionsTab } from './tabs/QuestionsTab';
import { ExplanationsTab } from './tabs/ExplanationsTab';
import { SummaryTab } from './tabs/SummaryTab';
import { StudyTimeTab } from './tabs/StudyTimeTab';
import { MaterialsTab } from './tabs/MaterialsTab';
import { TranscriptTab } from './tabs/TranscriptTab';
import { ContentSummaryTab } from './tabs/ContentSummaryTab';
import { MindMapTab } from './tabs/MindMapTab';
import { PersistentAudioPlayer, PersistentAudioPlayerRef } from './PersistentAudioPlayer';
import { TutorExplanationSheet } from './TutorExplanationSheet';
import { TutorHistoryDrawer } from './TutorHistoryDrawer';
import { ShareButton } from '@/components/share/ShareButton';

interface StudentDeskProps {
  jobId: string;
}

interface TutorQuestion {
  id: string;
  tab_name: string;
  selected_text: string;
  ai_explanation: string;
  created_at: string;
}

interface LectureData {
  metadata: {
    title: string;
    difficulty: string;
    estimatedTime: string;
    subjectDomain: string;
    examImportance: string;
  };
  overview: {
    mainTopic: string;
    keyObjectives: string[];
    coreConceptsList: string[];
  };
  questions: any[];
  explanations: any[];
  summary: {
    // NEW SCHEMA (from Grok generateStudentDeskContent)
    sections?: Array<{
      heading: string;
      content: string;
      keyPoints?: string[];
    }>;
    mustKnow?: Array<{
      concept: string;
      explanation: string;
    }>;
    commonPitfalls?: Array<{
      pitfall: string;
      explanation: string;
      howToAvoid?: string;
    }>;
    // OLD SCHEMA (legacy support)
    essentialPoints?: string[];
    examFocus?: {
      mustKnow: string[];
      likelyQuestions: string[];
    };
  };
  engagement: {
    quizMetrics: {
      totalQuestions: string | number;
      totalPoints: string | number;
      passingScore: string | number;
    };
    achievements: Array<{
      id: string;
      name: string;
      points: number;
    }>;
  };
  // New fields for secondary tabs
  transcript?: any;
  contentSummary?: any;
  mindMap?: any;
}


export default function StudentDesk({ jobId }: StudentDeskProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [activeMode, setActiveMode] = useState('summary');
  const [lectureData, setLectureData] = useState<LectureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isScrolled, setIsScrolled } = useScroll();

  // State preservation for each tab
  const tabScrollPositions = useRef<Record<string, number>>({});
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Audio player ref for seeking from transcript timestamps
  const audioPlayerRef = useRef<PersistentAudioPlayerRef>(null);

  // AI Tutor / "Raise Your Hand" feature state
  const [tutorSheetOpen, setTutorSheetOpen] = useState(false);
  const [tutorSelectedText, setTutorSelectedText] = useState('');
  const [tutorExplanation, setTutorExplanation] = useState('');
  const [tutorLoading, setTutorLoading] = useState(false);
  const [tutorCreatedAt, setTutorCreatedAt] = useState<string | undefined>(undefined);
  const [tutorFromHistory, setTutorFromHistory] = useState(false); // Track if viewing from history

  // Tutor history state
  const [tutorHistoryOpen, setTutorHistoryOpen] = useState(false);
  const [tutorQuestions, setTutorQuestions] = useState<TutorQuestion[]>([]);
  const [tutorHistoryLoading, setTutorHistoryLoading] = useState(false);

  // Touch/swipe handling for mobile
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const swipeThreshold = 50;
  const isSwipingHorizontally = useRef(false);

  // Helper functions for data transformation
  const stripHtml = (html: string): string => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').trim();
  };

  // Generate mind map structure from lecture data
  const generateMindMapFromData = (data: any) => {
    if (!data) return null;
    
    return {
      id: 'root',
      label: data.metadata?.title || 'Lecture',
      type: 'root',
      color: 'bg-blue-500',
      children: [
        {
          id: 'overview',
          label: 'Overview',
          type: 'branch',
          color: 'bg-purple-500',
          children: (data.overview?.keyObjectives || []).slice(0, 3).map((obj: string, i: number) => ({
            id: `obj-${i}`,
            label: obj.substring(0, 30) + (obj.length > 30 ? '...' : ''),
            type: 'leaf',
            description: obj
          }))
        },
        {
          id: 'concepts',
          label: 'Key Concepts',
          type: 'branch',
          color: 'bg-green-500',
          children: (data.overview?.coreConceptsList || []).slice(0, 4).map((concept: string, i: number) => ({
            id: `concept-${i}`,
            label: concept.substring(0, 30) + (concept.length > 30 ? '...' : ''),
            type: 'leaf',
            description: concept
          }))
        },
        {
          id: 'focus',
          label: 'Exam Focus',
          type: 'branch',
          color: 'bg-red-500',
          children: (
            // NEW format: mustKnow is array of objects
            data.summary?.mustKnow?.map((item: any) => item.concept || item) ||
            // OLD format: examFocus.mustKnow is array of strings
            data.summary?.examFocus?.mustKnow ||
            []
          ).slice(0, 3).map((item: string | any, i: number) => {
            const label = typeof item === 'string' ? item : item.concept;
            return {
              id: `focus-${i}`,
              label: label.substring(0, 30) + (label.length > 30 ? '...' : ''),
              type: 'leaf',
              description: typeof item === 'string' ? item : item.explanation
            };
          })
        }
      ]
    };
  };

  // Load lecture data
  const loadLectureData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📚 Loading lecture data for:', jobId);
      
      const response = await fetch(`/api/lectures/${jobId}`, { cache: 'no-cache' });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 404) {
          setError(errorData.error || 'This lecture has no content yet. Processing may still be in progress.');
          setLoading(false);
          return;
        }
        throw new Error(errorData.error || errorData.message || `Failed to fetch: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Raw API response:', result);

      // Handle the response format from the main API endpoint
      const responseData = result.data || result;

      if (!responseData.lecture?.data) {
        throw new Error('Invalid lecture data structure');
      }

      const lectureData = responseData.lecture.data;

      // Handle transcript format (can be object with text/segments or plain string)
      const transcriptText = typeof lectureData.transcript === 'object' && lectureData.transcript !== null
        ? lectureData.transcript.text
        : lectureData.transcript;

      console.log('📊 Lecture data loaded:', {
        title: lectureData.metadata?.title,
        questionsCount: lectureData.questions?.length,
        explanationsCount: lectureData.explanations?.length,
        hasOverview: !!lectureData.overview,
        hasSummary: !!lectureData.summary,
        hasTranscript: !!lectureData.transcript,
        transcriptType: typeof lectureData.transcript,
        transcriptIsObject: typeof lectureData.transcript === 'object',
        transcriptLength: transcriptText?.length || 0,
        segmentsCount: lectureData.transcript?.segments?.length || 0,
        transcriptPreview: transcriptText ? transcriptText.substring(0, 50) + '...' : 'null'
      });
      
      // Transform the API response to match our tab structure
      const transformedData = {
        metadata: {
          title: lectureData.metadata?.title || 'Untitled Lecture',
          difficulty: lectureData.metadata?.difficulty || 'intermediate',
          estimatedTime: lectureData.metadata?.estimatedTime || '30 minutes',
          subjectDomain: lectureData.metadata?.subjectDomain || 'General',
          examImportance: lectureData.metadata?.examImportance || 'medium'
        },
        overview: {
          mainTopic: lectureData.overview?.mainTopic || 'No overview available',
          keyObjectives: lectureData.overview?.keyObjectives || [],
          coreConceptsList: lectureData.overview?.coreConceptsList || []
        },
        questions: lectureData.questions || [],
        explanations: (lectureData.explanations || []).map((exp: any, index: number) => ({
          id: exp.id || `exp-${index}`,
          concept: exp.concept || exp.title || 'Concept',
          section: exp.section,  // Section grouping (from Grok)
          timestamps: exp.timestamps,  // Audio source timestamps (from Grok)
          importance: exp.importance || 'medium',

          // NEW SCHEMA - Priority (from OpenAI generateStudentDeskContent)
          introduction: exp.introduction,
          sections: exp.sections,

          // OLD SCHEMA - Fallback (for legacy data)
          explanation: exp.explanation || exp.content || '',
          keyPoints: exp.keyPoints || exp.examples || [],

          example: exp.example || undefined
        })),
        summary: {
          // NEW SCHEMA (from Grok) - Priority
          sections: lectureData.summary?.sections,
          mustKnow: lectureData.summary?.mustKnow,
          commonPitfalls: lectureData.summary?.commonPitfalls,
          // OLD SCHEMA - Fallback for legacy data
          essentialPoints: lectureData.summary?.essentialPoints,
          examFocus: lectureData.summary?.examFocus
        },
        engagement: {
          quizMetrics: {
            totalQuestions: lectureData.questions?.length || 0,
            totalPoints: lectureData.engagement?.quizMetrics?.totalPoints || 100,
            passingScore: lectureData.engagement?.quizMetrics?.passingScore || 70
          },
          achievements: lectureData.engagement?.achievements || []
        },
        // Transform data for secondary tabs
        transcript: lectureData.transcript || responseData.transcript || null,
        contentSummary: lectureData.contentSummary || {
          overview: lectureData.overview?.mainTopic ||
                   lectureData.summary?.sections?.[0]?.content ||
                   lectureData.summary?.essentialPoints?.[0],
          keyTakeaways: lectureData.summary?.sections?.map((s: any) => s.heading) ||
                       lectureData.summary?.essentialPoints || [],
          mainConcepts: (lectureData.explanations || []).slice(0, 5).map((exp: any) => ({
            title: exp.concept || exp.title || 'Concept',
            description: exp.explanation ? exp.explanation.substring(0, 200) + '...' : '',
            importance: exp.importance || 'medium'
          })),
          actionItems: lectureData.summary?.mustKnow?.map((item: any) => item.concept).slice(0, 5) ||
                      lectureData.summary?.examFocus?.mustKnow?.slice(0, 5) || [],
          prerequisites: lectureData.overview?.keyObjectives?.slice(0, 3),
          nextSteps: lectureData.summary?.studyPlan?.priorities || []
        },
        mindMap: lectureData.mindMap || generateMindMapFromData(lectureData)
      };
      
      console.log('✅ Transformed data:', transformedData);
      console.log('🔍 TRANSCRIPT DEBUG:', {
        hasTranscript: !!transformedData.transcript,
        transcriptType: typeof transformedData.transcript,
        transcriptLength: transformedData.transcript?.length || 0,
        transcriptSource: lectureData.transcript ? 'lectureData' : (responseData.transcript ? 'responseData' : 'none')
      });
      setLectureData(transformedData);
      
    } catch (err) {
      console.error('❌ Error loading lecture data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    loadLectureData();
  }, [loadLectureData]);

  // Handle scroll for navbar animation
  useEffect(() => {
    const handleScroll = () => {
      if (mainContentRef.current) {
        const scrolled = mainContentRef.current.scrollTop > 50;
        console.log('Scroll position:', mainContentRef.current.scrollTop, 'isScrolled:', scrolled);
        setIsScrolled(scrolled);
      }
    };

    const contentElement = mainContentRef.current;
    if (contentElement) {
      contentElement.addEventListener('scroll', handleScroll);
      handleScroll(); // Check initial state
      return () => contentElement.removeEventListener('scroll', handleScroll);
    }
  }, [lectureData]);

  // Preserve scroll position when switching tabs
  const handleTabChange = useCallback((newTabId: string) => {
    if (mainContentRef.current) {
      tabScrollPositions.current[activeTab] = mainContentRef.current.scrollTop;
    }

    setActiveTab(newTabId);

    setTimeout(() => {
      if (mainContentRef.current && tabScrollPositions.current[newTabId]) {
        mainContentRef.current.scrollTop = tabScrollPositions.current[newTabId];
      }
    }, 0);
  }, [activeTab]);

  // Handle seeking to specific time in audio from any tab
  const handleSeekToTime = useCallback((timeInSeconds: number) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.seekTo(timeInSeconds);
    }
  }, []);

  // Fetch tutor questions history
  const fetchTutorHistory = useCallback(async () => {
    try {
      setTutorHistoryLoading(true);
      const response = await fetch(`/api/lectures/${jobId}/tutor/questions`);

      if (!response.ok) {
        throw new Error('Failed to fetch tutor history');
      }

      const data = await response.json();
      const result = data.data || data;
      const questions = result.questions || [];

      setTutorQuestions(questions);
      console.log(`📚 Fetched ${questions.length} tutor questions`);
    } catch (error) {
      console.error('❌ Failed to fetch tutor history:', error);
    } finally {
      setTutorHistoryLoading(false);
    }
  }, [jobId]);

  // Handle AI Tutor explanation request
  const handleTutorExplain = useCallback(async (selectedText: string, tabName: string, sectionContext: string) => {
    try {
      setTutorLoading(true);
      setTutorSelectedText(selectedText);
      setTutorSheetOpen(true);
      setTutorExplanation(''); // Clear previous explanation
      setTutorFromHistory(false); // New question, not from history

      console.log('🙋 Requesting explanation for selected text:', {
        selectedTextLength: selectedText.length,
        tabName,
        contextLength: sectionContext.length
      });

      const response = await fetch(`/api/lectures/${jobId}/tutor/explain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedText,
          tabName,
          sectionContext
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate explanation');
      }

      const data = await response.json();
      console.log('✅ Explanation received:', data);

      // Handle wrapped response (createSuccessResponse wraps in data property)
      const result = data.data || data;

      setTutorExplanation(result.explanation || '');
      setTutorCreatedAt(result.createdAt);

      // Refresh history to include new question
      fetchTutorHistory();

    } catch (error) {
      console.error('❌ Failed to get explanation:', error);
      setTutorExplanation(
        'Sorry, I encountered an error while generating the explanation. Please try again.'
      );
    } finally {
      setTutorLoading(false);
    }
  }, [jobId, fetchTutorHistory]);

  // Close tutor sheet
  const handleTutorClose = useCallback(() => {
    setTutorSheetOpen(false);
    setTutorFromHistory(false); // Reset history flag
  }, []);

  // Open history drawer
  const handleOpenHistory = useCallback(() => {
    setTutorHistoryOpen(true);
    if (tutorQuestions.length === 0) {
      fetchTutorHistory();
    }
  }, [tutorQuestions.length, fetchTutorHistory]);

  // Select a question from history
  const handleSelectHistoryQuestion = useCallback((question: TutorQuestion) => {
    setTutorSelectedText(question.selected_text);
    setTutorExplanation(question.ai_explanation);
    setTutorCreatedAt(question.created_at);
    setTutorFromHistory(true); // Mark as from history
    setTutorSheetOpen(true);
    setTutorHistoryOpen(false); // Close history to show explanation
  }, []);

  // Go back to history from explanation
  const handleBackToHistory = useCallback(() => {
    setTutorSheetOpen(false); // Close explanation
    setTutorHistoryOpen(true); // Reopen history
  }, []);

  // Touch handlers for swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!e.touches || !e.touches[0]) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwipingHorizontally.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!e.touches || !e.touches[0]) return;
    if (!touchStartX.current || !touchStartY.current) return;
    
    const deltaX = Math.abs(e.touches[0].clientX - touchStartX.current);
    const deltaY = Math.abs(e.touches[0].clientY - touchStartY.current);
    
    if (deltaX > deltaY && deltaX > 10) {
      isSwipingHorizontally.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!e.changedTouches || !e.changedTouches[0]) return;
    if (!touchStartX.current || !isSwipingHorizontally.current) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX.current;
    
    if (Math.abs(deltaX) > swipeThreshold) {
      // Handle swipe for modes
      if (activeMode !== 'summary') {
        const modes = ['transcript', 'summary', 'mindmap'];
        const currentModeIndex = modes.findIndex(mode => mode === activeMode);
        let newModeIndex;
        
        if (deltaX > 0 && currentModeIndex > 0) {
          newModeIndex = currentModeIndex - 1;
        } else if (deltaX < 0 && currentModeIndex < modes.length - 1) {
          newModeIndex = currentModeIndex + 1;
        }
        
        if (newModeIndex !== undefined) {
          setActiveMode(modes[newModeIndex]);
        }
      } 
      // Handle swipe for main tabs only when Study Materials mode is active
      else if (activeMode === 'summary') {
        const tabs = ['overview', 'explanations', 'summary', 'questions', 'study-time', 'materials'];
        const currentIndex = tabs.findIndex(tab => tab === activeTab);
        let newIndex;
        
        if (deltaX > 0 && currentIndex > 0) {
          newIndex = currentIndex - 1;
        } else if (deltaX < 0 && currentIndex < tabs.length - 1) {
          newIndex = currentIndex + 1;
        }
        
        if (newIndex !== undefined) {
          handleTabChange(tabs[newIndex]);
        }
      }
    }
    
    touchStartX.current = 0;
    touchStartY.current = 0;
    isSwipingHorizontally.current = false;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center w-full max-w-full overflow-hidden">
        <div className="text-center px-4">
          <div className="w-8 h-8 border-2 border-black border-t-transparent animate-spin mx-auto mb-4"></div>
          <p className="text-gray-dark">Loading lecture content...</p>
          <p className="text-sm text-gray-medium mt-1">Job ID: {jobId}</p>
        </div>
      </div>
    );
  }

  if (error || !lectureData) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="text-gray-dark mb-4">
            <Settings className="w-12 h-12 mx-auto mb-3" />
            <p className="text-lg font-semibold">
              {error?.includes('no content') ? 'No Content Available' : 'Failed to Load Lecture'}
            </p>
          </div>
          <p className="text-gray-medium mb-4 text-sm">{error || 'Unable to load lecture data'}</p>
          <div className="space-y-3">
            {error?.includes('no content') && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <p className="text-blue-900 font-medium mb-1">Content is being generated</p>
                <p className="text-blue-700">This may take a few minutes. Please check back shortly.</p>
              </div>
            )}
            <div className="flex gap-2 justify-center">
              <Button onClick={loadLectureData} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
              <Button onClick={() => router.push('/dashboard/lectures')} variant="outline">
                Back to Lectures
              </Button>
            </div>
          </div>
          <p className="text-xs text-gray-medium mt-4">
            Job ID: {jobId}
          </p>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    // Handle mode-based content
    switch (activeMode) {
      case 'transcript':
        return <TranscriptTab transcript={lectureData.transcript} onSeekToTime={handleSeekToTime} onTutorExplain={handleTutorExplain} />;
      case 'mindmap':
        return <MindMapTab mindMapData={lectureData.mindMap} />;
      case 'summary':
        // When Study Materials mode is active, show main tab content
        switch (activeTab) {
          case 'overview':
            return <OverviewTab overview={lectureData.overview} metadata={lectureData.metadata} explanations={lectureData.explanations} onTutorExplain={handleTutorExplain} />;
          case 'questions':
            return <QuestionsTab questions={lectureData.questions} jobId={jobId} onSeekToTime={handleSeekToTime} />;
          case 'explanations':
            return <ExplanationsTab explanations={lectureData.explanations} itemType="concept" onSeekToTime={handleSeekToTime} onTutorExplain={handleTutorExplain} jobId={jobId} />;
          case 'summary':
            return <SummaryTab summary={lectureData.summary} onTutorExplain={handleTutorExplain} jobId={jobId} />;
          case 'study-time':
            return <StudyTimeTab engagement={lectureData.engagement} metadata={lectureData.metadata} />;
          case 'materials':
            return <MaterialsTab jobId={jobId} />;
          default:
            return <OverviewTab overview={lectureData.overview} metadata={lectureData.metadata} explanations={lectureData.explanations} onTutorExplain={handleTutorExplain} />;
        }
      default:
        return <ContentSummaryTab summary={lectureData.contentSummary} />;
    }
  };

  return (
    <div className="flex flex-col bg-white h-screen w-full max-w-full overflow-hidden">
      {/* Top App Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-light w-full overflow-hidden shrink-0">
        <div className="flex items-center px-4 h-14">
          <div className="flex items-center space-x-3 flex-1 min-w-0 overflow-hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-10 w-10 shrink-0 hover:bg-gray-lightest"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold truncate text-black">
                {lectureData.metadata.title}
              </h1>
              <div className="flex items-center gap-2 text-xs text-gray-medium">
                <span>{lectureData.metadata.difficulty}</span>
                <span>•</span>
                <span>{lectureData.metadata.estimatedTime}</span>
                <span>•</span>
                <span>{lectureData.metadata.subjectDomain}</span>
              </div>
            </div>

            {/* Share Button */}
            <div className="shrink-0">
              <ShareButton
                jobId={jobId}
                lectureTitle={lectureData.metadata.title}
                variant="icon"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Tab Strip - Only show when Study Materials mode is active */}
      {activeMode === 'summary' && (
        <div
          className="w-full border-b border-gray-light transition-all duration-300 ease-out shrink-0"
          style={{
            animation: 'slideInFromTop 300ms ease-out',
            transformOrigin: 'top'
          }}
        >
          <TabNavigation
            activeTabId={activeTab}
            onTabChange={handleTabChange}
          />
        </div>
      )}

      {/* Persistent Audio Player - Always visible when audio is available */}
      <PersistentAudioPlayer ref={audioPlayerRef} jobId={jobId} />

      {/* Custom keyframe animations */}
      <style jsx>{`
        @keyframes slideInFromTop {
          0% {
            opacity: 0;
            transform: translateY(-10px) scaleY(0.95);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scaleY(1);
          }
        }
        
        @keyframes slideOutToTop {
          0% {
            opacity: 1;
            transform: translateY(0) scaleY(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-10px) scaleY(0.95);
          }
        }
      `}</style>

      {/* Tab Content */}
      <div
        ref={mainContentRef}
        className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full transition-all duration-200 pb-32"
        style={{ overflowY: 'scroll', WebkitOverflowScrolling: 'touch' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onScroll={() => {
          if (mainContentRef.current) {
            const scrolled = mainContentRef.current.scrollTop > 50;
            console.log('INLINE Scroll position:', mainContentRef.current.scrollTop, 'isScrolled:', scrolled);
            setIsScrolled(scrolled);
          }
        }}
      >
        <div
          role="tabpanel"
          id={activeMode === 'summary' ? `tabpanel-${activeTab}` : `mode-panel-${activeMode}`}
          aria-labelledby={activeMode === 'summary' ? `tab-${activeTab}` : `segmented-${activeMode}`}
          className="min-h-full w-full max-w-full overflow-hidden animate-in fade-in-0 duration-200"
        >
          {renderTabContent()}
        </div>
      </div>

      {/* Segmented Control - Fixed at bottom, above nav */}
      <SegmentedControl
        activeOptionId={activeMode}
        onOptionChange={setActiveMode}
        isScrolled={true}
      />

      {/* AI Tutor Explanation Sheet */}
      <TutorExplanationSheet
        isOpen={tutorSheetOpen}
        onClose={handleTutorClose}
        selectedText={tutorSelectedText}
        explanation={tutorExplanation}
        createdAt={tutorCreatedAt}
        isLoading={tutorLoading}
        onBackToHistory={tutorFromHistory ? handleBackToHistory : undefined}
      />

      {/* Tutor History Drawer */}
      <TutorHistoryDrawer
        isOpen={tutorHistoryOpen}
        onClose={() => setTutorHistoryOpen(false)}
        questions={tutorQuestions}
        onSelectQuestion={handleSelectHistoryQuestion}
        isLoading={tutorHistoryLoading}
      />

      {/* Floating History Button - Below modals, above content */}
      {!tutorHistoryOpen && (
        <button
          onClick={handleOpenHistory}
          className="fixed bottom-24 right-4 md:bottom-8 md:right-8 w-14 h-14 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-50"
          aria-label="View tutor history"
        >
          <Hand className="w-6 h-6" />
          {tutorQuestions.length > 0 && (
            <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white">
              {tutorQuestions.length > 9 ? '9+' : tutorQuestions.length}
            </span>
          )}
        </button>
      )}

    </div>
  );
}