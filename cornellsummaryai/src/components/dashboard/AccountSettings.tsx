import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { 
  User, 
  Mail, 
  CreditCard, 
  Calendar, 
  Trash2, 
  Edit3,
  Clock,
  Crown,
  Shield,
  AlertTriangle,
  CheckCircle,
  Settings
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  plan: 'free' | 'student';
  minutesUsed: number;
  minutesLimit: number;
}

interface Profile {
  full_name?: string;
  course_name?: string;
  course_url?: string;
  subscription_tier?: string;
  subscription_period_end?: string;
  subscription_period_start?: string;
}

interface Usage {
  currentMonthUsage?: {
    totalMinutes: number;
    limit: {
      monthlyMinutes: number;
    };
  };
}

interface AccountSettingsProps {
  user: User;
}

export function AccountSettings({ user }: AccountSettingsProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    courseName: '',
    courseUrl: ''
  });
  const { toast } = useToast();

  // Load profile and usage data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load profile data
      const profileResponse = await fetch('/api/user/profile', {
        method: 'GET',
        credentials: 'include'
      });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setProfile(profileData.profile);
        setFormData({
          fullName: profileData.profile?.full_name || '',
          courseName: profileData.profile?.course_name || '',
          courseUrl: profileData.profile?.course_url || ''
        });
      }

      // Load usage data
      const usageResponse = await fetch('/api/user/usage', {
        method: 'GET',
        credentials: 'include'
      });

      if (usageResponse.ok) {
        const usageResult = await usageResponse.json();
        if (usageResult.success) {
          setUsage(usageResult.usage);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load account data. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSave = async () => {
    setSaving(true);
    try {
      // Create FormData to match the existing form submission pattern
      const formDataObj = new FormData();
      formDataObj.append('fullName', formData.fullName);
      formDataObj.append('courseName', formData.courseName);
      formDataObj.append('courseUrl', formData.courseUrl);

      // Use Supabase client for profile update
      const { supabase } = window as any;
      if (!supabase) {
        throw new Error('Supabase client not available');
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: formData.fullName,
          course_name: formData.courseName,
          course_url: formData.courseUrl,
          updated_at: new Date().toISOString(),
        })
        .select();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Profile updated successfully!'
      });

      // Reload profile data
      await loadData();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpgrade = async () => {
    try {
      // Create checkout session for Student tier
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tier: 'STUDENT',
          successUrl: window.location.origin + '/dashboard/new?success=true',
          cancelUrl: window.location.origin + '/dashboard/new?canceled=true',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: 'Error',
        description: 'Failed to start upgrade process. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleDowngrade = async () => {
    try {
      // Get current period end
      const periodEnd = profile?.subscription_period_end || 
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // Default to 30 days from now

      const response = await fetch('/api/user/downgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ periodEnd })
      });

      if (!response.ok) {
        throw new Error('Failed to downgrade subscription');
      }

      toast({
        title: 'Subscription Cancelled',
        description: "You'll keep Student benefits until your billing period ends."
      });

      // Reload data
      await loadData();
    } catch (error) {
      console.error('Error downgrading:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel subscription. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // Calculate effective plan and usage
  const effectivePlan = (() => {
    if (profile?.subscription_tier === 'student') return 'student';
    if (profile?.subscription_tier === 'free' && profile?.subscription_period_end) {
      const periodEnd = new Date(profile.subscription_period_end);
      if (periodEnd > new Date()) return 'student'; // Still in grace period
    }
    return 'free';
  })();

  const isInDowngradePeriod = profile?.subscription_tier === 'free' && 
                             profile?.subscription_period_end && 
                             new Date(profile.subscription_period_end) > new Date();

  const currentMinutes = usage?.currentMonthUsage?.totalMinutes || 0;
  const limitMinutes = usage?.currentMonthUsage?.limit?.monthlyMinutes || (effectivePlan === 'student' ? 1500 : 180);
  const usagePercentage = (currentMinutes / limitMinutes) * 100;

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}m`;
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-96 bg-gray-200 rounded"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3 mb-8">
        <Settings className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold text-foreground font-excalifont">Account Settings</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Management Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={user.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed. Contact support if needed.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="courseName">Course Name</Label>
              <Input
                id="courseName"
                placeholder="e.g., Computer Science 101"
                value={formData.courseName}
                onChange={(e) => setFormData(prev => ({ ...prev, courseName: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="courseUrl">Course URL</Label>
              <Input
                id="courseUrl"
                type="url"
                placeholder="https://..."
                value={formData.courseUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, courseUrl: e.target.value }))}
              />
            </div>

            <Button 
              onClick={handleProfileSave} 
              disabled={saving}
              className="w-full"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        {/* Subscription & Usage Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription & Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Plan */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {effectivePlan === 'student' ? (
                    <Crown className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <Shield className="h-5 w-5 text-gray-500" />
                  )}
                  <span className="font-medium">
                    {effectivePlan === 'student' ? 'Student' : 'Free'} Plan
                    {isInDowngradePeriod && (
                      <Badge variant="outline" className="ml-2">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Cancelled
                      </Badge>
                    )}
                  </span>
                </div>
                <Badge variant={effectivePlan === 'student' ? 'default' : 'secondary'}>
                  {effectivePlan === 'student' ? '€5/month' : '€0/month'}
                </Badge>
              </div>

              {isInDowngradePeriod && profile?.subscription_period_end && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <AlertTriangle className="h-4 w-4 inline mr-1" />
                    You'll keep Student benefits until{' '}
                    {new Date(profile.subscription_period_end).toLocaleDateString()}
                  </p>
                </div>
              )}

              {profile?.subscription_period_end && !isInDowngradePeriod && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Renews on {new Date(profile.subscription_period_end).toLocaleDateString()}
                </div>
              )}
            </div>

            <Separator />

            {/* Usage Stats */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Monthly Usage</span>
                <span className="text-sm text-muted-foreground">
                  {formatDuration(currentMinutes)} / {formatDuration(limitMinutes)}
                </span>
              </div>
              <Progress value={Math.min(usagePercentage, 100)} className="h-2" />
              {usagePercentage > 80 && (
                <p className="text-xs text-yellow-600">
                  <AlertTriangle className="h-3 w-3 inline mr-1" />
                  You're approaching your monthly limit
                </p>
              )}
            </div>

            <Separator />

            {/* Plan Features */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Plan Features</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                {effectivePlan === 'student' ? (
                  <>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      25 hours (1500 minutes) monthly
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      Up to 4 hours per file
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      TXT + MD + PDF formats
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      3 hours (180 minutes) monthly
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      PDF format only
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      2 summaries per month
                    </div>
                  </>
                )}
              </div>
            </div>

            <Separator />

            {/* Subscription Actions */}
            <div className="space-y-3">
              {effectivePlan === 'free' && !isInDowngradePeriod && (
                <Button onClick={handleUpgrade} className="w-full">
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Student Plan
                </Button>
              )}

              {effectivePlan === 'student' && profile?.subscription_tier === 'student' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      Cancel Subscription
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to cancel your subscription? You'll keep Student benefits 
                        until your current billing period expires, then you'll have access to Free plan features.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDowngrade}>
                        Yes, Cancel
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
              <h3 className="font-medium text-red-900 mb-2">Delete Account</h3>
              <p className="text-sm text-red-700 mb-4">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Account</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your account
                      and remove all your data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      className="bg-red-600 hover:bg-red-700"
                      onClick={() => {
                        toast({
                          title: 'Feature Not Available',
                          description: 'Account deletion is not yet implemented. Please contact support.',
                          variant: 'destructive'
                        });
                      }}
                    >
                      Delete Account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>

      <Toaster />
    </div>
  );
}