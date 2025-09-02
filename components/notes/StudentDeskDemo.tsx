"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Eye,
  HelpCircle,
  BookOpen,
  FileText,
  Clock,
  FolderOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TabStrip, Tab } from './student-desk/TabStrip';
import { OverviewTab } from './student-desk/OverviewTab';
import { QuestionsTab } from './student-desk/QuestionsTab';
import { ExplanationsTab } from './student-desk/ExplanationsTab';
import { SummaryTab } from './student-desk/SummaryTab';
import { StudyTimeTab } from './student-desk/StudyTimeTab';
import { MaterialsTab } from './student-desk/MaterialsTab';
import { mapLectureDataToTabs } from '@/lib/lecture-data-mapper';
import { LectureData } from '@/types/lecture-data';

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview', icon: Eye },
  { id: 'questions', label: 'Questions', icon: HelpCircle },
  { id: 'explanations', label: 'Explanations', icon: BookOpen },
  { id: 'summary', label: 'Summary', icon: FileText },
  { id: 'study-time', label: 'Study Time', icon: Clock },
  { id: 'materials', label: 'Materials', icon: FolderOpen },
];

export default function StudentDeskDemo() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [lectureData, setLectureData] = useState<LectureData | null>(null);
  const [tabProps, setTabProps] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  console.log('🔍 StudentDeskDemo - Loading your JSON structure directly');
  
  // State preservation for each tab
  const tabScrollPositions = useRef<Record<string, number>>({});
  const mainContentRef = useRef<HTMLDivElement>(null);
  
  // Touch/swipe handling for mobile
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const swipeThreshold = 50;
  const isSwipingHorizontally = useRef(false);

  // Load lecture data from the demo endpoint
  useEffect(() => {
    const loadDemoData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🚀 Loading demo lecture data from your JSON...');
        
        // Fetch from the demo API endpoint
        const response = await fetch('/api/demo/lecture-data', {
          cache: 'no-cache'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch demo data: ${response.status}`);
        }
        
        const apiData = await response.json();
        console.log('✅ Demo API response:', apiData);
        
        if (apiData.error) {
          throw new Error(apiData.error);
        }
        
        if (!apiData.data?.lecture?.data) {
          throw new Error('Invalid demo response structure');
        }
        
        const lectureData: LectureData = apiData.data.lecture.data;
        const actualStats = apiData.data.stats;
        const actualMaterials = apiData.data.materials;
        
        console.log('🎯 Demo data loaded:', {
          title: lectureData.metadata.title,
          questionsCount: lectureData.questions.length,
          explanationsCount: lectureData.explanations.length,
          hasStats: !!actualStats,
          materialsCount: actualMaterials?.length || 0
        });
        
        // Map to tab props using the new mapper
        const mappedProps = mapLectureDataToTabs(lectureData, {
          actualStats,
          actualMaterials
        });
        
        setLectureData(lectureData);
        setTabProps(mappedProps);
        
        console.log('🚀 All tabs mapped successfully from your JSON:', Object.keys(mappedProps));
        
      } catch (err) {
        console.error('❌ Error loading demo data:', err);
        setError(`${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    loadDemoData();
  }, []);

  // Preserve scroll position when switching tabs
  const handleTabChange = useCallback((newTabId: string) => {
    // Save current scroll position
    if (mainContentRef.current) {
      tabScrollPositions.current[activeTab] = mainContentRef.current.scrollTop;
    }
    
    setActiveTab(newTabId);
    
    // Restore scroll position for new tab
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
      const currentIndex = TABS.findIndex(tab => tab.id === activeTab);
      let newIndex;
      
      if (deltaX > 0 && currentIndex > 0) {
        newIndex = currentIndex - 1;
      } else if (deltaX < 0 && currentIndex < TABS.length - 1) {
        newIndex = currentIndex + 1;
      }
      
      if (newIndex !== undefined) {
        handleTabChange(TABS[newIndex].id);
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
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your JSON structure...</p>
        </div>
      </div>
    );
  }

  if (error || !lectureData || !tabProps) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Demo data not found'}</p>
          <Button onClick={() => router.back()} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab {...tabProps.overview} />;
      case 'questions':
        return <QuestionsTab {...tabProps.questions} />;
      case 'explanations':
        return <ExplanationsTab {...tabProps.explanations} />;
      case 'summary':
        return <SummaryTab {...tabProps.summary} />;
      case 'study-time':
        return <StudyTimeTab {...tabProps.studyTime} />;
      case 'materials':
        return <MaterialsTab {...tabProps.materials} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col bg-white min-h-full w-full max-w-full overflow-hidden">
      {/* Top App Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 w-full overflow-hidden">
        <div className="flex items-center px-4 h-14">
          <div className="flex items-center space-x-3 flex-1 min-w-0 overflow-hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-10 w-10 shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold truncate">
                {tabProps.title}
              </h1>
              <p className="text-xs text-green-600 font-medium">
                📄 Demo: Using your JSON structure
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Strip */}
      <div className="w-full">
        <TabStrip
          tabs={TABS}
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
};