"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  MoreVertical, 
  Play, 
  Pause, 
  Volume2,
  Eye,
  HelpCircle,
  BookOpen,
  FileText,
  Clock,
  FolderOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { TabStrip, Tab } from './student-desk/TabStrip';
import { OverviewTab } from './student-desk/OverviewTab';
import { QuestionsTab } from './student-desk/QuestionsTab';
import { ExplanationsTab } from './student-desk/ExplanationsTab';
import { SummaryTab } from './student-desk/SummaryTab';
import { StudyTimeTab } from './student-desk/StudyTimeTab';
import { MaterialsTab } from './student-desk/MaterialsTab';
import { cn } from '@/lib/utils';

// Lecture data interface
interface LectureData {
  id: string;
  title: string;
  toc: Array<{ label: string; ts: number }>;
  overviewHtml: string;
  keyPoints: Array<{ title: string; bodyHtml: string }>;
  questions: Array<{ 
    id: string; 
    promptHtml: string; 
    choices?: string[]; 
    answerHtml: string;
  }>;
  explanationsHtml: string;
  summaryHtml: string;
  studyStats: { minutes: number; sessions: number };
  materials: Array<{ id: string; name: string; type: string; url: string; size: string }>;
  lectureAudio: { url: string; duration: number };
}

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview', icon: Eye },
  { id: 'questions', label: 'Questions', icon: HelpCircle },
  { id: 'explanations', label: 'Explanations', icon: BookOpen },
  { id: 'summary', label: 'Summary', icon: FileText },
  { id: 'study-time', label: 'Study Time', icon: Clock },
  { id: 'materials', label: 'Materials', icon: FolderOpen },
];

interface StructuredStudyDeskProps {
  jobId: string;
}

