"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  Play, 
  Eye, 
  GitCompare, 
  Clock, 
  HelpCircle, 
  RefreshCw, 
  Zap,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface JsonFileInfo {
  filename: string;
  title: string;
  questionsCount: number;
  size: string;
  lastModified: string;
}

export default function JsonSelector() {
  const router = useRouter();
  const [files, setFiles] = useState<JsonFileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  // Load available JSON files
  useEffect(() => {
    const loadFiles = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔍 Loading available JSON files...');
        
        const response = await fetch('/api/demo/lecture-data/sample-lecture.json', {
          method: 'OPTIONS'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to load file list: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.availableFiles) {
          throw new Error('No files data received');
        }
        
        console.log('✅ Available JSON files:', data.availableFiles);
        setFiles(data.availableFiles);
        
      } catch (err) {
        console.error('❌ Error loading files:', err);
        setError(`${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    loadFiles();
  }, []);

  const handleFileSelect = (filename: string) => {
    if (selectedFiles.includes(filename)) {
      setSelectedFiles(selectedFiles.filter(f => f !== filename));
    } else if (selectedFiles.length < 2) {
      setSelectedFiles([...selectedFiles, filename]);
    } else {
      // Replace the first selection if already have 2
      setSelectedFiles([selectedFiles[1], filename]);
    }
  };

  const handleOpenFile = (filename: string) => {
    router.push(`/demo/student-desk/${filename}`);
  };

  const handleCompareFiles = () => {
    if (selectedFiles.length === 2) {
      router.push(`/demo/student-desk/compare?files=${selectedFiles[0]},${selectedFiles[1]}`);
    }
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDifficultyColor = (questionsCount: number) => {
    if (questionsCount <= 3) return 'text-green-600 bg-green-100';
    if (questionsCount <= 7) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getDifficultyLabel = (questionsCount: number) => {
    if (questionsCount <= 3) return 'Simple';
    if (questionsCount <= 7) return 'Medium';
    return 'Complex';
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Discovering JSON files...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <FileText className="w-12 h-12 mx-auto mb-3" />
            <p className="text-lg font-semibold">Failed to Load Files</p>
          </div>
          <p className="text-red-600 mb-4 text-sm">{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">No JSON files found</p>
          <p className="text-sm text-gray-500">
            Add JSON files to <code>/data/student-desk/</code> to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          📚 Flexible StudentDesk Demo
        </h1>
        <p className="text-gray-600 mb-4">
          Choose JSON files to test different lecture structures
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
          <Zap className="w-4 h-4" />
          <span>Intelligent JSON structure adaptation enabled</span>
        </div>
      </div>

      {/* Comparison Controls */}
      {selectedFiles.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-800">
                {selectedFiles.length === 1 
                  ? 'Select one more file to compare structures'
                  : 'Ready to compare JSON structures'
                }
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline" 
                size="sm"
                onClick={() => setSelectedFiles([])}
              >
                Clear
              </Button>
              {selectedFiles.length === 2 && (
                <Button size="sm" onClick={handleCompareFiles}>
                  <GitCompare className="w-4 h-4 mr-2" />
                  Compare
                </Button>
              )}
            </div>
          </div>
          {selectedFiles.length > 0 && (
            <div className="mt-2 text-sm text-blue-700">
              Selected: {selectedFiles.join(', ')}
            </div>
          )}
        </div>
      )}

      {/* File Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {files.map((file) => {
          const isSelected = selectedFiles.includes(file.filename);
          
          return (
            <Card 
              key={file.filename} 
              className={`transition-all hover:shadow-lg cursor-pointer ${
                isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'
              }`}
              onClick={() => handleFileSelect(file.filename)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg font-semibold truncate">
                      {file.title}
                    </CardTitle>
                    <p className="text-sm text-gray-500 font-mono mt-1">
                      {file.filename}
                    </p>
                  </div>
                  <div className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(file.questionsCount)}`}>
                    {getDifficultyLabel(file.questionsCount)}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-purple-500" />
                    <span>{file.questionsCount} questions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <span>{file.size}</span>
                  </div>
                </div>
                
                {/* Last Modified */}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>Modified {formatDate(file.lastModified)}</span>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <Button 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenFile(file.filename);
                    }}
                    className="flex-1"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Open
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/demo/student-desk/${file.filename}?preview=true`);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Selection indicator */}
                {isSelected && (
                  <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded text-center">
                    Selected for comparison
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Instructions */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="font-semibold text-gray-800 mb-3">How to Use</h3>
        <div className="space-y-2 text-sm text-gray-700">
          <div className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 mt-0.5 text-blue-500" />
            <span><strong>Single file:</strong> Click "Open" to view in StudentDesk with adaptive JSON mapping</span>
          </div>
          <div className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 mt-0.5 text-green-500" />
            <span><strong>Compare structures:</strong> Click to select 2 files, then click "Compare"</span>
          </div>
          <div className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 mt-0.5 text-purple-500" />
            <span><strong>Add more files:</strong> Drop JSON files in <code>/data/student-desk/</code></span>
          </div>
        </div>
      </div>
    </div>
  );
}