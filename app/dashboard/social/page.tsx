'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Users, Bell, Share2, Swords } from 'lucide-react';
import { FriendsTab } from '@/components/social/FriendsTab';
import { SharedTab } from '@/components/social/SharedTab';
import { BattleHistoryTab } from '@/components/battles/BattleHistoryTab';
import { NotificationsTab } from '@/components/social/NotificationsTab';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';

export default function SocialHubPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as 'friends' | 'shared' | 'battles' | 'notifications' | null;

  const [activeTab, setActiveTab] = useState<'friends' | 'shared' | 'battles' | 'notifications'>(
    tabParam || 'friends'
  );

  // Update active tab when URL parameter changes
  useEffect(() => {
    if (tabParam && ['friends', 'shared', 'battles', 'notifications'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header with Notification Bell */}
      <DashboardHeader
        title="Social Hub"
        subtitle="Connect with classmates and share study materials"
      />

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-[73px] z-10">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex items-center gap-2 px-1 py-3 border-b-2 transition-colors ${
                activeTab === 'friends'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="font-medium">Friends</span>
            </button>

            <button
              onClick={() => setActiveTab('shared')}
              className={`flex items-center gap-2 px-1 py-3 border-b-2 transition-colors ${
                activeTab === 'shared'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Share2 className="w-5 h-5" />
              <span className="font-medium">Shared</span>
            </button>

            <button
              onClick={() => setActiveTab('battles')}
              className={`flex items-center gap-2 px-1 py-3 border-b-2 transition-colors ${
                activeTab === 'battles'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Swords className="w-5 h-5" />
              <span className="font-medium">Battles</span>
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center gap-2 px-1 py-3 border-b-2 transition-colors ${
                activeTab === 'notifications'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Bell className="w-5 h-5" />
              <span className="font-medium">Notifications</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === 'friends' && <FriendsTab />}
        {activeTab === 'shared' && <SharedTab />}
        {activeTab === 'battles' && <BattleHistoryTab />}
        {activeTab === 'notifications' && <NotificationsTab />}
      </div>
    </div>
  );
}
