'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { X } from 'lucide-react';

export interface QuizConfig {
  difficulty: 'easy' | 'medium' | 'hard';
  numQuestions: number;
  questionTypes: ('multiple-choice' | 'true-false' | 'fill-number')[];
  focusTopics: string[];
}

interface QuizConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (config: QuizConfig) => void;
  isGenerating?: boolean;
}

export function QuizConfigDialog({
  open,
  onOpenChange,
  onGenerate,
  isGenerating = false,
}: QuizConfigDialogProps) {
  // Default configuration
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [numQuestions, setNumQuestions] = useState(7);
  const [questionTypes, setQuestionTypes] = useState<('multiple-choice' | 'true-false' | 'fill-number')[]>([
    'multiple-choice',
    'true-false',
  ]);
  const [focusTopics, setFocusTopics] = useState<string[]>([]);
  const [topicInput, setTopicInput] = useState('');

  const handleQuestionTypeToggle = (type: 'multiple-choice' | 'true-false' | 'fill-number') => {
    if (questionTypes.includes(type)) {
      // Don't allow removing all types
      if (questionTypes.length > 1) {
        setQuestionTypes(questionTypes.filter(t => t !== type));
      }
    } else {
      setQuestionTypes([...questionTypes, type]);
    }
  };

  const handleAddTopic = () => {
    if (topicInput.trim() && !focusTopics.includes(topicInput.trim())) {
      setFocusTopics([...focusTopics, topicInput.trim()]);
      setTopicInput('');
    }
  };

  const handleRemoveTopic = (topic: string) => {
    setFocusTopics(focusTopics.filter(t => t !== topic));
  };

  const handleGenerate = () => {
    onGenerate({
      difficulty,
      numQuestions,
      questionTypes,
      focusTopics,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Generate Quiz</DialogTitle>
          <DialogDescription>
            Customize your quiz settings below. You can generate multiple quizzes with different configurations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Difficulty Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Difficulty</Label>
            <RadioGroup value={difficulty} onValueChange={(value: any) => setDifficulty(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="easy" id="easy" />
                <Label htmlFor="easy" className="cursor-pointer font-normal">
                  Easy - Basic facts and definitions
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="medium" />
                <Label htmlFor="medium" className="cursor-pointer font-normal">
                  Medium - Comprehension and application
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hard" id="hard" />
                <Label htmlFor="hard" className="cursor-pointer font-normal">
                  Hard - Synthesis and critical thinking
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Number of Questions Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Number of Questions</Label>
              <span className="text-2xl font-bold text-primary">{numQuestions}</span>
            </div>
            <Slider
              value={[numQuestions]}
              onValueChange={(values) => setNumQuestions(values[0])}
              min={5}
              max={10}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Choose between 5-10 questions to keep quizzes focused and not overwhelming
            </p>
          </div>

          {/* Question Types */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Question Types</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="multiple-choice"
                  checked={questionTypes.includes('multiple-choice')}
                  onCheckedChange={() => handleQuestionTypeToggle('multiple-choice')}
                />
                <Label htmlFor="multiple-choice" className="cursor-pointer font-normal">
                  Multiple Choice (4 options)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="true-false"
                  checked={questionTypes.includes('true-false')}
                  onCheckedChange={() => handleQuestionTypeToggle('true-false')}
                />
                <Label htmlFor="true-false" className="cursor-pointer font-normal">
                  True/False
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="fill-number"
                  checked={questionTypes.includes('fill-number')}
                  onCheckedChange={() => handleQuestionTypeToggle('fill-number')}
                />
                <Label htmlFor="fill-number" className="cursor-pointer font-normal">
                  Fill in Number
                </Label>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              At least one question type must be selected
            </p>
          </div>

          {/* Focus Topics (Optional) */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Focus Topics (Optional)</Label>
            <div className="flex gap-2">
              <input
                type="text"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTopic()}
                placeholder="Add specific topic..."
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <Button type="button" onClick={handleAddTopic} variant="outline" size="sm">
                Add
              </Button>
            </div>
            {focusTopics.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {focusTopics.map((topic) => (
                  <div
                    key={topic}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm"
                  >
                    <span>{topic}</span>
                    <button
                      onClick={() => handleRemoveTopic(topic)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Leave empty to cover all lecture content
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating || questionTypes.length === 0}>
            {isGenerating ? 'Generating...' : 'Generate Quiz'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
