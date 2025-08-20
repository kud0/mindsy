import React from 'react';
import { 
  User, 
  CreditCard, 
  Shield, 
  Bell, 
  Palette, 
  Globe, 
  Database, 
  Key,
  Activity,
  HelpCircle,
  ChevronLeft,
  ChevronDown,
  LogOut
} from 'lucide-react';
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

interface AccountSidebarProps {
  user: {
    name: string;
    email: string;
    avatar?: string;
    plan: 'free' | 'student';
  };
  activeSection: string;
  onSectionChange: (section: string) => void;
  onNavigate: (path: string) => void;
}

const accountSections = [
  {
    id: 'profile',
    label: 'Profile',
    icon: User,
    description: 'Personal information'
  },
  {
    id: 'subscription',
    label: 'Subscription & Billing',
    icon: CreditCard,
    description: 'Manage your plan'
  },
  {
    id: 'preferences',
    label: 'Preferences',
    icon: Palette,
    description: 'Customize your experience'
  },
  {
    id: 'security',
    label: 'Security & Privacy',
    icon: Shield,
    description: 'Account security'
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    description: 'Email preferences',
    badge: 'Soon'
  },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: Key,
    description: 'Connected services',
    badge: 'Soon'
  },
  {
    id: 'data',
    label: 'Data & Export',
    icon: Database,
    description: 'Export your data',
    badge: 'Soon'
  },
  {
    id: 'activity',
    label: 'Activity Log',
    icon: Activity,
    description: 'Account activity',
    badge: 'Soon'
  }
];

export function AccountSidebar({
  user,
  activeSection,
  onSectionChange,
  onNavigate
}: AccountSidebarProps) {
  const getPlanColor = (plan: string) => {
    return plan === 'student' 
      ? 'bg-gradient-to-r from-green-500 to-teal-500'
      : 'bg-gray-500';
  };

  return (
    <div className="flex h-full w-full flex-col border-r bg-background">
      {/* Header */}
      <div className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar} />
                <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                </div>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
              <Badge className={cn("text-white flex-shrink-0", getPlanColor(user.plan))}>
                {user.plan.toUpperCase()}
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="start">
            <DropdownMenuItem onClick={() => onNavigate('notes')}>
              <User className="mr-2 h-4 w-4" />
              Back to Dashboard
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => {
              if ((window as any).supabase) {
                (window as any).supabase.auth.signOut();
                window.location.href = '/';
              }
            }}>
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Separator />

      {/* Navigation Sections */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-1">
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
            Account Settings
          </p>
          
          {accountSections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            const isDisabled = section.badge === 'Soon';
            
            return (
              <Button
                key={section.id}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  isDisabled && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => !isDisabled && onSectionChange(section.id)}
                disabled={isDisabled}
              >
                <Icon className="h-4 w-4 mr-3" />
                <span className="flex-1 text-left">{section.label}</span>
                {section.badge && (
                  <Badge variant="outline" className="ml-auto">
                    {section.badge}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
      </ScrollArea>

      <Separator />

      {/* Footer Actions */}
      <div className="p-4">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => window.open('https://docs.mysummary.app', '_blank')}
        >
          <HelpCircle className="h-4 w-4 mr-3" />
          Help & Support
        </Button>
      </div>
    </div>
  );
}