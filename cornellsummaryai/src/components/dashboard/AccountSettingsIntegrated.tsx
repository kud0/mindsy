import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
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
import { 
  User, 
  Mail, 
  CreditCard, 
  Calendar, 
  Trash2,
  Crown,
  Shield,
  AlertTriangle,
  CheckCircle,
  Settings,
  Sparkles,
  TrendingUp,
  Clock,
  FileText,
  Download,
  Bell,
  Key,
  Globe,
  Palette,
  Zap,
  Database,
  Activity,
  ChevronRight,
  ExternalLink
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

interface AccountSettingsIntegratedProps {
  user: User;
  activeSection?: string;
  onSectionChange?: (section: string) => void;
  onNavigate?: (path: string) => void;
}

export function AccountSettingsIntegrated({ 
  user, 
  activeSection = 'profile',
  onSectionChange,
  onNavigate
}: AccountSettingsIntegratedProps) {
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
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
      const periodEnd = profile?.subscription_period_end || 
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

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

  const effectivePlan = (() => {
    if (profile?.subscription_tier === 'student') return 'student';
    if (profile?.subscription_tier === 'free' && profile?.subscription_period_end) {
      const periodEnd = new Date(profile.subscription_period_end);
      if (periodEnd > new Date()) return 'student';
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
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header with breadcrumb style */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button 
          onClick={() => onNavigate?.('notes')}
          className="hover:text-foreground cursor-pointer transition-colors"
        >
          Dashboard
        </button>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Account Settings</span>
      </div>

      {/* Page Title with Description */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight font-excalifont">Account Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile, subscription, and account preferences
        </p>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Current Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {effectivePlan === 'student' ? (
                  <>
                    <Crown className="h-5 w-5 text-yellow-500" />
                    <span className="text-2xl font-bold">Student</span>
                  </>
                ) : (
                  <>
                    <Shield className="h-5 w-5 text-gray-500" />
                    <span className="text-2xl font-bold">Free</span>
                  </>
                )}
              </div>
              <Badge variant={effectivePlan === 'student' ? 'default' : 'secondary'}>
                {effectivePlan === 'student' ? '€5/mo' : 'Free'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200 dark:border-purple-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Monthly Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{formatDuration(currentMinutes)}</span>
                <span className="text-sm text-muted-foreground">of {formatDuration(limitMinutes)}</span>
              </div>
              <Progress value={Math.min(usagePercentage, 100)} className="h-1.5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Account Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">Active</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Member since {new Date(profile?.subscription_period_start || Date.now()).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Based on Active Section */}
      <div className="space-y-6">
        {/* Profile Section */}
        {activeSection === 'profile' && (
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and course details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
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
              </div>

              <div className="flex justify-end">
                <Button onClick={handleProfileSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Subscription Section */}
        {activeSection === 'subscription' && (
          <Card>
            <CardHeader>
              <CardTitle>Subscription & Billing</CardTitle>
              <CardDescription>
                Manage your subscription plan and billing preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Plan Details */}
              <div className="p-6 rounded-lg border bg-gradient-to-r from-primary/5 to-primary/10">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {effectivePlan === 'student' ? (
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                          <Crown className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                        </div>
                      ) : (
                        <div className="p-2 bg-gray-100 dark:bg-gray-900 rounded-lg">
                          <Shield className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-xl font-semibold">
                          {effectivePlan === 'student' ? 'Student Plan' : 'Free Plan'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {effectivePlan === 'student' ? '€5 per month' : 'No charge'}
                        </p>
                      </div>
                    </div>

                    {isInDowngradePeriod && profile?.subscription_period_end && (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          <AlertTriangle className="h-4 w-4 inline mr-1" />
                          Subscription cancelled. You'll keep Student benefits until{' '}
                          <strong>{new Date(profile.subscription_period_end).toLocaleDateString()}</strong>
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <h4 className="font-medium">Plan Features</h4>
                      <div className="space-y-1">
                        {effectivePlan === 'student' ? (
                          <>
                            <div className="flex items-center gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span>25 hours (1500 minutes) monthly</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span>Up to 4 hours per file</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span>TXT + MD + PDF export formats</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span>Priority processing</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span>3 hours (180 minutes) monthly</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span>PDF export format</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span>2 summaries per month</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    {effectivePlan === 'free' && !isInDowngradePeriod && (
                      <Button onClick={handleUpgrade} size="lg" className="gap-2">
                        <Sparkles className="h-4 w-4" />
                        Upgrade to Student
                      </Button>
                    )}
                    {effectivePlan === 'student' && profile?.subscription_tier === 'student' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline">Cancel Subscription</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to cancel? You'll keep Student benefits until your billing period ends.
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
                </div>
              </div>

              {/* Usage Statistics */}
              <div className="space-y-4">
                <h4 className="font-medium">Usage This Month</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Minutes Used</span>
                    <span className="font-medium">
                      {formatDuration(currentMinutes)} / {formatDuration(limitMinutes)}
                    </span>
                  </div>
                  <Progress value={Math.min(usagePercentage, 100)} className="h-2" />
                  {usagePercentage > 80 && (
                    <p className="text-xs text-yellow-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      You're approaching your monthly limit
                    </p>
                  )}
                </div>
              </div>

              {/* Billing History */}
              <div className="space-y-4">
                <h4 className="font-medium">Billing History</h4>
                <div className="text-sm text-muted-foreground">
                  No billing history available
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Preferences Section */}
        {activeSection === 'preferences' && (
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>
                Customize your experience and notification settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {[
                  { icon: Bell, label: 'Email Notifications', description: 'Get notified when your summaries are ready' },
                  { icon: Palette, label: 'Dark Mode', description: 'Toggle between light and dark themes' },
                  { icon: Globe, label: 'Language', description: 'Choose your preferred language' },
                  { icon: FileText, label: 'Default Export Format', description: 'Set your preferred download format' },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    <Badge variant="outline">Coming Soon</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security Section */}
        {activeSection === 'security' && (
          <Card>
            <CardHeader>
              <CardTitle>Security & Privacy</CardTitle>
              <CardDescription>
                Manage your account security and data privacy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {[
                  { icon: Key, label: 'Two-Factor Authentication', description: 'Add an extra layer of security' },
                  { icon: Database, label: 'Data Export', description: 'Download all your data' },
                  { icon: Activity, label: 'Activity Log', description: 'View your recent account activity' },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    <Badge variant="outline">Coming Soon</Badge>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Danger Zone */}
              <div className="space-y-4">
                <h4 className="font-medium text-red-600">Danger Zone</h4>
                <div className="p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-950">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-red-900 dark:text-red-100">Delete Account</p>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                        Permanently delete your account and all associated data
                      </p>
                    </div>
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
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}