'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Link, FileText, Calendar, Target } from 'lucide-react';

interface NewEssayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateEssay: (essayData: any) => void;
  children?: React.ReactNode;
}

export default function NewEssayModal({ 
  open, 
  onOpenChange, 
  onCreateEssay,
  children 
}: NewEssayModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    type: 'argumentative',
    assignment: '',
    wordGoal: 800,
    dueDate: '',
    sources: []
  });

  const essayTypes = [
    {
      id: 'argumentative',
      title: 'Argumentative Essay',
      description: 'Take a stance and support it with evidence',
      icon: '⚖️'
    },
    {
      id: 'analytical',
      title: 'Analytical Essay',
      description: 'Analyze and interpret a topic or text',
      icon: '🔍'
    },
    {
      id: 'compare-contrast',
      title: 'Compare & Contrast',
      description: 'Examine similarities and differences',
      icon: '⚖️'
    },
    {
      id: 'narrative',
      title: 'Narrative Essay',
      description: 'Tell a story with academic reflection',
      icon: '📖'
    },
    {
      id: 'research',
      title: 'Research Paper',
      description: 'Evidence-based argument with citations',
      icon: '📚'
    },
    {
      id: 'personal',
      title: 'Personal Statement',
      description: 'College or scholarship application',
      icon: '✨'
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateEssay(formData);
    onOpenChange(false);
    // Reset form
    setFormData({
      title: '',
      type: 'argumentative',
      assignment: '',
      wordGoal: 800,
      dueDate: '',
      sources: []
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && (
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto dark:bg-background/90 dark:backdrop-blur-2xl border-gray-200/50 dark:border-white/10 shadow-xl dark:shadow-2xl dark:shadow-black/50">
        <DialogHeader>
          <DialogTitle className="text-2xl">Create New Essay</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Essay Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Enter your essay title..."
                className="mt-1"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="wordGoal" className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Word Count Goal
                </Label>
                <Input
                  id="wordGoal"
                  type="number"
                  value={formData.wordGoal}
                  onChange={(e) => setFormData({...formData, wordGoal: parseInt(e.target.value) || 800})}
                  className="mt-1"
                  min="100"
                  max="10000"
                  step="50"
                />
              </div>

              <div>
                <Label htmlFor="dueDate" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Due Date (Optional)
                </Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Essay Type Selection */}
          <div>
            <Label className="text-base font-medium">Essay Type</Label>
            <RadioGroup 
              value={formData.type} 
              onValueChange={(value) => setFormData({...formData, type: value})}
              className="mt-3"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {essayTypes.map((type) => (
                  <div key={type.id}>
                    <RadioGroupItem value={type.id} id={type.id} className="sr-only" />
                    <Label
                      htmlFor={type.id}
                      className={`block cursor-pointer rounded-lg border-2 transition-all ${
                        formData.type === type.id
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-muted-foreground/50'
                      }`}
                    >
                      <Card className="border-0 shadow-none">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <span className="text-lg">{type.icon}</span>
                            {type.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <CardDescription className="text-xs">
                            {type.description}
                          </CardDescription>
                        </CardContent>
                      </Card>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Assignment Instructions */}
          <div>
            <Label htmlFor="assignment" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Assignment Instructions (Optional)
            </Label>
            <Textarea
              id="assignment"
              value={formData.assignment}
              onChange={(e) => setFormData({...formData, assignment: e.target.value})}
              placeholder="Paste your assignment instructions or upload requirements..."
              className="mt-1 min-h-[100px]"
            />
            <div className="flex items-center gap-2 mt-2">
              <Button type="button" variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-1" />
                Upload File
              </Button>
              <span className="text-sm text-muted-foreground">or paste instructions above</span>
            </div>
          </div>

          {/* Sources */}
          <div>
            <Label className="flex items-center gap-2">
              <Link className="w-4 h-4" />
              Sources (Optional)
            </Label>
            <div className="mt-2 p-4 border-2 border-dashed border-muted-foreground/25 rounded-lg text-center">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Add sources from your uploaded lectures or external references
                </p>
                <div className="flex justify-center gap-2">
                  <Button type="button" variant="outline" size="sm">
                    From Uploads
                  </Button>
                  <Button type="button" variant="outline" size="sm">
                    Add External
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.title.trim()}>
              Create Essay
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}