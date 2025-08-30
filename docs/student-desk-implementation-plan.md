# StudentDesk Implementation Plan

## Executive Summary
This document outlines the comprehensive plan to transform the StudentDesk component from a mock data prototype to a fully integrated study interface with Pomodoro time tracking, real-time API data, and intelligent navigation.

**Project Duration:** 9-13 days  
**Priority:** HIGH  
**Dependencies:** Existing API endpoints, PomodoroContext, Supabase database

---

## Table of Contents
1. [Phase 1: API Infrastructure](#phase-1-api-infrastructure-)
2. [Phase 2: Pomodoro Integration](#phase-2-pomodoro-integration-)
3. [Phase 3: Data Integration](#phase-3-data-integration-)
4. [Phase 4: Navigation System](#phase-4-navigation-system-)
5. [Phase 5: Audio Foundation](#phase-5-audio-foundation-)
6. [Phase 6: Testing & Polish](#phase-6-testing--polish-)
7. [Implementation Timeline](#implementation-timeline)
8. [Risk Mitigation](#risk-mitigation)
9. [Technical Specifications](#technical-specifications)

---

## Phase 1: API Infrastructure 🔧
*Refactor backend to use RESTful best practices with query parameters*

### Objective
Create a single, flexible API endpoint that replaces multiple scattered endpoints, following REST conventions and reducing API calls.

### Tasks

#### Task 1.1: Create Unified API Endpoint
**File:** `/app/api/lectures/[jobId]/route.ts` (NEW)

**Requirements:**
- Accept query parameters for flexible data retrieval
- Consolidate logic from existing endpoints
- Return structured response based on parameters
- Handle authentication and authorization

**Query Parameter Specification:**
```typescript
interface QueryParams {
  view?: 'structured' | 'raw' | 'summary';  // Data format
  include?: string;  // Comma-separated: 'navigation,stats,materials'
}
```

**Expected Response Structure:**
```typescript
interface LectureResponse {
  lecture: {
    id: string;
    title: string;
    content: {
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
    };
  };
  navigation?: {
    previous: { id: string; title: string } | null;
    next: { id: string; title: string } | null;
    position: { current: number; total: number };
  };
  stats?: {
    studyTime: number;
    sessions: number;
    lastAccessed: string;
  };
  materials?: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
    size: string;
  }>;
}
```

#### Task 1.2: Migrate Existing Endpoint Logic
**Source Files:**
- `/app/api/lectures/[jobId]/structured/route.ts`
- `/app/api/lectures/[jobId]/navigation/route.ts`

**Migration Steps:**
1. Extract data fetching functions into reusable modules
2. Implement query parameter parsing
3. Create response builders based on `include` parameters
4. Maintain backward compatibility during transition

#### Task 1.3: Clean Up and Documentation
**Actions:**
1. Delete deprecated endpoint files after verification
2. Update API documentation
3. Create migration guide for other components
4. Add comprehensive error handling

### Success Criteria
- [ ] Single endpoint handles all lecture data requests
- [ ] Response time < 500ms for typical request
- [ ] All query parameter combinations tested
- [ ] Zero breaking changes for existing features
- [ ] API documentation complete

---

## Phase 2: Pomodoro Integration 🍅
*Connect StudentDesk with PomodoroContext for intelligent time tracking*

### Objective
Enable automatic study time tracking when users view lectures during Pomodoro focus sessions, while maintaining unrestricted access without Pomodoro.

### Tasks

#### Task 2.1: Import and Setup PomodoroContext
**File:** `/components/student-desk/StudentDesk.tsx`

**Implementation:**
```typescript
// Add imports
import { usePomodoro } from '@/lib/contexts/PomodoroContext';

// Extract needed functions
const { 
  state,              // Pomodoro state
  setCurrentLecture,  // Register current lecture
  lectureQueue,       // Future: queue support
  currentQueueIndex   // Future: queue position
} = usePomodoro();
```

#### Task 2.2: Implement Conditional Registration

**Business Logic:**
```
IF (Pomodoro.isRunning AND Pomodoro.sessionType === 'focus')
  THEN register lecture for time tracking
ELSE 
  Allow access without tracking
```

**Implementation:**
```typescript
// Register on mount IF in focus
useEffect(() => {
  if (state.isRunning && state.sessionType === 'focus') {
    setCurrentLecture(jobId);
  }
  
  // Cleanup on unmount
  return () => {
    if (state.isRunning && state.sessionType === 'focus') {
      setCurrentLecture(null);
    }
  };
}, [jobId, state.isRunning, state.sessionType]);

// Handle Pomodoro state changes
useEffect(() => {
  // User might START focus while already in lecture
  if (state.isRunning && state.sessionType === 'focus') {
    setCurrentLecture(jobId);
  } else {
    setCurrentLecture(null);
  }
}, [state.isRunning, state.sessionType]);
```

#### Task 2.3: Study Time Tracking Flow

**Scenarios:**
1. **User browses without Pomodoro:** Full access, no time tracking
2. **User in focus session:** Automatic time allocation to current lecture
3. **User in break:** Can browse, but no time tracking
4. **Session type changes:** Update registration accordingly

### Success Criteria
- [ ] Time tracks ONLY during focus sessions
- [ ] Lecture fully accessible without Pomodoro
- [ ] Smooth transitions between session types
- [ ] No memory leaks on unmount
- [ ] Correct time allocation to lectures

---

## Phase 3: Data Integration 📊
*Replace mock data with real API calls and proper state management*

### Objective
Connect StudentDesk to production database through refactored API, displaying real lecture content with proper loading and error states.

### Tasks

#### Task 3.1: Remove Mock Data
**File:** `/components/student-desk/StudentDesk.tsx`

**Actions:**
1. Remove lines 75-141 (mockLectureData object)
2. Remove hardcoded demo content
3. Update TypeScript interfaces for real data

#### Task 3.2: Implement API Data Fetching

**Implementation:**
```typescript
const loadLectureData = async () => {
  try {
    setLoading(true);
    setError(null);
    
    const response = await fetch(
      `/api/lectures/${jobId}?view=structured&include=navigation,stats,materials`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to load lecture: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Update all state
    setLectureData(data.lecture);
    setNavigationData(data.navigation);
    setStudyStats(data.stats || { minutes: 0, sessions: 0 });
    
    // Initialize audio if present (but don't autoplay)
    if (data.lecture.audioUrl) {
      setAudioData({
        url: data.lecture.audioUrl,
        duration: data.lecture.audioDuration
      });
    }
    
  } catch (err) {
    console.error('Error loading lecture:', err);
    setError(err.message);
    toast.error('Failed to load lecture content');
  } finally {
    setLoading(false);
  }
};
```

#### Task 3.3: Loading and Error States

**Loading State:**
```typescript
if (loading) {
  return <StudentDeskSkeleton />;
}
```

**Error State:**
```typescript
if (error) {
  return (
    <ErrorBoundary 
      message={error}
      onRetry={loadLectureData}
    />
  );
}
```

### Success Criteria
- [ ] Real data displays correctly in all tabs
- [ ] Loading skeleton visible during fetch
- [ ] Errors handled with user-friendly messages
- [ ] Retry mechanism for failed requests
- [ ] No console errors in production

---

## Phase 4: Navigation System 🧭
*Implement smart navigation that adapts to single browse or queue mode*

### Objective
Create flexible navigation supporting both individual lecture browsing (date-based) and future queue mode (selection-based).

### Tasks

#### Task 4.1: Date-Based Navigation

**Implementation:**
```typescript
const navigateToLecture = async (targetJobId: string) => {
  try {
    setNavigating(true);
    
    // Update URL without page refresh
    window.history.pushState(null, '', `/dashboard/lectures/${targetJobId}`);
    
    // Update Pomodoro if in focus
    if (state.isRunning && state.sessionType === 'focus') {
      setCurrentLecture(targetJobId);
    }
    
    // Load new lecture data
    await loadLectureData(targetJobId);
    
  } catch (err) {
    toast.error('Failed to navigate to lecture');
  } finally {
    setNavigating(false);
  }
};
```

#### Task 4.2: Keyboard Navigation

**Implementation:**
```typescript
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    // Prevent when typing in inputs
    if (e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement) {
      return;
    }
    
    // Arrow navigation
    if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowLeft') {
      if (navigationData?.previous) {
        navigateToLecture(navigationData.previous.id);
      }
    }
    
    if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowRight') {
      if (navigationData?.next) {
        navigateToLecture(navigationData.next.id);
      }
    }
  };
  
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, [navigationData]);
```

#### Task 4.3: Queue Mode Preparation

**Future Queue Navigation Logic:**
```typescript
const getNavigationData = () => {
  // Future: Check if in queue mode
  if (pomodoroContext?.lectureQueue?.length > 0) {
    // Queue-based navigation
    const currentIndex = pomodoroContext.currentQueueIndex;
    return {
      previous: lectureQueue[currentIndex - 1] || null,
      next: lectureQueue[currentIndex + 1] || null,
      position: `${currentIndex + 1} of ${lectureQueue.length} in session`
    };
  } else {
    // Date-based navigation (default)
    return navigationDataFromAPI;
  }
};
```

### Success Criteria
- [ ] Smooth navigation between lectures
- [ ] Keyboard shortcuts functional (Cmd/Ctrl + Arrow keys)
- [ ] URL updates reflect current lecture
- [ ] Navigation state persists on refresh
- [ ] Position indicator shows correct information

---

## Phase 5: Audio Foundation 🎵
*Basic audio player setup with placeholder content*

### Objective
Create minimal audio infrastructure that can be expanded when audio storage solution is determined.

### Tasks

#### Task 5.1: Audio Player Component

**File:** `/components/student-desk/AudioPlayer.tsx` (NEW)

**Component Structure:**
```typescript
interface AudioPlayerProps {
  audioUrl?: string;
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  onTimeUpdate,
  onEnded
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // NO auto-play on mount
  // Load audio only when play is clicked
  
  return (
    <div className="audio-player">
      {/* Basic controls */}
    </div>
  );
};
```

#### Task 5.2: Integration Points

**Current Implementation (Hardcoded):**
```typescript
// Temporary until storage solution
const TEMP_AUDIO_URL = '/placeholder-audio/lecture.mp3';
```

**Future Implementation:**
- Signed URLs from Supabase Storage
- Timestamp synchronization
- Playback speed control
- Offline caching

### Success Criteria
- [ ] Audio plays only on user interaction
- [ ] Basic controls functional (play/pause/seek)
- [ ] No resource waste on page load
- [ ] Graceful fallback if audio unavailable

---

## Phase 6: Testing & Polish ✅
*Ensure production readiness with comprehensive testing*

### Objective
Verify all integrated features work correctly and provide smooth user experience across devices.

### Tasks

#### Task 6.1: Integration Test Scenarios

**Critical User Flows:**
1. **Browse without Pomodoro:**
   - Open lecture → Read content → Navigate → No time tracked

2. **Study with Pomodoro:**
   - Start focus → Open lecture → Time tracked → Switch lecture → Time transfers

3. **Session Transitions:**
   - Focus → Break → Focus → Verify correct time allocation

4. **Error Recovery:**
   - Network failure → Retry → Success
   - Invalid lecture ID → Error message → Navigate back

5. **Keyboard Navigation:**
   - Test all shortcuts across browsers

#### Task 6.2: Performance Optimization

**Metrics:**
- Initial load time < 2 seconds
- Tab switch < 100ms
- API response < 500ms
- Lighthouse score > 90

**Optimizations:**
```typescript
// Lazy load tab content
const TabContent = lazy(() => import(`./tabs/${activeTab}`));

// Debounce API calls
const debouncedSave = useMemo(
  () => debounce(saveProgress, 5000),
  []
);

// Memoize expensive computations
const processedQuestions = useMemo(
  () => processQuestions(lectureData.questions),
  [lectureData.questions]
);
```

#### Task 6.3: Accessibility Audit

**Requirements:**
- [ ] Screen reader announces tab changes
- [ ] All interactive elements keyboard accessible
- [ ] Proper ARIA labels and roles
- [ ] Focus management on navigation
- [ ] Color contrast ratios pass WCAG AA

### Success Criteria
- [ ] All test scenarios pass
- [ ] Performance metrics met
- [ ] Zero console errors
- [ ] Accessibility audit passed
- [ ] Cross-browser compatibility verified

---

## Implementation Timeline

| Phase | Duration | Dependencies | Priority | Start Date | End Date |
|-------|----------|--------------|----------|------------|----------|
| Phase 1: API Infrastructure | 2-3 days | None | HIGH | TBD | TBD |
| Phase 2: Pomodoro Integration | 1-2 days | None | HIGH | TBD | TBD |
| Phase 3: Data Integration | 2-3 days | Phase 1 | HIGH | TBD | TBD |
| Phase 4: Navigation System | 1-2 days | Phase 3 | MEDIUM | TBD | TBD |
| Phase 5: Audio Foundation | 1 day | None | LOW | TBD | TBD |
| Phase 6: Testing & Polish | 2 days | All phases | HIGH | TBD | TBD |

**Total Estimated Duration: 9-13 days**

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation Strategy |
|------|------------|--------|---------------------|
| API breaking changes | LOW | HIGH | Maintain old endpoints during migration period |
| Pomodoro sync issues | MEDIUM | MEDIUM | Implement fallback to manual time entry |
| Audio storage undefined | HIGH | LOW | Use placeholder implementation until decided |
| Performance degradation | MEDIUM | HIGH | Implement progressive loading and caching |
| Data inconsistency | LOW | HIGH | Add validation and error boundaries |

---

## Technical Specifications

### Database Tables Used
- `jobs` - Lecture content and metadata
- `study_sessions` - Time tracking records
- `pomodoro_sessions` - Pomodoro session data
- `study_nodes` - Folder organization

### API Endpoints
```
GET /api/lectures/[jobId]?view=structured&include=navigation,stats,materials
```

### State Management
- Local component state for UI
- PomodoroContext for time tracking
- URL state for navigation
- LocalStorage for preferences

### Performance Budget
- Bundle size: < 100KB for StudentDesk
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- API response time: < 500ms

---

## Definition of Done

### Phase Completion Criteria
- [ ] All tasks completed and tested
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] No regression in existing features
- [ ] Merged to main branch

### Project Completion Criteria
- [ ] All phases successfully deployed
- [ ] User acceptance testing passed
- [ ] Performance metrics met
- [ ] Documentation complete
- [ ] Knowledge transfer completed

---

## Future Enhancements (Out of Scope)

### Queue Mode
- Bulk lecture selection from /lectures page
- Sequential study with predefined order
- Progress tracking across queue
- Session statistics

### Advanced Audio Features
- Timestamp synchronization with content
- Transcript generation and display
- A-B repeat functionality
- Variable playback speed
- Offline download capability

### Study Analytics
- Time spent per section
- Question performance tracking
- Study pattern insights
- Spaced repetition recommendations
- Progress visualization

### Collaboration Features
- Shared study sessions
- Group Pomodoro sessions
- Lecture notes sharing
- Discussion threads

---

## Appendix

### Related Documentation
- [Pomodoro Integration Guide](./pomodoro-integration.md)
- [API Migration Guide](./api-migration.md)
- [Database Schema](./database-schema.md)

### Component Dependencies
```
StudentDesk
├── PomodoroContext
├── TabStrip
├── OverviewTab
├── QuestionsTab
├── ExplanationsTab
├── SummaryTab
├── StudyTimeTab
├── MaterialsTab
└── AudioPlayer (future)
```

### Contact Information
- Technical Lead: [TBD]
- Product Owner: [TBD]
- QA Lead: [TBD]

---

*Last Updated: [Current Date]*  
*Version: 1.0.0*  
*Status: Planning Phase*