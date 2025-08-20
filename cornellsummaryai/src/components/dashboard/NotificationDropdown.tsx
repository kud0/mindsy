import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, XCircle, AlertTriangle, Info, MoreHorizontal, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { Notification } from '@/lib/types/notifications';
import { cn } from '@/lib/utils';

interface NotificationDropdownProps {
  className?: string;
}

const typeIcons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const typeColors = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-yellow-500',
  info: 'text-blue-500',
};

export function NotificationDropdown({ className }: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/notifications?limit=50');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.notifications?.filter((n: Notification) => !n.read).length || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
      });
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PUT',
      });
      
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        // Also update unread count if it was an unread notification
        setUnreadCount(prev => {
          const notification = notifications.find(n => n.id === notificationId);
          return notification && !notification.read ? Math.max(0, prev - 1) : prev;
        });
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    
    // Listen for new notifications from client-side events
    const handleNewNotification = () => {
      fetchNotifications();
    };
    
    window.addEventListener('new-notification', handleNewNotification);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('new-notification', handleNewNotification);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("relative", className)}>
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead}
                className="text-sm"
              >
                <Check className="w-4 h-4 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-96">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-gray-500">
              <Bell className="w-12 h-12 mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="p-2">
              {notifications.map((notification) => {
                const Icon = typeIcons[notification.type];
                const iconColor = typeColors[notification.type];
                
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50",
                      !notification.read && "bg-blue-50 dark:bg-blue-900/20"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <Icon className={cn("w-5 h-5 mt-0.5 flex-shrink-0", iconColor)} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h4 className={cn(
                          "font-medium text-sm",
                          !notification.read && "font-semibold"
                        )}>
                          {notification.title}
                        </h4>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {!notification.read && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}>
                                <Check className="w-4 h-4 mr-2" />
                                Mark as read
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      {notification.message && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {notification.message}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </span>
                        
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="p-3 border-t">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full"
              onClick={() => window.location.href = '/dashboard/notifications'}
            >
              View all notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}