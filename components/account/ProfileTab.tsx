"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Camera, Loader2 } from 'lucide-react';

interface ProfileData {
  id: string;
  email: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  subscription_tier: 'free' | 'student' | 'premium';
}

interface ProfileTabProps {
  profile: ProfileData;
  onUpdate: (profile: ProfileData) => void;
}

export function ProfileTab({ profile, onUpdate }: ProfileTabProps) {
  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const handleInputChange = (value: string, setter: (val: string) => void) => {
    setter(value);
    setIsDirty(true);
  };

  const handleSave = async () => {
    // Validation
    if (displayName.trim().length < 3) {
      toast.error('Display name must be at least 3 characters');
      return;
    }
    if (displayName.trim().length > 50) {
      toast.error('Display name must be less than 50 characters');
      return;
    }
    if (bio.length > 200) {
      toast.error('Bio must be less than 200 characters');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName.trim(),
          bio: bio.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      toast.success('Profile updated successfully');
      onUpdate(data.profile);
      setIsDirty(false);
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setDisplayName(profile.display_name || '');
    setBio(profile.bio || '');
    setIsDirty(false);
  };

  const getPlanBadgeColor = () => {
    switch (profile.subscription_tier) {
      case 'premium':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'student':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getPlanLabel = () => {
    switch (profile.subscription_tier) {
      case 'premium':
        return 'Premium';
      case 'student':
        return 'Student';
      default:
        return 'Free';
    }
  };

  const getInitials = (email: string) => {
    if (!email) return 'A';
    const parts = email.split('@')[0].split('.');
    if (parts.length > 1) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Avatar Section - Mobile Centered */}
      <div className="flex flex-col items-center gap-4 md:flex-row md:items-start">
        <div className="relative">
          <div className="w-24 h-24 md:h-20 md:w-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName || 'Avatar'}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{getInitials(profile.email)}</span>
            )}
          </div>
          <button
            className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full shadow-lg bg-primary hover:bg-primary/90 flex items-center justify-center transition-colors active:scale-95"
            title="Upload avatar (Coming Soon)"
            onClick={() => toast.info('Avatar upload coming soon!')}
          >
            <Camera className="h-5 w-5 text-primary-foreground" />
          </button>
        </div>
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-lg font-semibold text-foreground">Profile Picture</h3>
          <p className="text-sm text-muted-foreground">
            Click camera to upload (Coming Soon)
          </p>
        </div>
      </div>

      {/* Display Name */}
      <div className="space-y-2">
        <Label htmlFor="display-name" className="text-base">Display Name *</Label>
        <Input
          id="display-name"
          value={displayName}
          onChange={(e) => handleInputChange(e.target.value, setDisplayName)}
          placeholder="Enter your display name"
          className="h-12 text-base rounded-lg border-2 focus:border-primary"
          maxLength={50}
        />
        <p className="text-xs text-muted-foreground">
          {displayName.length}/50 characters
        </p>
      </div>

      {/* Email (Read-only) */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-base">Email</Label>
        <Input
          id="email"
          value={profile.email}
          disabled
          className="h-12 text-base rounded-lg bg-muted text-muted-foreground cursor-not-allowed"
        />
        <p className="text-xs text-muted-foreground">
          Email cannot be changed
        </p>
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label htmlFor="bio" className="text-base">Bio (Optional)</Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => handleInputChange(e.target.value, setBio)}
          placeholder="Tell us a bit about yourself..."
          className="min-h-[120px] text-base rounded-lg border-2 resize-none focus:border-primary"
          maxLength={200}
        />
        <p className="text-xs text-muted-foreground">
          {bio.length}/200 characters
        </p>
      </div>

      {/* Current Plan */}
      <div className="space-y-2">
        <Label className="text-base">Current Plan</Label>
        <div>
          <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getPlanBadgeColor()}`}>
            {getPlanLabel()}
          </span>
        </div>
      </div>

      {/* Action Buttons - Stack on mobile */}
      <div className="flex flex-col gap-3 md:flex-row pt-4">
        <Button
          onClick={handleSave}
          disabled={!isDirty || isLoading}
          className="w-full md:w-auto h-12 text-base font-semibold rounded-lg min-h-[44px]"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
        <Button
          variant="outline"
          onClick={handleCancel}
          disabled={!isDirty || isLoading}
          className="w-full md:w-auto h-12 rounded-lg min-h-[44px]"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
