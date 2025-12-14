"use client"

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  GitCompare,
  Eye,
  HelpCircle,
  BookOpen,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface ComparisonData {
  filename: string;
  title: string;
  data: any;
  stats: {
    questionsCount: number;
    explanationsCount: number;
    summaryCount: number;
    fileSize: string;
  };
}

// Wrapper component for Suspense boundary
export default function ComparisonPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center p-8"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent animate-spin"></div></div>}>
      <ComparisonContent />
    </Suspense>
  );
}

function ComparisonContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const files = searchParams.get('files')?.split(',') || [];
  
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (files.length !== 2) {
      setError('Please select exactly 2 files to compare');
      setLoading(false);
      return;
    }

    const loadComparisonData = async () => {
      try {
        setLoading(true);
        setError(null);

        const promises = files.map(async (filename) => {
          const response = await fetch(`/api/demo/lecture-data/${filename}`);
          if (!response.ok) {
            throw new Error(`Failed to load ${filename}: ${response.status}`);
          }
          const apiData = await response.json();
          
          if (apiData.error) {
            throw new Error(apiData.error);
          }

          const lectureData = apiData.data.lecture.data;
          
          return {
            filename,
            title: lectureData.metadata.title,
            data: lectureData,
            stats: {
              questionsCount: lectureData.questions?.length || 0,
              explanationsCount: lectureData.explanations?.length || 0,
              summaryCount: lectureData.summary?.sections?.length || 0,
              fileSize: apiData.data.meta?.fileSize || 'Unknown'
            }
          };
        });

        const results = await Promise.all(promises);
        setComparisonData(results);

      } catch (err) {
        console.error('Error loading comparison data:', err);
        setError(`${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    loadComparisonData();
  }, [files]);

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const renderComparisonRow = (label: string, sectionKey: string, getValue: (data: any) => any) => {
    const isExpanded = expandedSections[sectionKey];
    
    return (
      <div key={sectionKey} className="border-b border-gray-100">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <h3 className="text-lg font-semibold text-gray-800">{label}</h3>
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-500" />
          )}
        </button>
        
        {isExpanded && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 bg-gray-50">
            {comparisonData.map((item, index) => {
              const value = getValue(item.data);
              return (
                <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="font-medium text-gray-700 mb-2 text-sm">
                    {item.filename}
                  </h4>
                  <div className="text-sm text-gray-600">
                    {Array.isArray(value) ? (
                      <div className="space-y-2">
                        {value.length > 0 ? (
                          value.map((item, idx) => (
                            <div key={idx} className="p-2 bg-gray-50 rounded border-l-4 border-blue-200">
                              {typeof item === 'string' ? item : JSON.stringify(item, null, 2)}
                            </div>
                          ))
                        ) : (
                          <span className="text-gray-400">No items found</span>
                        )}
                      </div>
                    ) : typeof value === 'object' && value !== null ? (
                      <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    ) : (
                      <div className="whitespace-pre-wrap">{value || 'No data'}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Comparing JSON structures...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <GitCompare className="w-12 h-12 mx-auto mb-3" />
            <p className="text-lg font-semibold">Comparison Failed</p>
          </div>
          <p className="text-red-600 mb-4 text-sm">{error}</p>
          <div className="space-y-2">
            <Button onClick={() => window.location.reload()} variant="outline" className="mr-2">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
            <Button onClick={() => router.back()} variant="outline">
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (comparisonData.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No files to compare</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <GitCompare className="w-6 h-6 text-blue-600" />
              JSON Structure Comparison
            </h1>
            <p className="text-gray-600">
              Comparing {files.join(' vs ')}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {comparisonData.map((item, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => router.push(`/demo/student-desk/${item.filename}`)}
            >
              <Eye className="w-4 h-4 mr-2" />
              View {item.filename}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {comparisonData.map((item, index) => (
          <Card key={index} className="border-l-4 border-blue-500">
            <CardHeader>
              <CardTitle className="text-lg">{item.title}</CardTitle>
              <p className="text-sm text-gray-500 font-mono">{item.filename}</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-purple-500" />
                  <span>{item.stats.questionsCount} questions</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-green-500" />
                  <span>{item.stats.explanationsCount} explanations</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span>{item.stats.summaryCount} summary sections</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span>{item.stats.fileSize}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Structure Comparison</CardTitle>
          <p className="text-sm text-gray-600">
            Expand sections to compare content side-by-side
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100">
            {renderComparisonRow('Metadata', 'metadata', (data) => data.metadata)}
            {renderComparisonRow('Overview', 'overview', (data) => data.overview)}
            {renderComparisonRow('Questions', 'questions', (data) => data.questions)}
            {renderComparisonRow('Explanations', 'explanations', (data) => data.explanations)}
            {renderComparisonRow('Summary', 'summary', (data) => data.summary)}
            {renderComparisonRow('Study Plan', 'studyPlan', (data) => data.studyPlan)}
            {renderComparisonRow('Materials', 'materials', (data) => data.materials || [])}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}