import React from 'react';
import { Button } from '@/components/ui/button';
import { X, Download } from 'lucide-react';

interface SimplePdfViewerProps {
  jobId: string;
  title: string;
  onClose: () => void;
}

export function SimplePdfViewer({ jobId, title, onClose }: SimplePdfViewerProps) {
  const pdfUrl = `/api/download/${jobId}?format=pdf&inline=true`;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = `/api/download/${jobId}?format=pdf`;
    a.download = `${title}.pdf`;
    a.click();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header - Fixed */}
      <div className="flex items-center justify-between p-4 border-b bg-background flex-shrink-0">
        <h2 className="font-semibold text-sm truncate">{title}</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Viewer - Scrollable */}
      <div className="flex-1 bg-gray-100">
        <embed
          src={pdfUrl}
          type="application/pdf"
          className="w-full h-full"
          title={title}
        />
      </div>
    </div>
  );
}