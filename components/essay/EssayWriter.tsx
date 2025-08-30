'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Typography from '@tiptap/extension-typography';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  CheckCircle2, 
  Circle, 
  Lightbulb, 
  BookOpen,
  Save,
  Download,
  Settings
} from 'lucide-react';

interface EssayWriterProps {
  essayId?: string;
  initialTitle?: string;
  initialType?: string;
  initialWordGoal?: number;
}

export default function EssayWriter({ 
  essayId,
  initialTitle = "Untitled Essay",
  initialType = "Argumentative",
  initialWordGoal = 800
}: EssayWriterProps) {
  const [title, setTitle] = useState(initialTitle);
  const [wordGoal] = useState(initialWordGoal);
  const [selectedOutlineItem, setSelectedOutlineItem] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start writing your essay here...',
      }),
      CharacterCount,
      Typography,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-neutral dark:prose-invert max-w-none min-h-[500px] p-4 focus:outline-none',
      },
    },
  });

  const wordCount = editor?.storage.characterCount.words() || 0;
  const progress = Math.min((wordCount / wordGoal) * 100, 100);

  // Essay outline structure
  const outlineItems = [
    {
      id: 'intro',
      title: 'Introduction',
      completed: false,
      items: [
        { id: 'hook', title: 'Hook', completed: false },
        { id: 'background', title: 'Background', completed: false },
        { id: 'thesis', title: 'Thesis Statement', completed: false }
      ]
    },
    {
      id: 'body1',
      title: 'Body Paragraph 1',
      completed: false,
      items: [
        { id: 'topic1', title: 'Topic Sentence', completed: false },
        { id: 'evidence1', title: 'Evidence', completed: false },
        { id: 'analysis1', title: 'Analysis', completed: false }
      ]
    },
    {
      id: 'body2',
      title: 'Body Paragraph 2',
      completed: false,
      items: [
        { id: 'topic2', title: 'Topic Sentence', completed: false },
        { id: 'evidence2', title: 'Evidence', completed: false },
        { id: 'analysis2', title: 'Analysis', completed: false }
      ]
    },
    {
      id: 'body3',
      title: 'Body Paragraph 3',
      completed: false,
      items: [
        { id: 'topic3', title: 'Topic Sentence', completed: false },
        { id: 'evidence3', title: 'Evidence', completed: false },
        { id: 'analysis3', title: 'Analysis', completed: false }
      ]
    },
    {
      id: 'conclusion',
      title: 'Conclusion',
      completed: false,
      items: [
        { id: 'restate', title: 'Restate Thesis', completed: false },
        { id: 'summary', title: 'Summary', completed: false },
        { id: 'closing', title: 'Closing Thought', completed: false }
      ]
    }
  ];

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-lg font-semibold bg-transparent border-none outline-none focus:ring-0"
              />
              <Badge variant="secondary">{initialType}</Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground">
                {wordCount} / {wordGoal} words
              </div>
              <Button size="sm" variant="outline">
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
              <Button size="sm" variant="outline">
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
              <Button size="sm" variant="ghost">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Outline */}
        <div className="w-80 border-r bg-muted/20 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5" />
              <h3 className="font-semibold">Essay Outline</h3>
            </div>
            
            <div className="space-y-3">
              {outlineItems.map((section) => (
                <div key={section.id} className="space-y-2">
                  <div 
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                      selectedOutlineItem === section.id 
                        ? 'bg-primary/10 text-primary' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedOutlineItem(section.id)}
                  >
                    {section.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                    <span className="font-medium text-sm">{section.title}</span>
                  </div>
                  
                  <div className="ml-6 space-y-1">
                    {section.items.map((item) => (
                      <div 
                        key={item.id}
                        className={`flex items-center gap-2 p-1 rounded text-sm cursor-pointer transition-colors ${
                          selectedOutlineItem === item.id 
                            ? 'bg-primary/10 text-primary' 
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                        }`}
                        onClick={() => setSelectedOutlineItem(item.id)}
                      >
                        {item.completed ? (
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                        ) : (
                          <Circle className="w-3 h-3" />
                        )}
                        <span>{item.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center Panel - Writing Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">Progress</span>
                <Progress value={progress} className="w-32" />
                <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* Right Panel - AI Assistant */}
        <div className="w-80 border-l bg-muted/20 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              <h3 className="font-semibold">AI Assistant</h3>
            </div>

            {/* Writing Tips */}
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">💡 Writing Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  • Start with a compelling hook to grab attention
                </div>
                <div className="text-sm text-muted-foreground">
                  • Make your thesis statement specific and arguable
                </div>
                <div className="text-sm text-muted-foreground">
                  • Each body paragraph should focus on one main idea
                </div>
              </CardContent>
            </Card>

            {/* Sources */}
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Sources (0)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" className="w-full">
                  Add Sources
                </Button>
              </CardContent>
            </Card>

            {/* Checklist */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">✅ Checklist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Circle className="w-3 h-3" />
                  <span className="text-muted-foreground">Introduction written</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Circle className="w-3 h-3" />
                  <span className="text-muted-foreground">Body paragraphs complete</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Circle className="w-3 h-3" />
                  <span className="text-muted-foreground">Conclusion added</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Circle className="w-3 h-3" />
                  <span className="text-muted-foreground">Sources cited</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Circle className="w-3 h-3" />
                  <span className="text-muted-foreground">Proofread for errors</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}