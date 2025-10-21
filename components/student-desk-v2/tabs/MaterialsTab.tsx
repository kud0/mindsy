import React, { useState, useEffect } from 'react';
import { Download, FileText, File, Eye, ExternalLink, Loader2 } from 'lucide-react';

interface Material {
  id: string;
  name: string;
  type: 'pdf' | 'txt' | 'doc' | 'docx' | 'slides' | 'audio' | 'video';
  url: string;
  size: string;
}

interface MaterialsTabProps {
  jobId: string;
}

export function MaterialsTab({ jobId }: MaterialsTabProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadMaterials();
  }, [jobId]);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/lectures/${jobId}/materials`, {
        cache: 'no-cache'
      });
      
      if (!response.ok) {
        throw new Error('Failed to load materials');
      }
      
      const data = await response.json();
      
      if (data.success && data.materials) {
        setMaterials(data.materials);
      } else {
        setMaterials([]);
      }
    } catch (err) {
      console.error('Error loading materials:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-foreground" />;
      case 'txt':
      case 'doc':
      case 'docx':
        return <File className="w-5 h-5 text-foreground" />;
      default:
        return <File className="w-5 h-5 text-foreground" />;
    }
  };

  const handleView = async (material: Material) => {
    try {
      // For PDFs, open in new tab using the view endpoint
      if (material.type === 'pdf') {
        const viewUrl = `/api/files/view?path=${encodeURIComponent(material.url)}`;
        window.open(viewUrl, '_blank');
      } else {
        // For other files, download them
        handleDownload(material);
      }
    } catch (err) {
      console.error('Error viewing file:', err);
    }
  };

  const handleDownload = async (material: Material) => {
    try {
      setDownloadingIds(prev => new Set([...prev, material.id]));
      
      const downloadUrl = `/api/files/download?path=${encodeURIComponent(material.url)}&filename=${encodeURIComponent(material.name)}`;
      
      // Create a temporary link and click it to trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = material.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (err) {
      console.error('Error downloading file:', err);
    } finally {
      setDownloadingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(material.id);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading materials...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Failed to load materials</p>
          <button
            onClick={loadMaterials}
            className="px-4 py-2 text-sm border border-border text-foreground hover:border-border/80 hover:bg-muted transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 pb-6 border-b border-border">
        <h2 className="text-2xl font-semibold text-foreground">Study Materials</h2>
        <p className="text-muted-foreground">
          {materials.length === 0 ? 'No materials available' : `${materials.length} file${materials.length === 1 ? '' : 's'} available`}
        </p>
      </div>

      {materials.length === 0 ? (
        <div className="text-center py-12">
          <File className="w-16 h-16 mx-auto mb-4 text-muted-foreground/40" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Materials Available</h3>
          <p className="text-muted-foreground">
            Materials will appear here when they are uploaded or generated for this lecture.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {materials.map((material) => {
            const isDownloading = downloadingIds.has(material.id);

            return (
              <div key={material.id} className="p-4 border border-border hover:bg-muted transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getFileIcon(material.type)}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground truncate">{material.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground uppercase">{material.type}</span>
                        <span className="text-muted-foreground/40">•</span>
                        <span className="text-xs text-muted-foreground">{material.size}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {/* View Button */}
                    <button
                      onClick={() => handleView(material)}
                      className="p-2 border border-border hover:border-border/80 hover:bg-background transition-colors"
                      title={material.type === 'pdf' ? 'View PDF' : 'Open file'}
                    >
                      {material.type === 'pdf' ? (
                        <Eye className="w-4 h-4 text-foreground" />
                      ) : (
                        <ExternalLink className="w-4 h-4 text-foreground" />
                      )}
                    </button>

                    {/* Download Button */}
                    <button
                      onClick={() => handleDownload(material)}
                      disabled={isDownloading}
                      className="p-2 border border-border hover:border-border/80 hover:bg-background transition-colors disabled:opacity-50"
                      title="Download file"
                    >
                      {isDownloading ? (
                        <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 text-foreground" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Instructions */}
      {materials.length > 0 && (
        <div className="border-t border-border pt-6">
          <div className="p-4 border border-border">
            <h4 className="font-medium text-foreground mb-2 text-sm">How to Use Materials</h4>
            <ul className="space-y-1 text-sm text-foreground">
              <li className="flex items-start gap-2">
                <Eye className="w-3 h-3 mt-1 text-muted-foreground" />
                Click the view icon to open PDFs in a new tab
              </li>
              <li className="flex items-start gap-2">
                <Download className="w-3 h-3 mt-1 text-muted-foreground" />
                Click the download icon to save files to your device
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-foreground flex-shrink-0 mt-1.5"></span>
                Use materials alongside the lecture content for comprehensive study
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}