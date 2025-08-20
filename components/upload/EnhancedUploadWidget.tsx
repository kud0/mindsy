"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  FileText, 
  Link, 
  Mic, 
  Sparkles,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';

interface EnhancedUploadWidgetProps {
  variant?: 'button' | 'card';
  onUploadComplete?: () => void;
}

export default function EnhancedUploadWidget({ 
  variant = 'button',
  onUploadComplete 
}: EnhancedUploadWidgetProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'audio' | 'link' | 'documents'>('documents');
  
  // Enhancement toggle - this is the key feature
  const [enhanceWithAI, setEnhanceWithAI] = useState(false);
  
  const [formData, setFormData] = useState({
    lectureTitle: '',
    courseSubject: '',
    selectedFile: null as File | null,
    linkUrl: '',
    linkType: 'youtube'
  });

  const handleSubmit = async () => {
    if (!formData.lectureTitle.trim()) {
      toast.error('Please enter a lecture title');
      return;
    }

    setUploading(true);

    try {
      const uploadFormData = new FormData();
      
      uploadFormData.append('lectureTitle', formData.lectureTitle);
      uploadFormData.append('courseSubject', formData.courseSubject);
      uploadFormData.append('uploadType', activeTab);
      
      // Key decision: Use enhancement or regular processing
      const processingMode = enhanceWithAI ? 'ai-enhanced' : 'standard';
      uploadFormData.append('processingMode', processingMode);
      
      if (activeTab === 'audio' && formData.selectedFile) {
        uploadFormData.append('audio', formData.selectedFile);
      } else if (activeTab === 'documents' && formData.selectedFile) {
        uploadFormData.append('pdf', formData.selectedFile);
      } else if (activeTab === 'link') {
        uploadFormData.append('linkUrl', formData.linkUrl);
        uploadFormData.append('linkType', formData.linkType);
      }

      // Choose API endpoint based on enhancement setting
      const apiEndpoint = enhanceWithAI ? '/api/upload-structured' : '/api/upload';
      
      console.log(`🚀 Uploading with ${processingMode} processing...`);
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        body: uploadFormData,
      });

      const result = await response.json();

      if (response.ok) {
        const successMessage = enhanceWithAI 
          ? `✨ Enhanced lecture "${result.data.title || result.data.lecture_title}" created with AI structure!`
          : `✅ Lecture "${result.data.title || result.data.lecture_title}" uploaded successfully!`;
          
        toast.success(successMessage);
        
        setFormData({
          lectureTitle: '',
          courseSubject: '',
          selectedFile: null,
          linkUrl: '',
          linkType: 'youtube'
        });
        
        setOpen(false);
        
        if (onUploadComplete) {
          onUploadComplete();
        }
        
        // Refresh the page to show new lecture
        window.location.reload();
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

  const trigger = variant === 'card' ? (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 cursor-pointer transition-colors">
      <Plus className="w-8 h-8 mx-auto mb-2 text-gray-400" />
      <p className="font-medium">Upload New Lecture</p>
      <p className="text-sm text-gray-500">Audio, PDF, or from URL</p>
    </div>
  ) : (
    <Button className="gap-2">
      <Plus className="w-4 h-4" />
      Upload Content
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Lecture Content</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Lecture Title</Label>
              <Input
                id="title"
                placeholder="Enter lecture title"
                value={formData.lectureTitle}
                onChange={(e) => setFormData(prev => ({ ...prev, lectureTitle: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="subject">Course Subject (Optional)</Label>
              <Input
                id="subject"
                placeholder="e.g., Computer Science, Business"
                value={formData.courseSubject}
                onChange={(e) => setFormData(prev => ({ ...prev, courseSubject: e.target.value }))}
              />
            </div>
          </div>

          {/* AI Enhancement Toggle - This is the key feature */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg border">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <div>
                <p className="font-medium">AI Enhancement</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {enhanceWithAI 
                    ? 'AI will extract questions, key points, and structure your content'
                    : 'Keep original format - upload and view as-is'
                  }
                </p>
              </div>
            </div>
            <Switch
              checked={enhanceWithAI}
              onCheckedChange={setEnhanceWithAI}
            />
          </div>

          {/* Upload Tabs - Same as before */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="documents">
                <FileText className="w-4 h-4 mr-2" />
                Documents
              </TabsTrigger>
              <TabsTrigger value="audio">
                <Mic className="w-4 h-4 mr-2" />
                Audio
              </TabsTrigger>
              <TabsTrigger value="link">
                <Link className="w-4 h-4 mr-2" />
                Link
              </TabsTrigger>
            </TabsList>

            {/* Documents Tab */}
            <TabsContent value="documents" className="mt-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <FileText className="w-8 h-8 mx-auto mb-4 text-gray-400" />
                  <h3 className="font-medium mb-2">Upload Documents</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    PDF, TXT, DOC, DOCX files • Up to 50MB
                  </p>
                  
                  {formData.selectedFile ? (
                    <div className="space-y-2">
                      <p className="font-medium">{formData.selectedFile.name}</p>
                      <p className="text-sm text-gray-500">
                        {(formData.selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : null}
                  
                  <input
                    type="file"
                    accept=".pdf,.txt,.doc,.docx"
                    onChange={(e) => setFormData(prev => ({ ...prev, selectedFile: e.target.files?.[0] || null }))}
                    className="hidden"
                    id="doc-upload"
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => document.getElementById('doc-upload')?.click()}
                  >
                    Choose File
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Audio Tab */}
            <TabsContent value="audio" className="mt-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <Mic className="w-8 h-8 mx-auto mb-4 text-gray-400" />
                  <h3 className="font-medium mb-2">Upload Audio</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    MP3, WAV, M4A files • Up to 100MB
                  </p>
                  
                  {formData.selectedFile ? (
                    <div className="space-y-2">
                      <p className="font-medium">{formData.selectedFile.name}</p>
                      <p className="text-sm text-gray-500">
                        {(formData.selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : null}
                  
                  <input
                    type="file"
                    accept=".mp3,.wav,.m4a"
                    onChange={(e) => setFormData(prev => ({ ...prev, selectedFile: e.target.files?.[0] || null }))}
                    className="hidden"
                    id="audio-upload"
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => document.getElementById('audio-upload')?.click()}
                  >
                    Choose Audio File
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Link Tab */}
            <TabsContent value="link" className="mt-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="url">Content URL</Label>
                  <Input
                    id="url"
                    placeholder="https://youtube.com/watch?v=... or article URL"
                    value={formData.linkUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, linkUrl: e.target.value }))}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={uploading} 
              className={enhanceWithAI ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700" : ""}
            >
              {uploading ? 'Uploading...' : (enhanceWithAI ? '✨ Upload & Enhance' : 'Upload')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}