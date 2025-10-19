'use client';

import { NotificationBell } from '@/components/navigation/NotificationBell';

interface DashboardHeaderProps {
  title?: string;
  subtitle?: string;
  showNotifications?: boolean;
}

export function DashboardHeader({
  title,
  subtitle,
  showNotifications = true
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Title Section */}
          <div className="flex-1 min-w-0">
            {title && (
              <h1 className="text-2xl font-bold text-gray-900 truncate">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-sm text-gray-600 mt-1 truncate">
                {subtitle}
              </p>
            )}
          </div>

          {/* Actions Section */}
          {showNotifications && (
            <div className="flex items-center gap-3 ml-4">
              <NotificationBell />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
