"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarIcon, Sparkles, Clock, BookOpen, Target, Zap, Brain, ChevronRight, Loader2, CheckCircle, AlertCircle, WandSparkles } from 'lucide-react';
import { format, differenceInDays, addDays, setHours, setMinutes, isSameDay, isWeekend } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface GeneratedSession {
  title: string;
  start: Date;
  end: Date;
  type: 'study' | 'review' | 'practice' | 'exam-prep';
  subject: string;
  description: string;
  lectureIds?: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  priority: 'low' | 'medium' | 'high';
}

interface StudyPlan {
  sessions: GeneratedSession[];
  totalHours: number;
  confidence: number;
  strategy: string;
  warnings?: string[];
}

interface UserPreferences {
  studyHoursPerDay: number;
  preferredTime: 'morning' | 'afternoon' | 'evening' | 'night';
  includeWeekends: boolean;
  sessionDuration: number; // in minutes
  breakDuration: number;
  difficulty: 'easy' | 'medium' | 'hard';
  includeSports: boolean;
  sportsFrequency: 'daily' | 'every-other-day' | 'weekends-only';
}

export function AIScheduleGenerator({ 
  isOpen, 
  onClose,
  onApplySchedule 
}: {
  isOpen: boolean;
  onClose: () => void;
  onApplySchedule: (sessions: GeneratedSession[]) => void;
}) {
  const [step, setStep] = useState<'goal' | 'preferences' | 'generating' | 'preview'>('goal');
  const [goal, setGoal] = useState('');
  const [examDate, setExamDate] = useState('');
  const [examSubject, setExamSubject] = useState('');
  const [preferences, setPreferences] = useState<UserPreferences>({
    studyHoursPerDay: 2,
    preferredTime: 'morning',
    includeWeekends: true,
    sessionDuration: 60,
    breakDuration: 15,
    difficulty: 'medium',
    includeSports: true,
    sportsFrequency: 'every-other-day'
  });
  const [generatedPlan, setGeneratedPlan] = useState<StudyPlan | null>(null);
  const [userLectures, setUserLectures] = useState<any[]>([]);
  const [userFolders, setUserFolders] = useState<any[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const supabase = createClient();

  // Load user's lectures and folders when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadUserLectures();
      loadUserFolders();
    }
  }, [isOpen]);

  const loadUserLectures = async () => {
    // Get lectures with their associated study nodes (folders)
    const { data: lectures } = await supabase
      .from('jobs')
      .select(`
        job_id, 
        lecture_title, 
        course_subject,
        study_node_id,
        study_nodes!inner (
          id,
          name,
          type
        )
      `)
      .in('status', ['completed'])
      .order('created_at', { ascending: false });
    
    if (lectures) {
      setUserLectures(lectures);
    }
  };

  const loadUserFolders = async () => {
    // Get all user's study folders/nodes
    const { data: folders } = await supabase
      .from('study_nodes')
      .select('id, name, type, parent_id')
      .order('name', { ascending: true });
    
    if (folders) {
      setUserFolders(folders);
    }
  };

  // Build folder hierarchy path (e.g., "Computer Science > CPE > Fall 2024")
  const getFolderPath = (folderId: string): string => {
    const buildPath = (nodeId: string, visited: Set<string> = new Set()): string => {
      if (visited.has(nodeId)) return ''; // Prevent infinite recursion
      visited.add(nodeId);
      
      const node = userFolders.find(f => f.id === nodeId);
      if (!node) return '';
      
      if (node.parent_id) {
        const parentPath = buildPath(node.parent_id, visited);
        return parentPath ? `${parentPath} > ${node.name}` : node.name;
      }
      return node.name;
    };
    
    return buildPath(folderId);
  };

  // Get folders that have lectures (no empty folders)
  const getFoldersWithLectures = () => {
    const folderIds = new Set(userLectures.map(lecture => lecture.study_node_id).filter(Boolean));
    return userFolders.filter(folder => folderIds.has(folder.id));
  };

  // Generate the study plan using AI
  const generateStudyPlan = async () => {
    setIsGenerating(true);
    setStep('generating');

    try {
      // Find relevant lectures for the selected folder
      const relevantLectures = selectedFolder 
        ? userLectures.filter(lecture => lecture.study_node_id === selectedFolder)
        : userLectures.filter(lecture => 
            lecture.course_subject?.toLowerCase().includes(examSubject.toLowerCase()) ||
            lecture.lecture_title?.toLowerCase().includes(examSubject.toLowerCase()) ||
            lecture.study_nodes?.name?.toLowerCase().includes(examSubject.toLowerCase())
          );
      
      // Get folder info for better context
      const selectedFolderInfo = selectedFolder 
        ? userFolders.find(f => f.id === selectedFolder)
        : null;

      // Calculate study days
      const daysUntilExam = differenceInDays(new Date(examDate), new Date());
      
      if (daysUntilExam < 1) {
        toast.error('Exam date must be in the future');
        setStep('goal');
        setIsGenerating(false);
        return;
      }

      // Prepare the AI prompt
      const folderPath = selectedFolderInfo ? getFolderPath(selectedFolder) : 'General Study';
      const subjectName = selectedFolderInfo ? selectedFolderInfo.name : 'General Study';
      const prompt = {
        goal: goal || `Prepare for ${folderPath} exam`,
        examDate: examDate,
        subject: subjectName,
        subjectPath: folderPath, // Full hierarchy path
        daysAvailable: daysUntilExam,
        lectures: relevantLectures.map(l => ({
          id: l.job_id,
          title: l.lecture_title
        })),
        preferences: preferences,
        request: "Generate a comprehensive study schedule with specific sessions including review and practice. Consider spaced repetition and increasing intensity closer to exam."
      };

      // Call OpenAI API (through our backend)
      const response = await fetch('/api/ai/generate-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prompt)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI Schedule API Error:', response.status, errorText);
        throw new Error(`Failed to generate schedule: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // Process the AI response into our StudyPlan format
      const plan: StudyPlan = {
        sessions: data.sessions || generateFallbackSchedule(),
        totalHours: data.totalHours || calculateTotalHours(data.sessions),
        confidence: data.confidence || 75,
        strategy: data.strategy || "Progressive learning with spaced repetition",
        warnings: data.warnings
      };

      setGeneratedPlan(plan);
      setStep('preview');
      
    } catch (error) {
      console.error('Error generating schedule:', error);
      // Fallback to rule-based generation if AI fails
      const fallbackPlan = createRuleBasedSchedule();
      setGeneratedPlan(fallbackPlan);
      setStep('preview');
    } finally {
      setIsGenerating(false);
    }
  };

  // Fallback rule-based schedule generator
  const createRuleBasedSchedule = (): StudyPlan => {
    const sessions: GeneratedSession[] = [];
    const daysUntilExam = differenceInDays(new Date(examDate), new Date());
    const relevantLectures = selectedFolder 
      ? userLectures.filter(lecture => lecture.study_node_id === selectedFolder)
      : [];
    
    const selectedFolderInfo = selectedFolder 
      ? userFolders.find(f => f.id === selectedFolder)
      : null;
    const subjectName = selectedFolderInfo ? selectedFolderInfo.name : 'General Study';

    let currentDate = new Date();
    
    // Phase 1: Learning (60% of time)
    const learningDays = Math.floor(daysUntilExam * 0.6);
    for (let i = 0; i < learningDays; i++) {
      currentDate = addDays(currentDate, 1);
      
      // Skip weekends if preference
      if (!preferences.includeWeekends && isWeekend(currentDate)) {
        continue;
      }

      const startHour = preferences.preferredTime === 'morning' ? 9 : 
                       preferences.preferredTime === 'afternoon' ? 14 :
                       preferences.preferredTime === 'evening' ? 18 : 20;

      sessions.push({
        title: `${subjectName} - Chapter ${Math.floor(i / 2) + 1}`,
        start: setMinutes(setHours(currentDate, startHour), 0),
        end: setMinutes(setHours(currentDate, startHour + Math.floor(preferences.sessionDuration / 60)), preferences.sessionDuration % 60),
        type: 'study',
        subject: subjectName,
        description: `Learn new concepts from lectures`,
        difficulty: 'medium',
        priority: 'high'
      });

      // Add review session every 3 days
      if (i % 3 === 2) {
        sessions.push({
          title: `${subjectName} - Review`,
          start: setMinutes(setHours(currentDate, startHour + 2), 0),
          end: setMinutes(setHours(currentDate, startHour + 3), 0),
          type: 'review',
          subject: subjectName,
          description: `Review previous materials`,
          difficulty: 'easy',
          priority: 'medium'
        });
      }
    }

    // Phase 2: Practice (30% of time)
    const practiceDays = Math.floor(daysUntilExam * 0.3);
    for (let i = 0; i < practiceDays; i++) {
      currentDate = addDays(currentDate, 1);
      
      if (!preferences.includeWeekends && isWeekend(currentDate)) {
        continue;
      }

      const startHour = preferences.preferredTime === 'morning' ? 9 : 
                       preferences.preferredTime === 'afternoon' ? 14 :
                       preferences.preferredTime === 'evening' ? 18 : 20;

      sessions.push({
        title: `${subjectName} - Practice Problems`,
        start: setMinutes(setHours(currentDate, startHour), 0),
        end: setMinutes(setHours(currentDate, startHour + 2), 0),
        type: 'practice',
        subject: subjectName,
        description: `Solve practice problems and past exams`,
        difficulty: 'hard',
        priority: 'high'
      });
    }

    // Phase 3: Final Review (10% of time)
    const reviewDays = Math.floor(daysUntilExam * 0.1) || 1;
    for (let i = 0; i < reviewDays; i++) {
      currentDate = addDays(currentDate, 1);
      
      sessions.push({
        title: `${subjectName} - Final Review`,
        start: setMinutes(setHours(currentDate, 10), 0),
        end: setMinutes(setHours(currentDate, 12), 0),
        type: 'exam-prep',
        subject: subjectName,
        description: `Final review and exam preparation`,
        difficulty: 'medium',
        priority: 'high'
      });
    }

    // Add sports/exercise sessions if requested
    if (preferences.includeSports) {
      let exerciseDate = new Date();
      const exerciseInterval = preferences.sportsFrequency === 'daily' ? 1 : 
                              preferences.sportsFrequency === 'every-other-day' ? 2 : 7;
      
      for (let day = 0; day < daysUntilExam; day += exerciseInterval) {
        exerciseDate = addDays(exerciseDate, exerciseInterval);
        
        // Skip if weekend and user doesn't include weekends (unless it's weekends-only)
        if (!preferences.includeWeekends && isWeekend(exerciseDate) && preferences.sportsFrequency !== 'weekends-only') {
          continue;
        }
        
        // Skip if weekday and it's weekends-only
        if (preferences.sportsFrequency === 'weekends-only' && !isWeekend(exerciseDate)) {
          continue;
        }

        const exerciseTime = preferences.preferredTime === 'morning' ? 7 : 
                           preferences.preferredTime === 'evening' ? 17 : 19;

        sessions.push({
          title: `Exercise Break - ${['Cardio', 'Gym', 'Sports', 'Yoga', 'Walk'][Math.floor(Math.random() * 5)]}`,
          start: setMinutes(setHours(exerciseDate, exerciseTime), 0),
          end: setMinutes(setHours(exerciseDate, exerciseTime + 1), 0),
          type: 'study', // We use 'study' type but will show as exercise
          subject: 'Health & Wellness',
          description: `Physical activity to boost focus and reduce stress`,
          difficulty: 'easy',
          priority: 'medium'
        });
      }
    }

    const totalHours = sessions.reduce((acc, session) => 
      acc + (session.end.getTime() - session.start.getTime()) / (1000 * 60 * 60), 0
    );

    return {
      sessions,
      totalHours,
      confidence: 70,
      strategy: "Progressive learning approach: Learn → Practice → Review",
      warnings: relevantLectures.length === 0 ? 
        ["No lectures found for this subject. Schedule based on general patterns."] : 
        undefined
    };
  };

  const generateFallbackSchedule = () => {
    // Simple fallback sessions
    return [];
  };

  const calculateTotalHours = (sessions: GeneratedSession[]) => {
    return sessions.reduce((acc, session) => 
      acc + (session.end.getTime() - session.start.getTime()) / (1000 * 60 * 60), 0
    );
  };

  const handleApplySchedule = () => {
    if (generatedPlan) {
      onApplySchedule(generatedPlan.sessions);
      toast.success(`✨ Added ${generatedPlan.sessions.length} study sessions to your calendar!`);
      onClose();
      resetForm();
    }
  };

  const resetForm = () => {
    setStep('goal');
    setGoal('');
    setExamDate('');
    setExamSubject('');
    setSelectedFolder('');
    setGeneratedPlan(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WandSparkles className="w-5 h-5 text-purple-500" />
            AI Study Schedule Generator
          </DialogTitle>
          <DialogDescription>
            Let's create the perfect study plan for your exam
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Goal Setting */}
        {step === 'goal' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="goal">What are you preparing for?</Label>
              <Input
                id="goal"
                placeholder="e.g., Calculus final exam, Physics midterm..."
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="folder">Study Folder</Label>
                <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choose a folder with lectures..." />
                  </SelectTrigger>
                  <SelectContent>
                    {getFoldersWithLectures().length > 0 ? (
                      getFoldersWithLectures().map((folder) => (
                        <SelectItem key={folder.id} value={folder.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{folder.name}</span>
                            <span className="text-xs text-gray-500">{getFolderPath(folder.id)}</span>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-3 text-sm text-gray-500">
                        No folders with lectures found. Upload some content first!
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="date">Exam Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                  className="mt-1"
                />
              </div>
            </div>

            {examDate && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  📅 {differenceInDays(new Date(examDate), new Date())} days to prepare
                </p>
              </div>
            )}

            {selectedFolder && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-green-600 dark:text-green-400">
                  📚 {userLectures.filter(l => l.study_node_id === selectedFolder).length} lectures found in "{userFolders.find(f => f.id === selectedFolder)?.name}"
                </p>
                <p className="text-xs text-green-500 dark:text-green-500 mt-1">
                  Path: {getFolderPath(selectedFolder)}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={() => setStep('preferences')}
                disabled={!selectedFolder || !examDate}
              >
                Next: Preferences
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Preferences */}
        {step === 'preferences' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Study hours per day</Label>
                <Select 
                  value={preferences.studyHoursPerDay.toString()}
                  onValueChange={(v) => setPreferences(p => ({ ...p, studyHoursPerDay: parseInt(v) }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="2">2 hours</SelectItem>
                    <SelectItem value="3">3 hours</SelectItem>
                    <SelectItem value="4">4 hours</SelectItem>
                    <SelectItem value="5">5+ hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Preferred time</Label>
                <Select 
                  value={preferences.preferredTime}
                  onValueChange={(v: any) => setPreferences(p => ({ ...p, preferredTime: v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning (6-12)</SelectItem>
                    <SelectItem value="afternoon">Afternoon (12-18)</SelectItem>
                    <SelectItem value="evening">Evening (18-22)</SelectItem>
                    <SelectItem value="night">Night (22+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Session duration</Label>
                <Select 
                  value={preferences.sessionDuration.toString()}
                  onValueChange={(v) => setPreferences(p => ({ ...p, sessionDuration: parseInt(v) }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Study difficulty</Label>
                <Select 
                  value={preferences.difficulty}
                  onValueChange={(v: any) => setPreferences(p => ({ ...p, difficulty: v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Light (more breaks)</SelectItem>
                    <SelectItem value="medium">Balanced</SelectItem>
                    <SelectItem value="hard">Intensive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="weekends"
                  checked={preferences.includeWeekends}
                  onChange={(e) => setPreferences(p => ({ ...p, includeWeekends: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="weekends" className="cursor-pointer">
                  Include weekends in schedule
                </Label>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sports"
                  checked={preferences.includeSports}
                  onChange={(e) => setPreferences(p => ({ ...p, includeSports: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="sports" className="cursor-pointer">
                  Include sports/exercise breaks
                </Label>
              </div>

              {preferences.includeSports && (
                <div className="ml-6">
                  <Label className="text-sm text-gray-600">Exercise frequency</Label>
                  <Select 
                    value={preferences.sportsFrequency}
                    onValueChange={(v: any) => setPreferences(p => ({ ...p, sportsFrequency: v }))}
                  >
                    <SelectTrigger className="mt-1 w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily (recommended)</SelectItem>
                      <SelectItem value="every-other-day">Every other day</SelectItem>
                      <SelectItem value="weekends-only">Weekends only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('goal')} disabled={isGenerating}>
                Back
              </Button>
              <Button onClick={generateStudyPlan} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                    Generating with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate AI Schedule
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Generating */}
        {step === 'generating' && (
          <div className="py-12 text-center space-y-4">
            <div className="flex justify-center">
              <div className="relative">
                <Brain className="w-16 h-16 text-purple-500 animate-pulse" />
                <Sparkles className="w-6 h-6 text-yellow-500 absolute -top-2 -right-2 animate-spin" />
              </div>
            </div>
            <h3 className="text-lg font-semibold">AI is creating your perfect study plan...</h3>
            <p className="text-sm text-gray-500">Analyzing your lectures and optimizing schedule</p>
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-500" />
          </div>
        )}

        {/* Step 4: Preview */}
        {step === 'preview' && generatedPlan && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-gray-500">Sessions</p>
                <p className="text-2xl font-bold">{generatedPlan.sessions.length}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-gray-500">Total Hours</p>
                <p className="text-2xl font-bold">{generatedPlan.totalHours.toFixed(1)}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-gray-500">Confidence</p>
                <p className="text-2xl font-bold">{generatedPlan.confidence}%</p>
              </div>
            </div>

            {/* Strategy */}
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                📚 Strategy
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {generatedPlan.strategy}
              </p>
            </div>

            {/* Warnings */}
            {generatedPlan.warnings && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                  ⚠️ Considerations
                </p>
                {generatedPlan.warnings.map((warning, i) => (
                  <p key={i} className="text-sm text-yellow-700 dark:text-yellow-300">
                    • {warning}
                  </p>
                ))}
              </div>
            )}

            {/* Priority Legend */}
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium text-foreground mb-2">Priority Tags Explained:</p>
              <div className="flex gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-red-500 rounded"></span>
                  <strong>High:</strong> Critical for exam success
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-yellow-500 rounded"></span>
                  <strong>Medium:</strong> Important for understanding
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-gray-500 rounded"></span>
                  <strong>Low:</strong> Optional/supplementary
                </span>
              </div>
            </div>

            {/* Preview Sessions */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              <p className="text-sm font-medium text-gray-500 mb-2">Preview (first 5 sessions)</p>
              {generatedPlan.sessions.slice(0, 5).map((session, i) => (
                <div key={i} className="p-2 border rounded-lg flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    session.type === 'study' ? 'bg-blue-500' :
                    session.type === 'review' ? 'bg-green-500' :
                    session.type === 'practice' ? 'bg-orange-500' :
                    'bg-purple-500'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{session.title}</p>
                    <p className="text-xs text-gray-500">
                      {format(session.start, 'MMM d, h:mm a')} - {format(session.end, 'h:mm a')}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    session.priority === 'high' ? 'bg-red-100 text-red-700' :
                    session.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {session.priority}
                  </span>
                </div>
              ))}
              {generatedPlan.sessions.length > 5 && (
                <p className="text-sm text-gray-500 text-center">
                  +{generatedPlan.sessions.length - 5} more sessions...
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('preferences')}>
                Adjust Preferences
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={generateStudyPlan}>
                  Regenerate
                </Button>
                <Button onClick={handleApplySchedule}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Apply Schedule
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}