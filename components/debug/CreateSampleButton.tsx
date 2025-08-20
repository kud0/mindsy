"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { TestTube, Loader2 } from 'lucide-react';

export default function CreateSampleButton() {
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const createSample = async () => {
    try {
      setCreating(true);
      const response = await fetch('/api/debug/create-sample', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(`Sample lecture created: ${result.data.lecture_title}`);
        console.log('✅ Sample created:', result.data);
        
        // Optionally navigate to the created lecture
        if (result.data.url) {
          setTimeout(() => {
            router.push(result.data.url);
          }, 1000);
        }
      } else {
        throw new Error(result.error || 'Failed to create sample');
      }
    } catch (error) {
      console.error('❌ Error creating sample:', error);
      toast.error('Failed to create sample lecture');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Button
      onClick={createSample}
      disabled={creating}
      variant="outline"
      size="sm"
      className="gap-2 border-dashed"
    >
      {creating ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Creating...
        </>
      ) : (
        <>
          <TestTube className="w-4 h-4" />
          Create Sample Lecture
        </>
      )}
    </Button>
  );
}