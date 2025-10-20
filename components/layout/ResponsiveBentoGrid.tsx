"use client"

// ========================================
// 🎯 SOURCE OF TRUTH: Dashboard Homepage
// ========================================
// This component renders the main dashboard page (app/dashboard/page.tsx)
// It includes the bento grid layout with clean white background
// ========================================

import React, { useState, useEffect } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { Button } from '@/components/ui/button';
import { Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Import layout components
import { TopBar } from '@/components/layout/TopBar';

// Import widget components
import { ProfileWidget } from '@/components/widgets/ProfileWidget';
import { LecturesWidget } from '@/components/widgets/LecturesWidget';
import { ExamsWidget } from '@/components/widgets/ExamsWidget';
import { PomodoroWidget } from '@/components/widgets/PomodoroWidget';
import { ScheduleWidget } from '@/components/widgets/ScheduleWidget';
import { StatsWidget } from '@/components/widgets/StatsWidget';
import { SocialWidget } from '@/components/widgets/SocialWidget';
import { CoursesWidget } from '@/components/widgets/CoursesWidget';
import { TestWidget } from '@/components/widgets/TestWidget';
import { NinjaFactBox } from '@/components/daily-fact/NinjaFactBox';

// CSS imports for react-grid-layout
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

// Widget component mapping
const widgetComponents = {
  profile: ProfileWidget,
  lectures: LecturesWidget,
  social: SocialWidget,
  courses: CoursesWidget,
  exams: ExamsWidget,
  pomodoro: PomodoroWidget,
  schedule: ScheduleWidget,
  stats: StatsWidget,
};

// Default layouts for different breakpoints
const defaultLayouts = {
  lg: [
    // Upper row: Profile, Stats, Social (all 4w each)
    { i: 'profile', x: 0, y: 0, w: 4, h: 3 },
    { i: 'stats', x: 4, y: 0, w: 4, h: 3 },
    { i: 'social', x: 8, y: 0, w: 4, h: 3 },
    // Middle row: Lectures (small), My Courses, Pomodoro
    { i: 'lectures', x: 0, y: 3, w: 4, h: 3 },
    { i: 'courses', x: 4, y: 3, w: 4, h: 3 },
    { i: 'pomodoro', x: 8, y: 3, w: 4, h: 3 },
    // Lower row: Schedule (2/3 width - 8w) + Exams (1/3 width - 4w) SAME ROW
    { i: 'schedule', x: 0, y: 6, w: 8, h: 3 },
    { i: 'exams', x: 8, y: 6, w: 4, h: 3 },
  ],
  md: [
    // Row 1: Profile, Stats
    { i: 'profile', x: 0, y: 0, w: 4, h: 3 },
    { i: 'stats', x: 4, y: 0, w: 4, h: 3 },
    // Row 2: Social, Lectures
    { i: 'social', x: 0, y: 3, w: 4, h: 3 },
    { i: 'lectures', x: 4, y: 3, w: 4, h: 3 },
    // Row 3: Courses, Pomodoro
    { i: 'courses', x: 0, y: 6, w: 4, h: 3 },
    { i: 'pomodoro', x: 4, y: 6, w: 4, h: 3 },
    // Row 4: Schedule (FULL WIDTH - 8w)
    { i: 'schedule', x: 0, y: 9, w: 8, h: 3 },
    // Row 5: Exams
    { i: 'exams', x: 0, y: 12, w: 4, h: 3 },
  ],
  sm: [
    // Mobile: Stack vertically (exact order requested)
    { i: 'profile', x: 0, y: 0, w: 6, h: 3 },
    { i: 'stats', x: 0, y: 3, w: 6, h: 3 },
    { i: 'social', x: 0, y: 6, w: 6, h: 3 },
    { i: 'lectures', x: 0, y: 9, w: 6, h: 3 },
    { i: 'courses', x: 0, y: 12, w: 6, h: 3 },
    { i: 'pomodoro', x: 0, y: 15, w: 6, h: 3 },
    { i: 'schedule', x: 0, y: 18, w: 6, h: 3 },
    { i: 'exams', x: 0, y: 21, w: 6, h: 3 },
  ],
  xs: [
    // Mobile: Stack vertically (exact order requested)
    { i: 'profile', x: 0, y: 0, w: 4, h: 3 },
    { i: 'stats', x: 0, y: 3, w: 4, h: 3 },
    { i: 'social', x: 0, y: 6, w: 4, h: 3 },
    { i: 'lectures', x: 0, y: 9, w: 4, h: 3 },
    { i: 'courses', x: 0, y: 12, w: 4, h: 3 },
    { i: 'pomodoro', x: 0, y: 15, w: 4, h: 3 },
    { i: 'schedule', x: 0, y: 18, w: 4, h: 3 },
    { i: 'exams', x: 0, y: 21, w: 4, h: 3 },
  ],
};

export function ResponsiveBentoGrid() {
  const [layouts, setLayouts] = useState(defaultLayouts);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentBreakpoint, setCurrentBreakpoint] = useState('lg');
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Reset layouts to use new defaults
    setLayouts(defaultLayouts);
    localStorage.removeItem('responsiveBentoLayouts');
    localStorage.removeItem('bentoGridLayout');
  }, []);

  const handleLayoutChange = (currentLayout: any, allLayouts: any) => {
    setLayouts(allLayouts);
    // Only save after drag is complete
    if (!isDragging) {
      localStorage.setItem('responsiveBentoLayouts', JSON.stringify(allLayouts));
    }
  };

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragStop = (layout: any, oldItem: any, newItem: any, placeholder: any, e: any, element: any) => {
    setIsDragging(false);
    
    // Find if we're dropping on another widget
    const collidingItem = layout.find((item: any) => 
      item.i !== newItem.i &&
      // Check if items overlap
      !(item.x + item.w <= newItem.x ||
        item.x >= newItem.x + newItem.w ||
        item.y + item.h <= newItem.y ||
        item.y >= newItem.y + newItem.h)
    );
    
    if (collidingItem) {
      // Swap positions
      const currentLayouts = { ...layouts };
      const currentBreakpointLayout = currentLayouts[currentBreakpoint as keyof typeof currentLayouts];
      
      const updatedLayout = currentBreakpointLayout.map((item: any) => {
        if (item.i === collidingItem.i) {
          // Move the colliding item to the old position
          return { ...item, x: oldItem.x, y: oldItem.y };
        }
        if (item.i === newItem.i) {
          // Keep the dragged item at the new position
          return { ...item, x: newItem.x, y: newItem.y };
        }
        return item;
      });
      
      currentLayouts[currentBreakpoint as keyof typeof currentLayouts] = updatedLayout;
      setLayouts(currentLayouts);
      localStorage.setItem('responsiveBentoLayouts', JSON.stringify(currentLayouts));
    } else {
      // Normal drop in empty space - save the layout
      localStorage.setItem('responsiveBentoLayouts', JSON.stringify(layouts));
    }
  };

  const handleBreakpointChange = (breakpoint: string) => {
    setCurrentBreakpoint(breakpoint);
  };

  const toggleCustomize = () => {
    setIsCustomizing(!isCustomizing);
  };

  const resetLayouts = () => {
    setLayouts(defaultLayouts);
    localStorage.removeItem('responsiveBentoLayouts');
    localStorage.removeItem('bentoGridLayout'); // Also clear any old layout data
  };

  if (!mounted) {
    return (
      <>
        <TopBar />
        <div className="container mx-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-64 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar />
      <div className="max-w-6xl mx-auto p-6 pt-6">

      {/* Responsive Grid Layout */}
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        onLayoutChange={handleLayoutChange}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        onBreakpointChange={handleBreakpointChange}
        breakpoints={{ lg: 900, md: 768, sm: 640, xs: 480 }}
        cols={{ lg: 12, md: 8, sm: 6, xs: 4 }}
        rowHeight={100}
        isDraggable={isCustomizing}
        isResizable={false}
        compactType={null}
        preventCollision={true}
        margin={[24, 24]}
        containerPadding={[0, 0]}
      >
        {Object.entries(widgetComponents).map(([key, Component]) => (
          <div 
            key={key}
            className={cn(
              "rounded-xl",
              isCustomizing && "cursor-move"
            )}
          >
            {isCustomizing && (
              <div className="absolute top-2 left-2 z-10">
                <div className="w-8 h-1 bg-white/50 rounded-full mb-1" />
                <div className="w-8 h-1 bg-white/50 rounded-full" />
              </div>
            )}
            <Component />
          </div>
        ))}
      </ResponsiveGridLayout>

      {/* Bottom Center Customize Button */}
      <div className="flex justify-center items-center mt-6 gap-2">
        {isCustomizing && (
          <Button variant="outline" size="sm" onClick={resetLayouts}>
            Reset Layout
          </Button>
        )}
        <Button
          variant={isCustomizing ? "default" : "outline"}
          size="sm"
          onClick={toggleCustomize}
          className="gap-2"
        >
          <Settings2 className="h-4 w-4" />
          {isCustomizing ? 'Done' : 'Customize'}
        </Button>
      </div>

      {/* Daily Study Fact - Ninja Assistant */}
      <NinjaFactBox />
    </div>
    </>
  );
}