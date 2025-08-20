import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { PomodoroProvider } from '@/stores/pomodoro';
import { PomodoroTimer } from './PomodoroTimer';
import { 
  Home,
  Plus,
  History,
  Trophy,
  Target,
  BarChart3,
  BookOpen,
  Brain,
  Zap,
  GraduationCap,
  Timer,
  FileText,
  ChevronDown,
  User,
  Settings,
  Clock
} from 'lucide-react';

interface ExamSidebarProps {
  user: {
    name: string;
    email: string;
    avatar?: string;
    plan: 'free' | 'student';
  };
  onNavigate: (path: string) => void;
  activeSection?: string;
  userStats?: {
    totalExams: number;
    currentStreak: number;
    level: number;
    xpPoints: number;
  };
}

export function ExamSidebar({ 
  user,
  onNavigate, 
  activeSection = 'dashboard',
  userStats = { totalExams: 0, currentStreak: 0, level: 1, xpPoints: 0 }
}: ExamSidebarProps) {
  const handleNavigate = (path: string) => {
    onNavigate(path);
  };

  const globalMenuItems = [
    {
      icon: Home,
      label: 'Dashboard',
      path: '/dashboard'
    },
    {
      icon: FileText,
      label: 'All Notes',
      path: '/dashboard/notes'
    },
    {
      icon: BookOpen,
      label: 'Studies Organization',
      path: '/dashboard/studies'
    },
    {
      icon: GraduationCap,
      label: 'Exam Center',
      path: '/dashboard/exams',
      active: true
    }
  ];

  const examMenuItems = [
    {
      icon: Home,
      label: 'Center',
      path: '/dashboard/exams',
      section: 'dashboard'
    },
    {
      icon: BarChart3,
      label: 'Performance',
      path: '/dashboard/exams/performance',
      section: 'performance'
    },
    {
      icon: Trophy,
      label: 'Achievements',
      path: '/dashboard/exams/achievements',
      section: 'achievements'
    },
    {
      icon: Target,
      label: 'Study Goals',
      path: '/dashboard/exams/goals',
      section: 'goals'
    },
    {
      icon: BookOpen,
      label: 'Topics',
      path: '/dashboard/exams/topics',
      section: 'topics'
    }
  ];

  const isActive = (path: string, section?: string) => {
    if (section) {
      return activeSection === section;
    }
    return path === '/dashboard/exams';
  };

  return (
    <div className="flex h-full w-full flex-col bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800">
      {/* Branding Section */}
      <div className="h-16 px-6 flex items-center border-b border-gray-200 dark:border-gray-800">
        <a href="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-black dark:bg-white rounded-lg flex items-center justify-center">
            <span className="text-white dark:text-black font-bold text-lg">M</span>
          </div>
          <span className="font-semibold text-lg">Mindsy</span>
        </a>
      </div>

      {/* Pomodoro Timer */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <PomodoroProvider>
          <div className="px-4 py-3">
            <PomodoroTimer 
              onExpand={() => onNavigate('/dashboard/pomodoro')}
            />
          </div>
        </PomodoroProvider>
      </div>

      {/* Global Navigation */}
      <div className="px-4 py-4">
        <nav className="space-y-1">
          {globalMenuItems.map((item) => {
            const Icon = item.icon;
            const active = item.active || false;
            
            return (
              <Button
                key={item.path}
                variant="ghost"
                className={cn(
                  "w-full justify-start h-10 px-3",
                  active && "bg-gray-100 dark:bg-gray-800"
                )}
                onClick={() => handleNavigate(item.path)}
              >
                <Icon className={cn(
                  "h-4 w-4 mr-3",
                  active ? "text-gray-900 dark:text-gray-100" : "text-gray-500"
                )} />
                <span className={cn(
                  "text-sm",
                  active ? "text-gray-900 dark:text-gray-100 font-medium" : "text-gray-600 dark:text-gray-400"
                )}>
                  {item.label}
                </span>
              </Button>
            );
          })}
        </nav>
      </div>

      <Separator className="bg-gray-200 dark:bg-gray-800" />

      {/* Exam Center Actions */}
      <div className="px-4 py-4 space-y-2">
        <Button 
          className="w-full bg-black hover:bg-gray-800 text-white" 
          onClick={() => onNavigate('/dashboard/exams/new')}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Exam
        </Button>

        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => onNavigate('/dashboard/exams/history')}
        >
          <History className="h-4 w-4 mr-2" />
          Exam History
        </Button>
      </div>

      <Separator className="bg-gray-200 dark:border-gray-800" />

      {/* Exam Center Navigation */}
      <ScrollArea className="flex-1">
        <div className="px-4 py-4">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
            Exam Center
          </h3>
          <nav className="space-y-1">
            {examMenuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path, item.section);
              
              return (
                <Button
                  key={item.path}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start h-10 px-3",
                    active && "bg-gray-100 dark:bg-gray-800"
                  )}
                  onClick={() => handleNavigate(item.path)}
                >
                  <Icon className={cn(
                    "h-4 w-4 mr-3",
                    active ? "text-gray-900 dark:text-gray-100" : "text-gray-500"
                  )} />
                  <span className={cn(
                    "text-sm",
                    active ? "text-gray-900 dark:text-gray-100 font-medium" : "text-gray-600 dark:text-gray-400"
                  )}>
                    {item.label}
                  </span>
                </Button>
              );
            })}
          </nav>
        </div>
      </ScrollArea>
    </div>
  );
}