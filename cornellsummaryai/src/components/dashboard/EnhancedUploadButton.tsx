import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { EnhancedUploadModal } from './EnhancedUploadModal';

interface EnhancedUploadButtonProps {
  onUploadSuccess: (jobId: string, fileName: string) => Promise<void>;
  selectedFolderId?: string | null;
}

export function EnhancedUploadButton({ onUploadSuccess, selectedFolderId }: EnhancedUploadButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const handleUploadSuccess = async (jobId: string, fileName: string, type: 'audio' | 'document' | 'link') => {
    console.log(`Upload successful - Type: ${type}, Job ID: ${jobId}, File: ${fileName}`);
    await onUploadSuccess(jobId, fileName);
  };

  return (
    <>
      <Button 
        onClick={() => setModalOpen(true)}
        className="gap-2"
      >
        <Upload className="w-4 h-4" />
        Upload
      </Button>
      
      <EnhancedUploadModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onUploadSuccess={handleUploadSuccess}
        selectedFolderId={selectedFolderId}
      />
    </>
  );
}