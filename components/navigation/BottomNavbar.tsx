"use client"

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  FileText, 
  Upload, 
  Calendar,
  User 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  key: string;
  label: string;
  icon: React.ElementType;
  href: string;
  paths: string[]; // Multiple paths that should show this item as active
}

const navItems: NavItem[] = [
  {
    key: 'hub',
    label: 'Hub',
    icon: Home,
    href: '/dashboard',
    paths: ['/dashboard']
  },
  {
    key: 'lecture',
    label: 'Lecture',
    icon: FileText,
    href: '/dashboard/lectures',
    paths: ['/dashboard/lectures']
  },
  {
    key: 'upload',
    label: 'Upload',
    icon: Upload,
    href: '/dashboard/upload',
    paths: ['/dashboard/upload']
  },
  {
    key: 'schedule',
    label: 'Schedule',
    icon: Calendar,
    href: '/dashboard/schedule',
    paths: ['/dashboard/schedule']
  },
  {
    key: 'profile',
    label: 'Me',
    icon: User,
    href: '/dashboard/profile',
    paths: ['/dashboard/profile', '/dashboard/account', '/dashboard/settings']
  }
];

export function BottomNavbar() {
  const pathname = usePathname();

  const isActive = (item: NavItem) => {
    // Exact match for hub/dashboard
    if (item.key === 'hub') {
      return pathname === '/dashboard';
    }
    
    // Check if current path starts with any of the item's paths
    return item.paths.some(path => {
      if (path === '/dashboard') {
        return pathname === path;
      }
      return pathname.startsWith(path);
    });
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 py-1 safe-area-pb">
      <div className="flex items-center justify-around w-full">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center min-w-0 flex-1 px-1 py-2 transition-colors duration-200",
                "hover:bg-gray-50 active:bg-gray-100",
                active && "bg-blue-50"
              )}
            >
              <div className={cn(
                "mb-1",
                active ? "text-blue-600" : "text-gray-600"
              )}>
                <Icon className="w-6 h-6" strokeWidth={active ? 2 : 1.5} />
              </div>
              <span className={cn(
                "text-xs font-medium truncate",
                active ? "text-blue-600" : "text-gray-600"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}