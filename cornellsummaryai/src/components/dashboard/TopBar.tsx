import React, { useState } from 'react';
import { Search, Bell, ChevronDown, LogOut, Settings, User, PanelLeftClose } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GlobalSearch } from './GlobalSearch';
import { NotificationDropdown } from './NotificationDropdown';
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

  const handleNavigate = (path: string) => {
    if (path === '/logout') {
      window.location.href = '/api/auth/signout';
    } else {
      window.location.href = path;
    }
  };

  const handleSidebarToggle = () => {
    // Dispatch custom event that the Astro layout will listen to
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
          <GlobalSearch
            placeholder="Search notes, folders, or content..."
            onResultClick={(noteId) => {
              if (onNoteSelect) {
                onNoteSelect(noteId);
              } else {
                // Navigate to notes page with the note selected
                window.location.href = `/dashboard/notes?note=${noteId}`;
              }
            }}
          />
        </div>
      )}

      {/* Right section - User Profile */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <NotificationDropdown />

        {/* User Dropdown */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback className="bg-gray-100 dark:bg-gray-800">
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:flex items-center gap-2">
                  <span className="text-sm font-medium">{user.name}</span>
                  {user.plan && (
                    <Badge 
                      variant={user.plan === 'student' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {user.plan.toUpperCase()}
                    </Badge>
                  )}
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleNavigate('/dashboard/account')}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleNavigate('/dashboard/account')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleNavigate('/logout')}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}