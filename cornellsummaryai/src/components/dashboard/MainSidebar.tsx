import React from 'react';
import { 
  FileText, 
  BookOpen,
  GraduationCap,
  Upload,
  Home,
  Plus,
  FileAudio
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { PomodoroTimer } from './PomodoroTimer';

interface Folder {
  id: string;
  name: string;
  count: number;
}

interface MainSidebarProps {
  user?: {
    name: string;
    email: string;
    avatar?: string;
    plan: 'free' | 'student';
  };
  currentPath: string;
  folders?: Folder[];
}

export function MainSidebar({ user, currentPath, folders = [] }: MainSidebarProps) {
  const handleNavigate = (path: string) => {
    window.location.href = path;
  };

  const menuItems = [
    {
      icon: Home,
      label: 'Dashboard',
      path: '/dashboard'
    },
    {
      icon: FileAudio,
      label: 'Lectures',
      path: '/dashboard/lectures'
    },
    {
      icon: BookOpen,
      label: 'Studies Organization',
      path: '/dashboard/studies'
    },
    {
      icon: GraduationCap,
      label: 'Exam Center',
      path: '/dashboard/exams'
    }
  ];

  const isActive = (path: string) => {
    return currentPath.startsWith(path);
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
        <div className="px-4 py-3">
          <PomodoroTimer 
            onExpand={() => window.location.href = '/dashboard/pomodoro'}
          />
        </div>
      </div>

      {/* Main Navigation */}
      <div className="px-4 py-4">
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
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

      <div className="flex-1" />

    </div>
  );
}