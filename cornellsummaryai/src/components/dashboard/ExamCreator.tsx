import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/components/ui/use-toast';
import { 
  GraduationCap, 
  Folder, 
  Clock, 
  AlertCircle,
  Sparkles,
  Loader2
} from 'lucide-react';

interface ExamCreatorProps {
  folders: Array<{
    id: string;
    name: string;
    count: number;  // Changed from noteCount to count to match Folder interface
  }>;
  onExamCreated: (examId: string) => void;
}

export function ExamCreator({ folders, onExamCreated }: ExamCreatorProps) {
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [questionCount, setQuestionCount] = useState<number>(20);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerateExam = async () => {
    if (!selectedFolder) {
      toast({
        title: "Select a folder",
        description: "Please select a folder to generate an exam from",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch('/api/exam/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          folderId: selectedFolder,
          folderName: folders.find(f => f.id === selectedFolder)?.name,
          questionCount
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate exam');
      }

      toast({
        title: "Exam Generated!",
        description: `Created ${data.questionCount} questions. Ready to start!`,
      });

      onExamCreated(data.examId);
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate exam",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedFolderData = folders.find(f => f.id === selectedFolder);
  const estimatedTime = Math.ceil(questionCount * 1.5); // 1.5 minutes per question

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Create New Exam
        </CardTitle>
        <CardDescription>
          Generate a practice exam from your Mindsy notes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Folder Selection */}
        <div className="space-y-2">
          <Label htmlFor="folder">Select Folder</Label>
          <Select value={selectedFolder} onValueChange={setSelectedFolder}>
            <SelectTrigger id="folder">
              <SelectValue placeholder="Choose a folder with notes" />
            </SelectTrigger>
            <SelectContent>
              {folders.map(folder => (
                <SelectItem key={folder.id} value={folder.id}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4" />
                      <span>{folder.name}</span>
                    </div>
                    <span className="text-muted-foreground text-sm ml-4">
                      {folder.count} notes
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedFolderData && selectedFolderData.count < 3 && (
            <div className="flex items-center gap-2 text-amber-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>Folder has few notes. Consider adding more for better exams.</span>
            </div>
          )}
        </div>

        {/* Question Count */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label htmlFor="questions">Number of Questions</Label>
            <span className="text-sm text-muted-foreground">{questionCount} questions</span>
          </div>
          <Slider
            id="questions"
            min={10}
            max={50}
            step={5}
            value={[questionCount]}
            onValueChange={(value) => setQuestionCount(value[0])}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>10</span>
            <span>20</span>
            <span>30</span>
            <span>40</span>
            <span>50</span>
          </div>
        </div>

        {/* Exam Info */}
        <div className="bg-muted rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Estimated Time:</span>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span className="font-medium">{estimatedTime} minutes</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Question Types:</span>
            <span className="font-medium">Multiple Choice (A-D)</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Passing Score:</span>
            <span className="font-medium">70%</span>
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerateExam}
          disabled={!selectedFolder || isGenerating}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Exam...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Exam
            </>
          )}
        </Button>

        {/* Tips */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Questions are generated from your Mindsy notes in the selected folder</p>
          <p>• Each correct answer gives you 10 XP when passing (70%+)</p>
          <p>• Complete exams to build your streak and unlock achievements</p>
        </div>
      </CardContent>
    </Card>
  );
}