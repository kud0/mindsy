"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Bell, Clock, Users, Lock, AlertTriangle } from 'lucide-react';
import { DeleteAccountDialog } from './DeleteAccountDialog';

interface SettingsData {
  email_notifications: boolean;
  study_reminders: boolean;
  friend_notifications: boolean;
}

interface SettingsTabProps {
  settings: SettingsData;
  onUpdate: (settings: SettingsData) => void;
}

export function SettingsTab({ settings, onUpdate }: SettingsTabProps) {
  const [emailNotifications, setEmailNotifications] = useState(settings.email_notifications);
  const [studyReminders, setStudyReminders] = useState(settings.study_reminders);
  const [friendNotifications, setFriendNotifications] = useState(settings.friend_notifications);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const isDirty =
    emailNotifications !== settings.email_notifications ||
    studyReminders !== settings.study_reminders ||
    friendNotifications !== settings.friend_notifications;

  const handleSaveNotifications = async () => {
    setIsSavingNotifications(true);
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_notifications: emailNotifications,
          study_reminders: studyReminders,
          friend_notifications: friendNotifications,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update settings');
      }

      toast.success('Notification settings updated');
      onUpdate({
        email_notifications: emailNotifications,
        study_reminders: studyReminders,
        friend_notifications: friendNotifications,
      });
    } catch (error) {
      console.error('Settings update error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update settings');
    } finally {
      setIsSavingNotifications(false);
    }
  };

  const handleChangePassword = async () => {
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Password change error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Notification Preferences */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Notification Preferences</h3>
          <p className="text-sm text-muted-foreground">
            Choose how you want to be notified
          </p>
        </div>

        <div className="space-y-1 bg-card border rounded-lg overflow-hidden">
          {/* Email Notifications */}
          <div className="flex items-center justify-between py-4 px-4 border-b border-border min-h-[60px] active:bg-muted/50 transition-colors">
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-3 mb-1">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="email-notifications" className="text-base font-medium cursor-pointer">
                  Email Notifications
                </Label>
              </div>
              <p className="text-sm text-muted-foreground ml-7">
                Receive updates via email
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
              className="scale-110"
            />
          </div>

          {/* Study Reminders */}
          <div className="flex items-center justify-between py-4 px-4 border-b border-border min-h-[60px] active:bg-muted/50 transition-colors">
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-3 mb-1">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="study-reminders" className="text-base font-medium cursor-pointer">
                  Study Reminders
                </Label>
              </div>
              <p className="text-sm text-muted-foreground ml-7">
                Get reminded to review materials
              </p>
            </div>
            <Switch
              id="study-reminders"
              checked={studyReminders}
              onCheckedChange={setStudyReminders}
              className="scale-110"
            />
          </div>

          {/* Friend Notifications */}
          <div className="flex items-center justify-between py-4 px-4 min-h-[60px] active:bg-muted/50 transition-colors">
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-3 mb-1">
                <Users className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="friend-notifications" className="text-base font-medium cursor-pointer">
                  Friend Notifications
                </Label>
              </div>
              <p className="text-sm text-muted-foreground ml-7">
                Friend requests and social activity
              </p>
            </div>
            <Switch
              id="friend-notifications"
              checked={friendNotifications}
              onCheckedChange={setFriendNotifications}
              className="scale-110"
            />
          </div>
        </div>

        <Button
          onClick={handleSaveNotifications}
          disabled={!isDirty || isSavingNotifications}
          className="w-full md:w-auto h-12 text-base font-semibold rounded-lg min-h-[44px]"
        >
          {isSavingNotifications ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Notification Settings'
          )}
        </Button>
      </div>

      {/* Password Change */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Change Password
          </h3>
          <p className="text-sm text-muted-foreground">
            Update your password to keep your account secure
          </p>
        </div>

        <div className="space-y-4 bg-card border rounded-lg p-4 md:p-6">
          <div className="space-y-2">
            <Label htmlFor="current-password" className="text-base">Current Password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="h-12 text-base rounded-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-base">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 characters"
              className="h-12 text-base rounded-lg"
            />
            <p className="text-xs text-muted-foreground">
              At least 8 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-base">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="h-12 text-base rounded-lg"
            />
          </div>

          <Button
            onClick={handleChangePassword}
            disabled={isChangingPassword}
            className="w-full h-12 text-base font-semibold rounded-lg min-h-[44px]"
          >
            {isChangingPassword ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Changing Password...
              </>
            ) : (
              'Change Password'
            )}
          </Button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="space-y-4 pt-8 border-t">
        <div>
          <h3 className="text-lg font-semibold text-destructive flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Danger Zone
          </h3>
          <p className="text-sm text-muted-foreground">
            Irreversible and destructive actions
          </p>
        </div>

        <Card className="border-2 border-destructive/50 bg-destructive/5 p-4 md:p-6 rounded-lg">
          <div className="flex gap-4 flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <h4 className="font-semibold text-foreground text-base">Delete Account</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Permanently delete your account and all data. This cannot be undone.
              </p>
            </div>
            <div className="md:flex-shrink-0">
              <DeleteAccountDialog />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
