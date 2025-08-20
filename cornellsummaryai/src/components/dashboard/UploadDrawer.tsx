import React, { useState } from 'react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Upload, 
  FileText, 
  AudioLines,
  Sparkles,
  Tags,
  BookOpen,
  Link,
  Folder,
  Plus,
  FileAudio,
  Type,
  Clipboard,
  Brain,
  Wand2,
  Paperclip,
  FileIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Folder {
  id: string;
  name: string;
  count: number;
}

interface StudyNode {
  id: string;
  name: string;
  type: 'course' | 'year' | 'subject' | 'semester' | 'custom';
  parent_id: string | null;
  children?: StudyNode[];
  note_count?: number;
}

interface UploadDrawerProps {
  trigger: React.ReactNode;
  folders?: Folder[];
  studyNodes?: StudyNode[];
  existingNotes?: Array<{ id: string; title: string; created_at: string }>;
  onAudioUpload: (file: File, studyNodeId?: string, folderId?: string) => void;
  onTextUpload: (text: string, options: TextEnhancementOptions, studyNodeId?: string, folderId?: string) => void;
  onAttachmentUpload?: (file: File, noteId: string, attachmentType: string) => void;
}

interface TextEnhancementOptions {
  aiSummary: boolean;
  autoTags: boolean;
  mindsyFormat: boolean;
  linkDetection: boolean;
  titleGeneration: boolean;
}

type Step = 'upload-type' | 'upload' | 'options' | 'review';

