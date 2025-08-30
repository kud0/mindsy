"use client"

import React from 'react';
import { 
  Home,
  FileAudio,
  GraduationCap,
  Timer,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PomodoroTimer } from '@/components/pomodoro/PomodoroTimer';

interface MainSidebarProps {
  user?: {
    name: string;
    email: string;
    avatar?: string;
    plan: 'free' | 'student';
  };
  folders?: Array<{
    id: string;
    name: string;
    count: number;
  }>;
}

export function MainSidebar({ user, folders }: MainSidebarProps) {
  const pathname = usePathname();
  
  // Suppress unused variable warning for now
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _folders = folders;

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
      icon: GraduationCap,
      label: 'Exam Center',
      path: '/dashboard/exams'
    },
    {
      icon: Timer,
      label: 'Pomodoro',
      path: '/dashboard/pomodoro'
    },
    {
      icon: Calendar,
      label: 'Schedule',
      path: '/dashboard/schedule'
    }
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === path;
    }
    return pathname.startsWith(path);
  };


  return (
    <div className="flex h-full w-64 flex-col bg-card border-r border-border">
      {/* Branding Section */}
      <div className="h-16 px-6 flex items-center border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">M</span>
          </div>
          <span className="font-semibold text-lg">Mindsy</span>
        </Link>
      </div>

      {/* Pomodoro Timer Widget */}
      <div className="border-b border-border">
        <div className="px-4 py-3">
          <PomodoroTimer />
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 px-4 py-4">
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <Link key={item.path} href={item.path}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start h-10 px-3",
                    active && "bg-accent"
                  )}
                >
                  <Icon className="h-4 w-4 mr-3" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>
      </div>

    </div>
  );
}