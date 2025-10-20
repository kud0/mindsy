"use client"

import React, { useEffect, useState } from 'react';
import { FileText, Upload, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BaseWidget } from './BaseWidget';
import { Badge } from '@/components/ui/badge';
import UploadWidget from '@/components/upload/UploadWidget';
import { UploadDialog } from '@/components/upload/UploadDialog';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface Lecture {
  job_id: string;
  lecture_title: string;
  status: string;
  created_at: string;
}

export function LecturesWidget() {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchRecentLectures();
  }, []);

  const fetchRecentLectures = async () => {
    try {
      const response = await fetch('/api/notes?limit=3');
      if (response.ok) {
        const data = await response.json();
        console.log('API Response:', data);
        console.log('Data structure:', data.data);
        console.log('Notes array:', data.data?.notes);
        setLectures(data.data?.notes || []);
      } else {
        console.error('API Error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch lectures:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return { icon: '✓', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' };
      case 'processing':
        return { icon: '⏱', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' };
      case 'failed':
        return { icon: '✗', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' };
      default:
        return { icon: '○', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-900/30' };
    }
  };

  const handleLectureClick = (jobId: string) => {
    router.push(`/dashboard/lectures/${jobId}`);
  };

  return (
    <>
      <BaseWidget
        title="Lectures"
        iconImage="/images/lecture.png"
        href="/dashboard/lectures"
        color="text-purple-600"
        bgColor="bg-purple-100"
        loading={loading}
        actions={
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setUploadOpen(true)}
          >
            <img
              src="/upload.png"
              alt="Upload"
              className="h-7 w-7 object-contain"
            />
          </Button>
        }
      >
        {lectures.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <img
              src="/images/lecture.png"
              alt="Lectures"
              className="w-12 h-12 opacity-50 mb-3 object-contain"
            />
            <p className="text-sm">No lectures yet</p>
            <p className="text-xs opacity-70 mt-1">Upload your first lecture to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lectures.slice(0, 3).map((lecture, index) => {
              const statusInfo = getStatusIcon(lecture.status);
              return (
                <div key={lecture.job_id}>
                  <div
                    className="flex items-start gap-3 hover:bg-muted/50 rounded-lg p-2 transition-all cursor-pointer group"
                    onClick={() => handleLectureClick(lecture.job_id)}
                  >
                    {/* Status Icon */}
                    <div
                      className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm transition-transform group-hover:scale-110",
                        statusInfo.bg,
                        statusInfo.color
                      )}
                    >
                      {statusInfo.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate leading-tight mb-1">
                        {lecture.lecture_title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {new Date(lecture.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                        <span>•</span>
                        <span className="capitalize">{lecture.status}</span>
                      </div>
                    </div>
                  </div>

                  {/* Divider between items (except last) */}
                  {index < Math.min(lectures.length, 3) - 1 && (
                    <div className="border-b border-border/50 my-2 ml-10"></div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </BaseWidget>
      
      {/* Upload Dialog */}
      <UploadDialog 
        open={uploadOpen} 
        onOpenChange={setUploadOpen}
        defaultTab="audio"
      />
    </>
  );
}