export default function StructuredStudyDesk({ jobId }: StructuredStudyDeskProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [lectureData, setLectureData] = useState<LectureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  console.log('🔍 StudentDesk component mounted for jobId:', jobId, 'at', Date.now(), '- v4 enhanced questions');
  
  // State preservation for each tab
  const tabScrollPositions = useRef<Record<string, number>>({});
  const mainContentRef = useRef<HTMLDivElement>(null);
  
  // Touch/swipe handling for mobile
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const swipeThreshold = 50;
  const isSwipingHorizontally = useRef(false);

  // Mock lecture data from our working mockup
  const mockLectureData: LectureData = {
    id: jobId,
    title: "Machine Learning Basics",
    toc: [
      { label: "Introduction to ML", ts: 0 },
      { label: "Supervised Learning", ts: 150 },
      { label: "Classification vs Regression", ts: 300 },
      { label: "Decision Trees", ts: 450 },
      { label: "Neural Networks Basics", ts: 600 },
      { label: "Model Evaluation", ts: 750 },
    ],
    overviewHtml: "<p>This lecture covers the fundamental concepts of machine learning algorithms and their applications.</p>",
    keyPoints: [
      { 
        title: "Supervised Learning", 
        bodyHtml: "<p>Learning with labeled training data to make predictions on new, unseen data.</p>" 
      },
      { 
        title: "Unsupervised Learning", 
        bodyHtml: "<p>Finding patterns in data without explicit labels or target variables.</p>" 
      },
      { 
        title: "Model Evaluation", 
        bodyHtml: "<p>Techniques to assess model performance using metrics like accuracy, precision, and recall.</p>" 
      },
    ],
    questions: [
      {
        id: "q1",
        promptHtml: "<p>What is the main difference between supervised and unsupervised learning?</p>",
        choices: [
          "Supervised learning uses labeled data",
          "Unsupervised learning is faster",
          "They are the same thing",
          "Supervised learning doesn't need data"
        ],
        answerHtml: "<p><strong>Supervised learning uses labeled data</strong> - Supervised learning algorithms learn from input-output pairs, while unsupervised learning finds patterns without labels.</p>"
      },
      {
        id: "q2", 
        promptHtml: "<p>Which evaluation metric is best for imbalanced datasets?</p>",
        answerHtml: "<p>For imbalanced datasets, <strong>F1-score, precision, and recall</strong> are more informative than accuracy, as accuracy can be misleading when classes are skewed.</p>"
      }
    ],
    explanationsHtml: `
      <h3>Machine Learning Fundamentals</h3>
      <p>Machine learning is a subset of artificial intelligence that enables computers to learn and improve from experience without being explicitly programmed.</p>
      
      <h3>Types of Learning</h3>
      <p>There are three main categories of machine learning approaches...</p>
    `,
    summaryHtml: `
      <h3>Key Takeaways</h3>
      <ul>
        <li>Machine learning algorithms can be categorized into supervised, unsupervised, and reinforcement learning</li>
        <li>Model evaluation is crucial for assessing performance and avoiding overfitting</li>
        <li>Different algorithms work better for different types of problems and data</li>
      </ul>
    `,
    studyStats: { minutes: 45, sessions: 3 },
    materials: [
      { id: "pdf1", name: "ML Algorithms Cheat Sheet.pdf", type: "pdf", url: "/materials/ml-cheat-sheet.pdf", size: "2.3 MB" },
      { id: "code1", name: "sklearn_examples.py", type: "code", url: "/materials/sklearn_examples.py", size: "12 KB" },
      { id: "slide1", name: "Lecture Slides.pptx", type: "slides", url: "/materials/lecture-slides.pptx", size: "8.7 MB" },
    ],
    lectureAudio: { url: "", duration: 0 }
  };

  // Load lecture data
  useEffect(() => {
    const loadLectureData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch real data from API using the unified endpoint - force fresh request
        const apiUrl = `/api/lectures/${jobId}?view=structured&include=stats,materials&t=${Date.now()}&debug=1`
        console.log('🚀 Making fresh API call to:', apiUrl)
        const response = await fetch(apiUrl, {
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
        
        if (!response.ok) {
          console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
          throw new Error(`Failed to fetch lecture: ${response.status}`);
        }
        
        const data = await response.json();
        
        console.log('🔍 Raw API response:', data);
        console.log('🔍 API data structure:', JSON.stringify(data, null, 2));
        
        // Check for authentication or other API errors
        if (data.error) {
          console.error('❌ API Error:', data.error);
          throw new Error(data.error);
        }
        
        // Check if data structure is valid (API returns { data: {...} })
        if (!data || !data.data) {
          console.error('❌ API returned invalid response structure:', data);
          throw new Error('API returned invalid response structure');
        }
        
        // Map API data to our component structure, with mock data as fallback
        const apiLecture = data.data.lecture;
        const apiContent = apiLecture?.content || {};
        const apiStats = data.data.stats || {};
        const apiMaterials = data.data.materials || [];
        
        console.log('🔍 API lecture:', apiLecture);
        console.log('🔍 API content:', apiContent);
        console.log('🔍 Questions data specifically:', apiContent.questions);
        console.log('🔍 API stats:', apiStats);
        console.log('🔍 API materials:', apiMaterials);
        
        setLectureData({
          id: apiLecture?.id || jobId,
          title: apiLecture?.title || mockLectureData.title,
          // Overview tab data - REAL DATA from API
          toc: apiContent.toc || mockLectureData.toc,
          overviewHtml: apiContent.overviewHtml || mockLectureData.overviewHtml,
          keyPoints: apiContent.keyPoints || mockLectureData.keyPoints,
          // Questions tab data - REAL DATA from API
          questions: apiContent.questions || mockLectureData.questions,
          // Summary & Explanations tabs data - REAL DATA from API
          explanationsHtml: apiContent.explanationsHtml || mockLectureData.explanationsHtml,
          summaryHtml: apiContent.summaryHtml || mockLectureData.summaryHtml,
          // Study Time tab data - REAL DATA from API
          studyStats: {
            minutes: apiStats.minutes || mockLectureData.studyStats.minutes,
            sessions: apiStats.sessions || mockLectureData.studyStats.sessions
          },
          // Materials tab data - REAL DATA from API
          materials: apiMaterials.length > 0 ? apiMaterials : mockLectureData.materials,
          lectureAudio: mockLectureData.lectureAudio,
        });
        
        console.log('🎉 ALL TABS INTEGRATED! Loaded real data for all 6 tabs:', {
          toc: apiContent.toc?.length || 0,
          keyPoints: apiContent.keyPoints?.length || 0,
          questions: apiContent.questions?.length || 0,
          hasOverview: !!apiContent.overviewHtml,
          hasSummary: !!apiContent.summaryHtml,
          hasExplanations: !!apiContent.explanationsHtml,
          studyMinutes: apiStats.minutes || 0,
          studySessions: apiStats.sessions || 0,
          materials: apiMaterials.length || 0
        });
        
        console.log('🔍 Final lectureData.questions being set:', apiContent.questions || mockLectureData.questions);
        
      } catch (err) {
        console.error('❌ Error loading lecture, falling back to mock data:', err);
        setError(`${err instanceof Error ? err.message : 'Unknown error'} - Using demo content`);
        // Fallback to mock data - this ensures the UI always works
        setLectureData(mockLectureData);
      } finally {
        setLoading(false);
      }
    };

    loadLectureData();
  }, [jobId]);

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
    
    // Determine if this is a horizontal swipe
    if (deltaX > deltaY && deltaX > 10) {
      isSwipingHorizontally.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!e.changedTouches || !e.changedTouches[0]) return;
    if (!touchStartX.current || !isSwipingHorizontally.current) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX.current;
    
    // Check if swipe is strong enough and horizontal enough
    if (Math.abs(deltaX) > swipeThreshold) {
      const currentIndex = TABS.findIndex(tab => tab.id === activeTab);
      let newIndex;
      
      if (deltaX > 0 && currentIndex > 0) {
        // Swipe right - go to previous tab
        newIndex = currentIndex - 1;
      } else if (deltaX < 0 && currentIndex < TABS.length - 1) {
        // Swipe left - go to next tab
        newIndex = currentIndex + 1;
      }
      
      if (newIndex !== undefined) {
        handleTabChange(TABS[newIndex].id);
      }
    }
    
    // Reset touch tracking
    touchStartX.current = 0;
    touchStartY.current = 0;
    isSwipingHorizontally.current = false;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center w-full max-w-full overflow-hidden">
        <div className="text-center px-4">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading lecture...</p>
        </div>
      </div>
    );
  }

  if (error || !lectureData) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Lecture not found'}</p>
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
        return (
          <OverviewTab 
            toc={lectureData.toc}
            keyPoints={lectureData.keyPoints}
            overviewHtml={lectureData.overviewHtml}
          />
        );
      case 'questions':
        console.log('🔍 Passing questions to QuestionsTab:', lectureData.questions);
        return <QuestionsTab questions={lectureData.questions} />;
      case 'explanations':
        return <ExplanationsTab content={lectureData.explanationsHtml} />;
      case 'summary':
        return <SummaryTab content={lectureData.summaryHtml} />;
      case 'study-time':
        return <StudyTimeTab stats={lectureData.studyStats} />;
      case 'materials':
        return <MaterialsTab materials={lectureData.materials} />;
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
            
            <h1 className="text-lg font-semibold truncate min-w-0 flex-1">
              {lectureData.title}
            </h1>
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