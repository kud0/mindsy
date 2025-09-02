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
  FolderOpen,
  Settings,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TabStrip, Tab } from './student-desk/TabStrip';
import { OverviewTab } from './student-desk/OverviewTab';
import { MinimalOverviewTab } from './student-desk/MinimalOverviewTab';
import { InteractiveQuestionsTab } from './student-desk/InteractiveQuestionsTab';
import { ExplanationsTab } from './student-desk/ExplanationsTab';
import { MinimalExplanationsTab } from './student-desk/MinimalExplanationsTab';
import { SummaryTab } from './student-desk/SummaryTab';
import { MinimalSummaryTab } from './student-desk/MinimalSummaryTab';
import { StudyTimeTab } from './student-desk/StudyTimeTab';
import { MaterialsTab } from './student-desk/MaterialsTab';
import { mapFlexibleJsonToTabs } from '@/lib/flexible-data-mapper';

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview', icon: Eye },
  { id: 'questions', label: 'Questions', icon: HelpCircle },
  { id: 'explanations', label: 'Explanations', icon: BookOpen },
  { id: 'summary', label: 'Summary', icon: FileText },
  { id: 'study-time', label: 'Study Time', icon: Clock },
  { id: 'materials', label: 'Materials', icon: FolderOpen },
];

interface FlexibleStudentDeskProps {
  jsonFile: string;
}

export default function FlexibleStudentDesk({ jsonFile }: FlexibleStudentDeskProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [rawJsonData, setRawJsonData] = useState<any>(null);
  const [tabProps, setTabProps] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adaptationInfo, setAdaptationInfo] = useState<any>(null);
  
  console.log('🔍 FlexibleStudentDesk - Loading JSON file:', jsonFile);
  
  // State preservation for each tab
  const tabScrollPositions = useRef<Record<string, number>>({});
  const mainContentRef = useRef<HTMLDivElement>(null);
  
  // Touch/swipe handling for mobile
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const swipeThreshold = 50;
  const isSwipingHorizontally = useRef(false);

  // Load data from the dynamic endpoint
  const loadJsonFile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 Loading flexible JSON data from:', jsonFile);
      
      const response = await fetch(`/api/demo/lecture-data/${jsonFile}`, {
        cache: 'no-cache'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch: ${response.status}`);
      }
      
      const apiData = await response.json();
      console.log('✅ Flexible API response:', apiData);
      
      if (apiData.error) {
        throw new Error(apiData.error);
      }
      
      if (!apiData.data?.lecture?.data) {
        throw new Error('Invalid response structure');
      }
      
      const lectureData = apiData.data.lecture.data;
      const actualStats = apiData.data.stats;
      const actualMaterials = apiData.data.materials;
      const meta = apiData.data.meta;
      
      console.log('🎯 Flexible data loaded:', {
        sourceFile: jsonFile,
        title: lectureData.metadata.title,
        questionsCount: lectureData.questions.length,
        explanationsCount: lectureData.explanations.length,
        adapted: meta?.adaptedStructure
      });
      
      // Map to tab props using the flexible mapper
      const mappedProps = mapFlexibleJsonToTabs(lectureData, {
        actualStats,
        actualMaterials
      });
      
      setRawJsonData(lectureData);
      setTabProps(mappedProps);
      setAdaptationInfo(meta);
      
      console.log('🚀 All tabs mapped successfully from flexible JSON:', Object.keys(mappedProps));
      
    } catch (err) {
      console.error('❌ Error loading flexible data:', err);
      setError(`${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [jsonFile]);

  useEffect(() => {
    loadJsonFile();
  }, [loadJsonFile]);

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
          <p className="text-gray-600">Adapting JSON structure...</p>
          <p className="text-sm text-gray-500 mt-1">Loading {jsonFile}</p>
        </div>
      </div>
    );
  }

  if (error || !rawJsonData || !tabProps) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <Settings className="w-12 h-12 mx-auto mb-3" />
            <p className="text-lg font-semibold">Structure Adaptation Failed</p>
          </div>
          <p className="text-red-600 mb-4 text-sm">{error}</p>
          <div className="space-y-2">
            <Button onClick={() => loadJsonFile()} variant="outline" className="mr-2">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
            <Button onClick={() => router.back()} variant="outline">
              Go Back
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            File: {jsonFile}
          </p>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return jsonFile === 'sample-lecture-3.json' 
          ? <MinimalOverviewTab 
              overview={{
                mainTopic: rawJsonData.overview?.mainTopic || '',
                keyObjectives: rawJsonData.overview?.keyObjectives || [],
                coreConceptsList: rawJsonData.overview?.coreConceptsList || []
              }}
              metadata={{
                title: rawJsonData.metadata?.title || '',
                difficulty: rawJsonData.metadata?.difficulty || '',
                estimatedTime: rawJsonData.metadata?.estimatedTime || '',
                subjectDomain: rawJsonData.metadata?.subjectDomain || '',
                examImportance: rawJsonData.metadata?.examImportance || ''
              }}
            />
          : <OverviewTab {...tabProps.overview} />;
      case 'questions':
        return <InteractiveQuestionsTab {...tabProps.questions} />;
      case 'explanations':
        return jsonFile === 'sample-lecture-3.json' 
          ? <MinimalExplanationsTab explanations={rawJsonData.explanations || []} />
          : <ExplanationsTab {...tabProps.explanations} />;
      case 'summary':
        return jsonFile === 'sample-lecture-3.json' 
          ? <MinimalSummaryTab summary={rawJsonData.summary} />
          : <SummaryTab {...tabProps.summary} />;
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
              <div className="flex items-center gap-2 text-xs">
                <span className="text-green-600 font-medium">
                  🔄 Flexible JSON: {jsonFile}
                </span>
                {adaptationInfo?.adaptedStructure && (
                  <span className="text-blue-600">
                    ⚡ Structure Adapted
                  </span>
                )}
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/demo/student-desk')}
              className="h-8 w-8"
              title="Switch JSON files"
            >
              <Settings className="h-4 w-4" />
            </Button>
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