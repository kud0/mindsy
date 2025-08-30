"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, Plus, FileAudio } from 'lucide-react';
import { UploadDialog } from './UploadDialog';

interface UploadWidgetProps {
  variant?: 'button' | 'card' | 'compact';
  className?: string;
  defaultTab?: 'audio' | 'link' | 'documents';
}

export default function UploadWidget({ variant = 'button', className, defaultTab = 'audio' }: UploadWidgetProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleUploadClick = () => {
    setDialogOpen(true);
  };

  if (variant === 'button') {
    return (
      <>
        <Button
          onClick={handleUploadClick}
          className={className}
        >
          <Upload className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Upload Lecture</span>
        </Button>
        <UploadDialog 
          open={dialogOpen} 
          onOpenChange={setDialogOpen}
          defaultTab={defaultTab}
        />
      </>
    );
  }

  if (variant === 'compact') {
    return (
      <>
        <Button
          onClick={handleUploadClick}
          variant="outline"
          size="sm"
          className={className}
        >
          <Plus className="w-4 h-4 mr-1" />
          Upload
        </Button>
        <UploadDialog 
          open={dialogOpen} 
          onOpenChange={setDialogOpen}
          defaultTab={defaultTab}
        />
      </>
    );
  }

  // Card variant
  return (
    <>
      <Card className={className}>
        <CardContent 
          className="p-6 cursor-pointer hover:bg-accent transition-colors"
          onClick={handleUploadClick}
        >
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-accent/40 rounded-full flex items-center justify-center mb-4">
              <FileAudio className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Upload New Lecture
            </h3>
            <p className="text-sm text-gray-600 dark:text-muted-foreground mb-4">
              Upload audio, links, or documents to generate Cornell-style notes
            </p>
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              Get Started
            </Button>
          </div>
        </CardContent>
      </Card>

      <UploadDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        defaultTab={defaultTab}
      />
    </>
  );
}