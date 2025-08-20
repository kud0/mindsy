"use client"

import React, { useState } from 'react';
import { Search, Bell, ChevronDown, LogOut, Settings, User, PanelLeftClose } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface TopBarProps {
  user?: {
    name: string;
    email: string;
    avatar?: string;
    plan?: 'free' | 'student';
  };
  onSearch?: (query: string) => void;
  onNoteSelect?: (noteId: string) => void;
  showSearch?: boolean;
  showSidebarToggle?: boolean;
}

export function TopBar({ user, onSearch, onNoteSelect, showSearch = true, showSidebarToggle = false }: TopBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleNavigate = (path: string) => {
    if (path === '/logout') {
      handleLogout();
    } else {
      router.push(path);
    }
  };

  const handleSidebarToggle = () => {
    // Dispatch custom event that the wrapper will listen to
    window.dispatchEvent(new Event('toggle-sidebar'));
  };

  return (
    <div className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-6 flex items-center justify-between">
      {/* Left section - Sidebar toggle button */}
      <div className="flex items-center">
        {showSidebarToggle && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleSidebarToggle}
            className="hidden lg:flex"
          >
            <PanelLeftClose className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Center section - Search */}
      {showSearch && (
        <div className="flex-1 max-w-2xl mx-4">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              ref={searchInputRef}
              type="search"
              placeholder="Search notes, folders, or content... (⌘K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4"
            />
          </form>
        </div>
      )}

      {/* Right section - User Profile */}
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {/* Notification badge */}
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs"></span>
        </Button>

        {/* User Dropdown */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 h-10 px-3">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback>
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden lg:flex flex-col items-start text-sm">
                  <span className="font-medium">{user.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {user.plan}
                  </Badge>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => handleNavigate('/dashboard/account')}>
                <User className="mr-2 h-4 w-4" />
                Account Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleNavigate('/dashboard/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Preferences
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleNavigate('/logout')} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}