"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  FileText, 
  Link, 
  Mic, 
  BrainCircuit,
  CheckCircle,
  Loader2,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';

interface StructuredUploadDialogProps {
  trigger?: React.ReactNode;
  onUploadComplete?: (result: any) => void;
}

export default function StructuredUploadDialog({ 
  trigger, 
  onUploadComplete 
}: StructuredUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'file' | 'link' | 'manual'>('file');
  
  // Form data
  const [formData, setFormData] = useState({
    lectureTitle: '',
    courseSubject: '',
    
    // Manual structured input
    summary: '',
    keyPoints: '',
    questions: '',
    
    // File input
    selectedFile: null as File | null,
    
    // Link input
    linkUrl: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (file: File | null) => {
    setFormData(prev => ({ ...prev, selectedFile: file }));
  };

  const handleSubmit = async () => {
    if (!formData.lectureTitle.trim()) {
      toast.error('Please enter a lecture title');
      return;
    }

    if (activeTab === 'file' && !formData.selectedFile) {
      toast.error('Please select a file');
      return;
    }

    if (activeTab === 'link' && !formData.linkUrl.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    if (activeTab === 'manual' && !formData.summary.trim()) {
      toast.error('Please enter a summary');
      return;
    }

    setUploading(true);

    try {
      const uploadFormData = new FormData();
      
      // Basic information
      uploadFormData.append('lectureTitle', formData.lectureTitle);
      uploadFormData.append('courseSubject', formData.courseSubject);
      uploadFormData.append('uploadType', activeTab);
      
      if (activeTab === 'file' && formData.selectedFile) {
        // File upload
        const fileType = formData.selectedFile.type;
        if (fileType.includes('audio')) {
          uploadFormData.append('audio', formData.selectedFile);
        } else if (fileType.includes('pdf')) {
          uploadFormData.append('pdf', formData.selectedFile);
        }
        uploadFormData.append('processingMode', 'ai-enhanced');
        
      } else if (activeTab === 'link') {
        // Link processing
        uploadFormData.append('linkUrl', formData.linkUrl);
        uploadFormData.append('processingMode', 'ai-enhanced');
        
      } else if (activeTab === 'manual') {
        // Manual structured input
        uploadFormData.append('summary', formData.summary);
        uploadFormData.append('keyPoints', formData.keyPoints);
        uploadFormData.append('questions', formData.questions);
        uploadFormData.append('processingMode', 'manual');
      }

      console.log('🚀 Submitting structured upload...');
      
      const response = await fetch('/api/upload-structured', {
        method: 'POST',
        body: uploadFormData,
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(`Lecture "${result.data.title}" uploaded successfully!`);
        console.log('✅ Upload successful:', result.data);
        
        // Reset form
        setFormData({
          lectureTitle: '',
          courseSubject: '',
          summary: '',
          keyPoints: '',
          questions: '',
          selectedFile: null,
          linkUrl: ''
        });
        
        setOpen(false);
        
        if (onUploadComplete) {
          onUploadComplete(result.data);
        }
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      toast.error('Failed to upload lecture');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Upload Lecture
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5" />
            Upload Structured Lecture Content
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Lecture Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Introduction to Machine Learning"
                value={formData.lectureTitle}
                onChange={(e) => handleInputChange('lectureTitle', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="subject">Course/Subject</Label>
              <Input
                id="subject"
                placeholder="e.g., Computer Science, Business, Mathematics"
                value={formData.courseSubject}
                onChange={(e) => handleInputChange('courseSubject', e.target.value)}
              />
            </div>
          </div>

          {/* Upload Method Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="file" className="gap-2">
                <Upload className="w-4 h-4" />
                Upload File
              </TabsTrigger>
              <TabsTrigger value="link" className="gap-2">
                <Link className="w-4 h-4" />
                From URL
              </TabsTrigger>
              <TabsTrigger value="manual" className="gap-2">
                <BrainCircuit className="w-4 h-4" />
                Manual Entry
              </TabsTrigger>
            </TabsList>

            {/* File Upload Tab */}
            <TabsContent value="file" className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6">
                <div className="text-center space-y-4">
                  {formData.selectedFile ? (
                    <div className="space-y-2">
                      <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
                      <p className="font-medium">{formData.selectedFile.name}</p>
                      <p className="text-sm text-gray-500">
                        {(formData.selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={() => handleFileChange(null)}
                        size="sm"
                      >
                        Change File
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-center gap-4">
                        <Mic className="w-8 h-8 text-blue-500" />
                        <FileText className="w-8 h-8 text-red-500" />
                      </div>
                      <div>
                        <p className="font-medium">Upload Audio or PDF</p>
                        <p className="text-sm text-gray-500">
                          Audio: MP3, WAV, M4A • PDF: Up to 50MB
                        </p>
                      </div>
                      <input
                        type="file"
                        accept=".pdf,.mp3,.wav,.m4a"
                        onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                        className="hidden"
                        id="file-input"
                      />
                      <Button 
                        variant="outline" 
                        onClick={() => document.getElementById('file-input')?.click()}
                      >
                        Choose File
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Link Tab */}
            <TabsContent value="link" className="space-y-4">
              <div>
                <Label htmlFor="url">Content URL</Label>
                <Input
                  id="url"
                  placeholder="https://youtube.com/watch?v=... or article URL"
                  value={formData.linkUrl}
                  onChange={(e) => handleInputChange('linkUrl', e.target.value)}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Supports YouTube videos, podcasts, and article URLs
                </p>
              </div>
            </TabsContent>

            {/* Manual Entry Tab */}
            <TabsContent value="manual" className="space-y-4">
              <div>
                <Label htmlFor="summary">Summary *</Label>
                <Textarea
                  id="summary"
                  placeholder="Enter a comprehensive summary of the lecture content..."
                  value={formData.summary}
                  onChange={(e) => handleInputChange('summary', e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
              
              <div>
                <Label htmlFor="keyPoints">Key Points (one per line)</Label>
                <Textarea
                  id="keyPoints"
                  placeholder={`Machine learning enables computers to learn from data
Neural networks mimic brain structure
Supervised learning uses labeled examples
Unsupervised learning finds patterns in unlabeled data`}
                  value={formData.keyPoints}
                  onChange={(e) => handleInputChange('keyPoints', e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
              
              <div>
                <Label htmlFor="questions">Study Questions (one per line)</Label>
                <Textarea
                  id="questions"
                  placeholder={`What is machine learning?
How do neural networks work?
What's the difference between supervised and unsupervised learning?
What are real-world applications of ML?`}
                  value={formData.questions}
                  onChange={(e) => handleInputChange('questions', e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={uploading} className="gap-2">
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload Lecture
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}