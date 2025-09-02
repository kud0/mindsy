"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TabNavigation } from './TabNavigation';
import { OverviewTab } from './tabs/OverviewTab';
import { QuestionsTab } from './tabs/QuestionsTab';
import { ExplanationsTab } from './tabs/ExplanationsTab';
import { SummaryTab } from './tabs/SummaryTab';
import { StudyTimeTab } from './tabs/StudyTimeTab';
import { MaterialsTab } from './tabs/MaterialsTab';

interface StudentDeskProps {
  jobId: string;
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
    essentialPoints: string[];
    examFocus: {
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
}


export default function StudentDesk({ jobId }: StudentDeskProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [lectureData, setLectureData] = useState<LectureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State preservation for each tab
  const tabScrollPositions = useRef<Record<string, number>>({});
  const mainContentRef = useRef<HTMLDivElement>(null);
  
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

  // Load lecture data
  const loadLectureData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📚 Loading lecture data for:', jobId);
      
      const response = await fetch(`/api/lectures/${jobId}/structured`, { cache: 'no-cache' });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Raw API response:', result);
      
      // Handle the response format from createSuccessResponse ({ data: ... })
      const responseData = result.data || result;
      
      if (!responseData.lecture) {
        throw new Error('Invalid lecture data structure');
      }
      
      // Transform the API response to match our tab structure
      const transformedData = {
        metadata: {
          title: responseData.lecture?.title || 'Untitled Lecture',
          difficulty: 'intermediate',
          estimatedTime: '30 minutes',
          subjectDomain: responseData.lecture?.metadata?.courseSubject || 'General',
          examImportance: 'medium'
        },
        overview: {
          mainTopic: stripHtml(responseData.lecture?.content?.overviewHtml) || 'No overview available',
          keyObjectives: responseData.lecture?.content?.keyPoints?.map((p: any) => 
            stripHtml(p.bodyHtml)
          ).filter(Boolean) || [],
          coreConceptsList: responseData.lecture?.content?.toc?.map((t: any) => t.label) || []
        },
        questions: responseData.lecture?.content?.questions || [],
        explanations: [], // Will be empty for now - can be parsed from explanationsHtml later
        summary: {
          essentialPoints: [], // Will be empty for now - can be parsed from summaryHtml later
          examFocus: {
            mustKnow: [],
            likelyQuestions: []
          }
        },
        engagement: {
          quizMetrics: {
            totalQuestions: responseData.lecture?.content?.questions?.length || 0,
            totalPoints: 100,
            passingScore: 70
          },
          achievements: []
        }
      };
      
      console.log('✅ Transformed data:', transformedData);
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
      const tabs = ['overview', 'questions', 'explanations', 'summary', 'study-time', 'materials'];
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
        <div className="text-center max-w-md">
          <div className="text-gray-dark mb-4">
            <Settings className="w-12 h-12 mx-auto mb-3" />
            <p className="text-lg font-semibold">Failed to Load Lecture</p>
          </div>
          <p className="text-gray-medium mb-4 text-sm">{error}</p>
          <div className="space-y-2">
            <Button onClick={loadLectureData} variant="outline" className="mr-2">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
            <Button onClick={() => router.back()} variant="outline">
              Go Back
            </Button>
          </div>
          <p className="text-xs text-gray-medium mt-3">
            Job ID: {jobId}
          </p>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab overview={lectureData.overview} metadata={lectureData.metadata} />;
      case 'questions':
        return <QuestionsTab questions={lectureData.questions} />;
      case 'explanations':
        return <ExplanationsTab explanations={lectureData.explanations} />;
      case 'summary':
        return <SummaryTab summary={lectureData.summary} />;
      case 'study-time':
        return <StudyTimeTab engagement={lectureData.engagement} metadata={lectureData.metadata} />;
      case 'materials':
        return <MaterialsTab jobId={jobId} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col bg-white min-h-full w-full max-w-full overflow-hidden">
      {/* Top App Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-light w-full overflow-hidden">
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
          </div>
        </div>
      </header>

      {/* Tab Strip */}
      <div className="w-full border-b border-gray-light">
        <TabNavigation
          activeTabId={activeTab}
          onTabChange={handleTabChange}
        />
      </div>

      {/* Tab Content */}
      <div 
        ref={mainContentRef}
        className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          role="tabpanel"
          id={`tabpanel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          className="min-h-full w-full max-w-full overflow-hidden"
        >
          {renderTabContent()}
        </div>
      </div>

    </div>
  );
}