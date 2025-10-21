"use client"

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Upload,
  Search,
  BookOpen,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useScroll, useCommandBar } from '@/components/dashboard/DashboardWrapper';

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
    key: 'courses',
    label: 'Courses',
    icon: BookOpen,
    href: '/dashboard/courses',
    paths: ['/dashboard/courses']
  },
  {
    key: 'upload',
    label: 'Upload',
    icon: Upload,
    href: '/dashboard/upload',
    paths: ['/dashboard/upload']
  },
  {
    key: 'social',
    label: 'Social',
    icon: Users,
    href: '/dashboard/social',
    paths: ['/dashboard/social', '/dashboard/friends', '/dashboard/battles']
  },
  {
    key: 'search',
    label: 'Search',
    icon: Search,
    href: '/dashboard/search',
    paths: ['/dashboard/search']
  }
];

interface BottomNavbarProps {
  isScrolled?: boolean;
}

export function BottomNavbar({ isScrolled = false }: BottomNavbarProps) {
  const pathname = usePathname();
  const { openCommandBar } = useCommandBar();

  console.log('BottomNavbar isScrolled:', isScrolled);

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

  const hubItem = navItems[0];
  const middleItems = navItems.slice(1, 4); // Courses, Upload, Social
  const searchItem = navItems[4]; // Search

  return (
    <nav className={cn("fixed bottom-0 left-0 right-0 z-50 pb-4 px-4 pointer-events-none transition-all duration-300", isScrolled && "pb-3")}>
      <div className={cn("flex items-center mx-auto max-w-md transition-all duration-300", isScrolled ? "justify-between gap-3" : "justify-between gap-3")}>
        {/* Main navigation group */}
        <div className={cn("bg-white/5 dark:bg-white/8 backdrop-blur-2xl backdrop-saturate-150 rounded-full shadow-lg dark:shadow-2xl dark:shadow-black/40 pointer-events-auto transition-all duration-300", !isScrolled && "flex-1")}>
          <div className={cn("flex items-center justify-around", isScrolled ? "" : "px-1 py-1")}>
            {/* Hub - always visible */}
            <Link
              href={hubItem.href}
              className={cn(
                "flex flex-col items-center justify-center rounded-full transition-all duration-200",
                "hover:bg-accent/50 active:scale-95",
                isActive(hubItem) && "bg-accent",
                isScrolled ? "w-14 h-14" : "min-w-0 flex-1 px-2 py-1.5"
              )}
            >
              <div className={cn(
                "transition-colors duration-200",
                isActive(hubItem) ? "text-primary" : "text-muted-foreground"
              )}>
                <Home className={cn("transition-all duration-200", isScrolled ? "w-6 h-6" : "w-5 h-5")} strokeWidth={isActive(hubItem) ? 2.5 : 1.5} />
              </div>
              {!isScrolled && (
                <span className={cn(
                  "text-[9px] font-medium truncate mt-0.5",
                  isActive(hubItem) ? "text-primary" : "text-muted-foreground"
                )}>
                  Hub
                </span>
              )}
            </Link>

            {/* Middle items - hidden when scrolled */}
            {!isScrolled && middleItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center min-w-0 flex-1 px-2 py-1.5 rounded-full transition-all duration-200",
                    "hover:bg-accent/50 active:scale-95",
                    active && "bg-accent"
                  )}
                >
                  <div className={cn(
                    "transition-colors duration-200",
                    active ? "text-primary" : "text-muted-foreground"
                  )}>
                    <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.5} />
                  </div>
                  <span className={cn(
                    "text-[9px] font-medium truncate mt-0.5",
                    active ? "text-primary" : "text-muted-foreground"
                  )}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Search button - always visible */}
        <button
          onClick={openCommandBar}
          className={cn(
            "bg-white/5 dark:bg-white/8 backdrop-blur-2xl backdrop-saturate-150 rounded-full shadow-lg dark:shadow-2xl dark:shadow-black/40 pointer-events-auto",
            "flex items-center justify-center w-14 h-14 transition-all duration-200",
            "hover:bg-accent/50 active:scale-95"
          )}
          aria-label="Open search"
        >
          <Search
            className="w-6 h-6 text-muted-foreground transition-colors duration-200"
            strokeWidth={1.5}
          />
        </button>
      </div>
    </nav>
  );
}