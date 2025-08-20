"use client"

import React from 'react';
import { 
  Home,
  FileAudio,
  GraduationCap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
// import { PomodoroTimer } from './PomodoroTimer';

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
    }
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === path;
    }
    return pathname.startsWith(path);
  };

  // const handlePomodoroExpand = () => {
  //   router.push('/dashboard/pomodoro');
  // };

  return (
    <div className="flex h-full w-64 flex-col bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800">
      {/* Branding Section */}
      <div className="h-16 px-6 flex items-center border-b border-gray-200 dark:border-gray-800">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-black dark:bg-white rounded-lg flex items-center justify-center">
            <span className="text-white dark:text-black font-bold text-lg">M</span>
          </div>
          <span className="font-semibold text-lg">Mindsy</span>
        </Link>
      </div>

      {/* Pomodoro Timer Widget */}
      {/* Uncomment when PomodoroTimer component is migrated */}
      {/* <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="px-4 py-3">
          <PomodoroTimer onExpand={handlePomodoroExpand} />
        </div>
      </div> */}

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
                    active && "bg-gray-100 dark:bg-gray-800"
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

      {/* User Info Section (Optional) */}
      {user && (
        <div className="border-t border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.plan} plan</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}