export function UploadDrawer({ trigger, folders = [], studyNodes = [], existingNotes = [], onAudioUpload, onTextUpload, onAttachmentUpload }: UploadDrawerProps) {
  const [currentStep, setCurrentStep] = useState<Step>('upload-type');
  const [uploadType, setUploadType] = useState<'audio' | 'text' | 'attachment'>('audio');
  const [selectedNoteId, setSelectedNoteId] = useState<string>('');
  const [attachmentType, setAttachmentType] = useState<string>('supplementary');
  const [selectedFolder, setSelectedFolder] = useState<string>('unfiled');
  const [selectedStudyNode, setSelectedStudyNode] = useState<string>('unfiled');
  const [textContent, setTextContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [enhancementOptions, setEnhancementOptions] = useState<TextEnhancementOptions>({
    aiSummary: true,
    autoTags: true,
    mindsyFormat: true,
    linkDetection: false,
    titleGeneration: true
  });
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    
    if (file) {
      if (uploadType === 'audio' && file.type.startsWith('audio/')) {
        setSelectedFile(file);
        setCurrentStep('options');
      } else if (uploadType === 'text' && file.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          setTextContent(text);
          setCurrentStep('options');
        };
        reader.readAsText(file);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (uploadType === 'audio' && file.type.startsWith('audio/')) {
        setSelectedFile(file);
        setCurrentStep('options');
      } else if (uploadType === 'text' && file.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          setTextContent(text);
          setCurrentStep('options');
        };
        reader.readAsText(file);
      } else if (uploadType === 'attachment') {
        setSelectedFile(file);
        // For attachments, we can go directly to options/review if a note is already selected
        if (selectedNoteId) {
          setCurrentStep('review');
        }
      }
    }
  };

  const handleSubmit = () => {
    if (uploadType === 'audio' && selectedFile) {
      onAudioUpload(selectedFile, selectedStudyNode === 'unfiled' ? undefined : selectedStudyNode);
    } else if (uploadType === 'text' && textContent.trim()) {
      onTextUpload(textContent, enhancementOptions, selectedStudyNode === 'unfiled' ? undefined : selectedStudyNode);
    } else if (uploadType === 'attachment' && selectedFile && selectedNoteId && onAttachmentUpload) {
      onAttachmentUpload(selectedFile, selectedNoteId, attachmentType);
    }
    // Reset state
    setCurrentStep('upload-type');
    setSelectedFile(null);
    setTextContent('');
    setSelectedNoteId('');
    setAttachmentType('supplementary');
  };

  const goBack = () => {
    switch (currentStep) {
      case 'upload':
        setCurrentStep('upload-type');
        break;
      case 'options':
        setCurrentStep('upload');
        break;
      case 'review':
        setCurrentStep('options');
        break;
    }
  };

  const goNext = () => {
    switch (currentStep) {
      case 'upload-type':
        setCurrentStep('upload');
        break;
      case 'upload':
        setCurrentStep('options');
        break;
      case 'options':
        setCurrentStep('review');
        break;
    }
  };

  const toggleEnhancement = (key: keyof TextEnhancementOptions) => {
    setEnhancementOptions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <Drawer>
      <DrawerTrigger asChild>
        {trigger}
      </DrawerTrigger>
      <DrawerContent className="max-h-[90vh] w-full">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {currentStep === 'upload-type' && 'Choose Upload Type'}
            {currentStep === 'upload' && `Upload ${uploadType === 'audio' ? 'Audio' : uploadType === 'text' ? 'Text' : 'Attachment'}`}
            {currentStep === 'options' && 'Configure Options'}
            {currentStep === 'review' && 'Review & Submit'}
          </DrawerTitle>
          <DrawerDescription>
            {currentStep === 'upload-type' && 'Select the type of content you want to upload'}
            {currentStep === 'upload' && `Upload your ${uploadType} file or content`}
            {currentStep === 'options' && 'Choose enhancement options and save location'}
            {currentStep === 'review' && 'Review your settings and submit'}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-auto">
          <div className="px-8 py-4">
            {/* Step Indicator */}
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center space-x-2">
                {['upload-type', 'upload', 'options', 'review'].map((step, index) => (
                  <div key={step} className="flex items-center">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                      currentStep === step 
                        ? "bg-primary text-primary-foreground" 
                        : ['upload-type', 'upload', 'options', 'review'].indexOf(currentStep) > index
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {index + 1}
                    </div>
                    {index < 3 && (
                      <div className={cn(
                        "w-8 h-0.5 mx-2",
                        ['upload-type', 'upload', 'options', 'review'].indexOf(currentStep) > index
                          ? "bg-primary"
                          : "bg-muted"
                      )} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Step Content */}
            <div className="max-w-lg mx-auto">
              {currentStep === 'upload-type' && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Choose Upload Type</CardTitle>
                    <CardDescription className="text-sm">
                      What type of content would you like to upload?
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      variant={uploadType === 'audio' ? 'default' : 'outline'}
                      className="w-full justify-start h-auto p-4"
                      onClick={() => setUploadType('audio')}
                    >
                      <AudioLines className="h-5 w-5 mr-3" />
                      <div className="text-left">
                        <div className="font-medium">Audio File</div>
                        <div className="text-sm opacity-80">Upload MP3, WAV, or M4A files</div>
                      </div>
                    </Button>
                    <Button
                      variant={uploadType === 'text' ? 'default' : 'outline'}
                      className="w-full justify-start h-auto p-4"
                      onClick={() => setUploadType('text')}
                    >
                      <FileText className="h-5 w-5 mr-3" />
                      <div className="text-left">
                        <div className="font-medium">Text Content</div>
                        <div className="text-sm opacity-80">Upload text files or paste content</div>
                      </div>
                    </Button>
                    <Button
                      variant={uploadType === 'attachment' ? 'default' : 'outline'}
                      className="w-full justify-start h-auto p-4"
                      onClick={() => setUploadType('attachment')}
                    >
                      <Paperclip className="h-5 w-5 mr-3" />
                      <div className="text-left">
                        <div className="font-medium">Add to Existing Note</div>
                        <div className="text-sm opacity-80">Attach slides, PDFs, or OneNote to your notes</div>
                      </div>
                    </Button>
                  </CardContent>
                </Card>
              )}

              {currentStep === 'upload' && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      {uploadType === 'audio' && <FileAudio className="h-4 w-4" />}
                      {uploadType === 'text' && <Type className="h-4 w-4" />}
                      {uploadType === 'attachment' && <Paperclip className="h-4 w-4" />}
                      {uploadType === 'audio' && 'Upload Audio File'}
                      {uploadType === 'text' && 'Enter Text Content'}
                      {uploadType === 'attachment' && 'Add Attachment to Note'}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {uploadType === 'audio' && 'Select an audio file to generate Mindsy Notes'}
                      {uploadType === 'text' && 'Enter or upload your text content'}
                      {uploadType === 'attachment' && 'Select a note and upload supplementary files'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {uploadType === 'audio' ? (
                      <div
                        className={cn(
                          "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                          dragActive 
                            ? "border-primary bg-primary/5" 
                            : "border-muted-foreground/25 hover:border-muted-foreground/50"
                        )}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                      >
                        <FileAudio className={cn(
                          "h-12 w-12 mx-auto mb-4 transition-colors",
                          dragActive ? "text-primary" : "text-muted-foreground"
                        )} />
                        <p className="font-medium mb-2">Drop your audio file here</p>
                        <p className="text-sm text-muted-foreground mb-4">
                          Supports MP3, WAV, M4A files up to 25MB
                        </p>
                        <Button variant="outline" className="relative">
                          <Upload className="h-4 w-4 mr-2" />
                          Choose Audio File
                          <input
                            type="file"
                            accept="audio/*"
                            onChange={handleFileSelect}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                        </Button>
                      </div>
                    ) : uploadType === 'text' ? (
                      <div className="space-y-4">
                        <div className="flex gap-3">
                          <Button variant="outline" className="relative flex-1">
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Text File
                            <input
                              type="file"
                              accept=".txt,.md"
                              onChange={handleFileSelect}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.readText().then(text => {
                                setTextContent(text);
                              });
                            }}
                          >
                            <Clipboard className="h-4 w-4 mr-2" />
                            Paste
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="text-content">Content</Label>
                          <Textarea
                            id="text-content"
                            placeholder="Paste or type your text content here..."
                            value={textContent}
                            onChange={(e) => setTextContent(e.target.value)}
                            className="min-h-[120px] resize-none"
                          />
                        </div>
                      </div>
                    ) : (
                      // Attachment upload UI
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="note-select">Select Note</Label>
                          <Select value={selectedNoteId} onValueChange={setSelectedNoteId}>
                            <SelectTrigger id="note-select">
                              <SelectValue placeholder="Choose a note to attach files to" />
                            </SelectTrigger>
                            <SelectContent>
                              {existingNotes.length === 0 ? (
                                <SelectItem value="none" disabled>No notes available</SelectItem>
                              ) : (
                                existingNotes.map((note) => (
                                  <SelectItem key={note.id} value={note.id}>
                                    <div className="flex flex-col">
                                      <span>{note.title || 'Untitled Note'}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(note.created_at).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        {selectedNoteId && (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="attachment-type">Attachment Type</Label>
                              <Select value={attachmentType} onValueChange={setAttachmentType}>
                                <SelectTrigger id="attachment-type">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="slides">Slides (PPT, PDF)</SelectItem>
                                  <SelectItem value="notes">Notes (OneNote, Word)</SelectItem>
                                  <SelectItem value="reference">Reference Materials</SelectItem>
                                  <SelectItem value="supplementary">Supplementary Files</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div
                              className={cn(
                                "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                                dragActive 
                                  ? "border-primary bg-primary/5" 
                                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
                              )}
                              onDragEnter={handleDrag}
                              onDragLeave={handleDrag}
                              onDragOver={handleDrag}
                              onDrop={handleDrop}
                            >
                              <Paperclip className={cn(
                                "h-12 w-12 mx-auto mb-4 transition-colors",
                                dragActive ? "text-primary" : "text-muted-foreground"
                              )} />
                              <p className="font-medium mb-2">Drop your attachment here</p>
                              <p className="text-sm text-muted-foreground mb-4">
                                Supports PDF, PPT, PPTX, DOC, DOCX, OneNote, images
                              </p>
                              <Button variant="outline" className="relative">
                                <Upload className="h-4 w-4 mr-2" />
                                Choose File
                                <input
                                  type="file"
                                  accept=".pdf,.ppt,.pptx,.doc,.docx,.one,.odt,.odp,.png,.jpg,.jpeg,.webp"
                                  onChange={handleFileSelect}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {currentStep === 'options' && (
                <div className="space-y-4">
                  {uploadType === 'text' && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Wand2 className="h-4 w-4" />
                          AI Enhancements
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {Object.entries({
                            aiSummary: { icon: Brain, label: 'AI Summary' },
                            autoTags: { icon: Tags, label: 'Auto Tags' },
                            mindsyFormat: { icon: BookOpen, label: 'Cornell Format' },
                            linkDetection: { icon: Link, label: 'Link Detection' },
                            titleGeneration: { icon: Sparkles, label: 'Title Generation' }
                          }).map(([key, { icon: Icon, label }]) => (
                            <div key={key} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-muted-foreground" />
                                <Label htmlFor={key} className="font-medium cursor-pointer">{label}</Label>
                              </div>
                              <Switch
                                id={key}
                                checked={enhancementOptions[key as keyof TextEnhancementOptions]}
                                onCheckedChange={() => toggleEnhancement(key as keyof TextEnhancementOptions)}
                              />
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Folder className="h-4 w-4" />
                        Save Location
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Select value={selectedStudyNode} onValueChange={setSelectedStudyNode}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose a study location (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unfiled">No folder (Unfiled)</SelectItem>
                          {studyNodes.map((node) => (
                            <SelectItem key={node.id} value={node.id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{node.name}</span>
                                <Badge variant="secondary" className="ml-2">
                                  {node.note_count || 0}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                </div>
              )}

              {currentStep === 'review' && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Review & Submit</CardTitle>
                    <CardDescription className="text-sm">
                      Review your settings before submitting
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Type:</span>
                        <span className="text-sm">{uploadType === 'audio' ? 'Audio File' : 'Text Content'}</span>
                      </div>
                      {uploadType === 'audio' && selectedFile && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">File:</span>
                          <span className="text-sm">{selectedFile.name}</span>
                        </div>
                      )}
                      {uploadType === 'text' && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Text Length:</span>
                          <span className="text-sm">{textContent.length} characters</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Study Location:</span>
                        <span className="text-sm">
                          {selectedStudyNode === 'unfiled' 
                            ? 'Unfiled' 
                            : studyNodes.find(n => n.id === selectedStudyNode)?.name || 'Unknown'
                          }
                        </span>
                      </div>
                      {uploadType === 'text' && (
                        <div>
                          <span className="text-sm font-medium">Enhancements:</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {Object.entries(enhancementOptions)
                              .filter(([_, enabled]) => enabled)
                              .map(([key, _]) => (
                                <Badge key={key} variant="secondary" className="text-xs">
                                  {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                                </Badge>
                              ))
                            }
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        <DrawerFooter>
          <div className="flex gap-3 max-w-lg mx-auto w-full">
            {currentStep !== 'upload-type' && (
              <Button 
                variant="outline" 
                onClick={goBack}
              >
                Back
              </Button>
            )}
            
            <div className="flex-1 flex gap-3">
              <DrawerClose asChild>
                <Button variant="outline" className="flex-1">
                  Cancel
                </Button>
              </DrawerClose>
              
              {currentStep === 'upload-type' && (
                <Button 
                  onClick={goNext}
                  className="flex-1"
                >
                  Next
                </Button>
              )}
              
              {currentStep === 'upload' && (
                <Button 
                  onClick={goNext}
                  disabled={uploadType === 'audio' ? !selectedFile : !textContent.trim()}
                  className="flex-1"
                >
                  Next
                </Button>
              )}
              
              {currentStep === 'options' && (
                <Button 
                  onClick={goNext}
                  className="flex-1"
                >
                  Review
                </Button>
              )}
              
              {currentStep === 'review' && (
                <Button 
                  onClick={handleSubmit}
                  className="flex-1"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Submit
                </Button>
              )}
            </div>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}