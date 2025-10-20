"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ProfileTab } from '@/components/account/ProfileTab';
import { SettingsTab } from '@/components/account/SettingsTab';
import { AppearanceTab } from '@/components/account/AppearanceTab';
import { SubscriptionTab } from '@/components/account/SubscriptionTab';
import { Loader2, User, Settings, Palette, Crown, ArrowLeft } from 'lucide-react';

interface ProfileData {
  id: string;
  email: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  subscription_tier: 'free' | 'student' | 'premium';
  email_notifications: boolean;
  study_reminders: boolean;
  friend_notifications: boolean;
}

export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('Not authenticated');
        return;
      }

      // Fetch profile data
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      setProfile({
        id: data.id,
        email: data.email,
        display_name: data.display_name || data.full_name,
        bio: data.bio,
        avatar_url: data.avatar_url,
        subscription_tier: data.subscription_tier || 'free',
        email_notifications: data.email_notifications ?? true,
        study_reminders: data.study_reminders ?? true,
        friend_notifications: data.friend_notifications ?? true,
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = (updatedProfile: ProfileData) => {
    setProfile(updatedProfile);
  };

  const handleSettingsUpdate = (settings: {
    email_notifications: boolean;
    study_reminders: boolean;
    friend_notifications: boolean;
  }) => {
    if (profile) {
      setProfile({
        ...profile,
        ...settings,
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading your account...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
          <p className="text-destructive font-semibold">{error || 'Failed to load profile'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 md:px-6 md:py-4">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 md:h-9 md:w-9"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Account Settings</h1>
            <p className="text-sm text-muted-foreground hidden md:block">
              Manage your profile and preferences
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6 md:px-6 md:py-8 max-w-4xl mx-auto">
        {/* Tabs */}
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="w-full h-auto grid grid-cols-2 gap-1 md:inline-flex md:h-10 bg-muted p-1 rounded-lg mb-6">
            <TabsTrigger
              value="profile"
              className="py-3 px-4 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm min-h-[44px] flex items-center justify-center gap-2"
            >
              <User className="w-4 h-4" />
              <span>Profile</span>
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="py-3 px-4 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm min-h-[44px] flex items-center justify-center gap-2"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </TabsTrigger>
            <TabsTrigger
              value="appearance"
              className="py-3 px-4 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm min-h-[44px] flex items-center justify-center gap-2"
            >
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Appearance</span>
              <span className="sm:hidden">Theme</span>
            </TabsTrigger>
            <TabsTrigger
              value="subscription"
              className="py-3 px-4 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm min-h-[44px] flex items-center justify-center gap-2"
            >
              <Crown className="w-4 h-4" />
              <span className="hidden sm:inline">Subscription</span>
              <span className="sm:hidden">Plan</span>
            </TabsTrigger>
          </TabsList>

          <div className="bg-card border rounded-lg p-4 md:p-6">
            <TabsContent value="profile" className="mt-0">
              <ProfileTab profile={profile} onUpdate={handleProfileUpdate} />
            </TabsContent>

            <TabsContent value="settings" className="mt-0">
              <SettingsTab
                settings={{
                  email_notifications: profile.email_notifications,
                  study_reminders: profile.study_reminders,
                  friend_notifications: profile.friend_notifications,
                }}
                onUpdate={handleSettingsUpdate}
              />
            </TabsContent>

            <TabsContent value="appearance" className="mt-0">
              <AppearanceTab />
            </TabsContent>

            <TabsContent value="subscription" className="mt-0">
              <SubscriptionTab currentTier={profile.subscription_tier} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
