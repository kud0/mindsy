"use client"

import React from 'react';
import { PenTool, Plus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BaseWidget } from './BaseWidget';
import { Badge } from '@/components/ui/badge';

export function EssayWidget() {
  // Mock data for now
  const recentEssays = [
    { id: 1, title: 'The Impact of AI on Education', words: 1500, status: 'draft' },
    { id: 2, title: 'Climate Change Solutions', words: 2200, status: 'completed' },
  ];

  return (
    <BaseWidget
      title="Essay Writer"
      icon={PenTool}
      href="/dashboard/essay"
      color="text-indigo-600 dark:text-indigo-400"
      bgColor="bg-indigo-100 dark:bg-indigo-900/30"
      actions={
        <Button 
          variant="ghost"
          size="icon"
          onClick={() => window.location.href = '/dashboard/essay'}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      }
    >
      {recentEssays.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <PenTool className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">No essays yet</p>
          <p className="text-xs text-muted-foreground mt-1">Start writing your first essay</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recentEssays.map((essay) => (
            <div 
              key={essay.id}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{essay.title}</p>
                  <p className="text-xs text-muted-foreground">{essay.words} words</p>
                </div>
              </div>
              <Badge variant={essay.status === 'completed' ? 'default' : 'secondary'}>
                {essay.status}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </BaseWidget>
  );
}