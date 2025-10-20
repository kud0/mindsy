"use client";

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function DeleteAccountDialog() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Get current user email to verify
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Not authenticated');
        return;
      }

      if (email !== user.email) {
        toast.error('Email does not match your account');
        setIsDeleting(false);
        return;
      }

      const response = await fetch('/api/user/account', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }

      toast.success('Account deleted successfully');

      // Sign out and redirect
      await supabase.auth.signOut();
      router.push('/auth/login');
      router.refresh();
    } catch (error) {
      console.error('Account deletion error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete account');
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isDeleting) {
      setOpen(newOpen);
      if (!newOpen) {
        setEmail('');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          className="w-full md:w-auto h-12 text-base font-semibold rounded-lg min-h-[44px]"
        >
          Delete Account
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-destructive text-lg">Delete Account</DialogTitle>
              <DialogDescription className="text-sm">
                This action cannot be undone
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 md:p-4">
            <h4 className="font-semibold text-foreground mb-2 text-sm md:text-base">What will happen:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-1 flex-shrink-0">•</span>
                <span>All your lectures and study materials will be permanently deleted</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-1 flex-shrink-0">•</span>
                <span>Your courses and folders will be removed</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-1 flex-shrink-0">•</span>
                <span>Your profile and account data will be erased</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-1 flex-shrink-0">•</span>
                <span>Friend connections and shared content will be lost</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-1 flex-shrink-0">•</span>
                <span>This action is immediate and cannot be reversed</span>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-email" className="text-base">
              Type your email to confirm deletion
            </Label>
            <Input
              id="confirm-email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isDeleting}
              className="h-12 text-base rounded-lg"
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
            className="w-full sm:w-auto h-12 rounded-lg min-h-[44px] order-2 sm:order-1"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!email || isDeleting}
            className="w-full sm:w-auto h-12 text-base font-semibold rounded-lg min-h-[44px] order-1 sm:order-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete My Account'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
