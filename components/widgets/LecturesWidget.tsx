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
      const response = await fetch('/api/notes?limit=6');
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

  const getStatusDot = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-400';
      case 'processing':
        return 'bg-blue-400 animate-pulse';
      case 'failed':
        return 'bg-red-400';
      default:
        return 'bg-gray-400';
    }
  };

  const handleLectureClick = (jobId: string) => {
    router.push(`/dashboard/lectures/${jobId}`);
  };

  return (
    <>
      <BaseWidget
        title="Lectures"
        icon={FileText}
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
            <FileText className="h-12 w-12 opacity-50 mb-3" />
            <p className="text-sm">No lectures yet</p>
            <p className="text-xs opacity-70 mt-1">Upload your first lecture to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 divide-x divide-gray-300/30 gap-x-4">
            <div className="pr-2">
              {lectures.slice(0, 3).map((lecture, index) => (
                <div key={lecture.job_id}>
                  <div 
                    className="flex items-center gap-2 hover:bg-white/10 rounded p-1 transition-colors cursor-pointer py-2"
                    onClick={() => handleLectureClick(lecture.job_id)}
                  >
                    <div 
                      className={cn("w-2 h-2 rounded-full flex-shrink-0", getStatusDot(lecture.status))} 
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate leading-tight">
                        {lecture.lecture_title}
                      </p>
                      <p className="text-xs opacity-60 truncate leading-tight">
                        {new Date(lecture.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {index < 2 && (
                    <div className="border-b border-gray-300/30 my-3"></div>
                  )}
                </div>
              ))}
            </div>
            <div className="pl-2">
              {lectures.slice(3, 6).map((lecture, index) => (
                <div key={lecture.job_id}>
                  <div 
                    className="flex items-center gap-2 hover:bg-white/10 rounded p-1 transition-colors cursor-pointer py-2"
                    onClick={() => handleLectureClick(lecture.job_id)}
                  >
                    <div 
                      className={cn("w-2 h-2 rounded-full flex-shrink-0", getStatusDot(lecture.status))} 
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate leading-tight">
                        {lecture.lecture_title}
                      </p>
                      <p className="text-xs opacity-60 truncate leading-tight">
                        {new Date(lecture.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {index < 2 && (
                    <div className="border-b border-gray-300/30 my-3"></div>
                  )}
                </div>
              ))}
            </div>
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