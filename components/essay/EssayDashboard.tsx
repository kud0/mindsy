'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  PenTool, 
  Plus, 
  FileText, 
  Clock,
  Download,
  Trash2,
  Edit3,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Essay {
  id: string;
  title: string;
  type: string;
  wordCount: number;
  wordGoal: number;
  status: 'draft' | 'in_progress' | 'completed';
  lastModified: string;
  createdAt: string;
}

interface EssayDashboardProps {
  onNewEssay: () => void;
  onOpenEssay: (essayId: string) => void;
}

export default function EssayDashboard({ onNewEssay, onOpenEssay }: EssayDashboardProps) {
  const [essays] = useState<Essay[]>([
    {
      id: '1',
      title: 'Climate Change Essay',
      type: 'Argumentative',
      wordCount: 450,
      wordGoal: 800,
      status: 'in_progress',
      lastModified: '2 days ago',
      createdAt: '2025-01-20'
    },
    {
      id: '2',
      title: 'Shakespeare Analysis',
      type: 'Literary Analysis',
      wordCount: 1200,
      wordGoal: 1200,
      status: 'completed',
      lastModified: '1 week ago',
      createdAt: '2025-01-15'
    }
  ]);

  const getStatusColor = (status: Essay['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusText = (status: Essay['status']) => {
    switch (status) {
      case 'completed':
        return 'Complete';
      case 'in_progress':
        return 'In Progress';
      default:
        return 'Draft';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <PenTool className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Essay Writer</h1>
            <p className="text-muted-foreground">Create and manage your essays</p>
          </div>
        </div>
        <Button onClick={onNewEssay} className="gap-2">
          <Plus className="w-4 h-4" />
          New Essay
        </Button>
      </div>

      {/* Quick Start */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Start</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2"
              onClick={onNewEssay}
            >
              <PenTool className="w-6 h-6" />
              <span>New Essay</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2"
              onClick={onNewEssay}
            >
              <FileText className="w-6 h-6" />
              <span>Use Template</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2"
              onClick={onNewEssay}
            >
              <Clock className="w-6 h-6" />
              <span>From Sources</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Essays */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Recent Essays</h2>
        
        {essays.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                  <PenTool className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">No essays yet</h3>
                <p className="text-muted-foreground">
                  Create your first essay to get started with AI-powered writing assistance.
                </p>
                <Button onClick={onNewEssay}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Essay
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {essays.map((essay) => (
              <Card key={essay.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold hover:text-primary cursor-pointer">
                          {essay.title}
                        </h3>
                        <Badge className={getStatusColor(essay.status)}>
                          {getStatusText(essay.status)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{essay.type}</span>
                        <span>•</span>
                        <span>{essay.wordCount}/{essay.wordGoal} words</span>
                        <span>•</span>
                        <span>{essay.lastModified}</span>
                      </div>
                      
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${Math.min((essay.wordCount / essay.wordGoal) * 100, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button 
                        onClick={() => onOpenEssay(essay.id)}
                        size="sm"
                      >
                        {essay.status === 'completed' ? 'View' : 'Continue'}
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onOpenEssay(essay.id)}>
                            <Edit3 className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="w-4 h-4 mr-2" />
                            Export
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Essay Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Essay Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              'Argumentative',
              'Analytical', 
              'Compare/Contrast',
              'Narrative',
              'Research',
              'Personal Statement'
            ].map((template) => (
              <Button
                key={template}
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={onNewEssay}
              >
                {template}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}