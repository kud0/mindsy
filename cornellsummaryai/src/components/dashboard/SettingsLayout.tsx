import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  User,
  CreditCard,
  Bell,
  Shield,
  Palette,
  Globe,
  HelpCircle,
  LogOut,
  ChevronLeft,
  Settings,
  Key,
  FileText,
  Users,
  Activity,
  Database,
  Zap
} from 'lucide-react';

interface SettingsSection {
  id: string;
  label: string;
  icon: React.ElementType;
  description?: string;
  badge?: string;
}

const settingsSections: SettingsSection[] = [
  {
    id: 'profile',
    label: 'Profile',
    icon: User,
    description: 'Manage your personal information'
  },
  {
    id: 'subscription',
    label: 'Subscription & Billing',
    icon: CreditCard,
    description: 'Manage your plan and payment methods'
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    description: 'Configure email and push notifications',
    badge: 'Coming Soon'
  },
  {
    id: 'security',
    label: 'Security & Privacy',
    icon: Shield,
    description: 'Two-factor auth and privacy settings',
    badge: 'Coming Soon'
  },
  {
    id: 'appearance',
    label: 'Appearance',
    icon: Palette,
    description: 'Theme and display preferences',
    badge: 'Coming Soon'
  },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: Zap,
    description: 'Connect with other services',
    badge: 'Coming Soon'
  },
  {
    id: 'api',
    label: 'API & Webhooks',
    icon: Key,
    description: 'Developer settings and API keys',
    badge: 'Pro'
  },
  {
    id: 'data',
    label: 'Data Management',
    icon: Database,
    description: 'Export and manage your data'
  },
  {
    id: 'activity',
    label: 'Activity Log',
    icon: Activity,
    description: 'View your account activity',
    badge: 'Coming Soon'
  }
];

interface SettingsLayoutProps {
  children: React.ReactNode;
  activeSection?: string;
  onSectionChange?: (section: string) => void;
  onBackToDashboard?: () => void;
}

export function SettingsLayout({ 
  children, 
  activeSection = 'profile',
  onSectionChange,
  onBackToDashboard
}: SettingsLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  const handleSectionClick = (sectionId: string) => {
    // Skip if it's a coming soon or pro feature for now
    const section = settingsSections.find(s => s.id === sectionId);
    if (section?.badge && section.badge !== 'Pro') {
      return;
    }
    onSectionChange?.(sectionId);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className={cn(
        "border-r bg-card transition-all duration-300 flex flex-col",
        collapsed ? "w-16" : "w-72"
      )}>
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Settings className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">Settings</h2>
                  <p className="text-xs text-muted-foreground">Manage your account</p>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="ml-auto"
            >
              <ChevronLeft className={cn(
                "h-4 w-4 transition-transform",
                collapsed && "rotate-180"
              )} />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <div className="space-y-1">
            {settingsSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              const isDisabled = section.badge === 'Coming Soon';
              
              return (
                <Button
                  key={section.id}
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start relative",
                    collapsed && "justify-center",
                    isDisabled && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() => !isDisabled && handleSectionClick(section.id)}
                  disabled={isDisabled}
                >
                  <Icon className={cn(
                    "h-4 w-4",
                    !collapsed && "mr-3"
                  )} />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{section.label}</span>
                      {section.badge && (
                        <span className={cn(
                          "ml-auto text-xs px-1.5 py-0.5 rounded-full",
                          section.badge === 'Pro' 
                            ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {section.badge}
                        </span>
                      )}
                    </>
                  )}
                  {collapsed && section.badge && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                  )}
                </Button>
              );
            })}
          </div>

          {!collapsed && (
            <>
              <Separator className="my-4" />
              
              {/* Help & Support */}
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => window.open('https://docs.mysummary.app', '_blank')}
                >
                  <HelpCircle className="h-4 w-4 mr-3" />
                  <span className="flex-1 text-left">Help & Support</span>
                </Button>
                
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => onBackToDashboard?.()}
                >
                  <ChevronLeft className="h-4 w-4 mr-3" />
                  <span className="flex-1 text-left">Back to Dashboard</span>
                </Button>
              </div>
            </>
          )}
        </ScrollArea>

        {/* User section at bottom */}
        {!collapsed && (
          <div className="border-t p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-medium">
                {(window as any).userData?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {(window as any).userData?.name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {(window as any).userData?.email || 'user@example.com'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  // Sign out logic
                  if ((window as any).supabase) {
                    (window as any).supabase.auth.signOut();
                    window.location.href = '/';
                  }
                }}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="h-full">
          {children}
        </div>
      </div>
    </div>
  );
}