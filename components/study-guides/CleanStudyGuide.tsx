'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  BookOpen, 
  BrainCircuit, 
  FileText, 
  Download,
  Calendar,
  Clock,
  Languages,
  GraduationCap
} from 'lucide-react'
import { format } from 'date-fns'

interface StudyGuideQuestion {
  id: string;
  question: string;
  answer: string;
}

interface StudyGuideExplanation {
  title: string;
  content: string;
}

interface StudyGuideSummary {
  overview: string;
  keyTakeaways: string[];
  learningObjectives: string[];
}

interface StudyGuideData {
  id: string;
  title: string;
  subject?: string;
  language: string;
  questions: StudyGuideQuestion[];
  explanations: StudyGuideExplanation[];
  summary: StudyGuideSummary;
  tableOfContents: string;
  createdAt: string;
  updatedAt: string;
  job: {
    id: string;
    title: string;
    status: string;
    pdfPath?: string;
    createdAt: string;
  };
}

interface CleanStudyGuideProps {
  studyGuideId: string;
}

export default function CleanStudyGuide({ studyGuideId }: CleanStudyGuideProps) {
  const [studyGuide, setStudyGuide] = useState<StudyGuideData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStudyGuide();
  }, [studyGuideId]);

  const fetchStudyGuide = async () => {
    try {
      setLoading(true);
      console.log('🎯 CleanStudyGuide: Fetching guide:', studyGuideId);

      const response = await fetch(`/api/study-guides/${studyGuideId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch study guide');
      }

      // Handle the success response wrapper
      const data = result.data || result;

      console.log('✅ CleanStudyGuide: Loaded guide:', {
        title: data.title,
        questions: data.questions?.length || 0,
        explanations: data.explanations?.length || 0,
        job: data.job,
        pdfPath: data.job?.pdfPath,
        fullData: data
      });

      setStudyGuide(data);
    } catch (error) {
      console.error('❌ CleanStudyGuide: Error:', error);
      setError(error instanceof Error ? error.message : 'Failed to load study guide');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!studyGuide?.job?.pdfPath) return;
    
    try {
      const response = await fetch(`/api/files/download?path=${encodeURIComponent(studyGuide.job.pdfPath)}`);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${studyGuide.title}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span>Loading study guide...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6">
          <div className="text-center text-destructive">
            <p className="font-medium">Error loading study guide</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!studyGuide) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          Study guide not found
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold leading-tight">
                {studyGuide.title}
              </CardTitle>
              {studyGuide.subject && (
                <Badge variant="secondary" className="text-sm">
                  <GraduationCap className="w-4 h-4 mr-1" />
                  {studyGuide.subject}
                </Badge>
              )}
            </div>
            {studyGuide.job?.pdfPath && (
              <Button onClick={downloadPDF} className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
            )}
          </div>
          
          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mt-4">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Created {studyGuide.createdAt ? format(new Date(studyGuide.createdAt), 'MMM d, yyyy') : 'Unknown'}
            </div>
            <div className="flex items-center gap-1">
              <Languages className="w-4 h-4" />
              {studyGuide.language === 'es' ? 'Spanish' : 'English'}
            </div>
            <div className="flex items-center gap-1">
              <BrainCircuit className="w-4 h-4" />
              {studyGuide.questions?.length || 0} Questions
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Study Guide Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Study Guide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="questions" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="questions">
                Questions ({studyGuide.questions?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="explanations">
                Explanations ({studyGuide.explanations?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="overview">Overview</TabsTrigger>
            </TabsList>

            {/* Questions Tab */}
            <TabsContent value="questions" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-6">
                  <BrainCircuit className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-lg">Study Questions</h3>
                </div>
                
                {studyGuide.questions?.length > 0 ? (
                  <div className="grid gap-6">
                    {studyGuide.questions.map((question, index) => (
                      <div 
                        key={question.id} 
                        className="bg-primary/90 dark:bg-accent/50 rounded-xl p-6 border-2 border-primary/60 dark:border-primary/70"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <div className="flex-1 space-y-4">
                            {/* Question */}
                            <div>
                              <p 
                                className="text-foreground leading-relaxed font-medium text-lg"
                                dangerouslySetInnerHTML={{
                                  __html: question.question.replace(/\*\*(.*?)\*\*/g, '<strong class="text-primary/80 dark:text-primary/90">$1</strong>')
                                }}
                              />
                            </div>
                            
                            {/* Answer */}
                            <div className="bg-card rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                              <h4 className="font-medium text-sm text-primary/80 dark:text-primary/90 mb-2">
                                {studyGuide.language === 'es' ? 'Respuesta:' : 'Answer:'}
                              </h4>
                              <div className="prose prose-sm max-w-none dark:prose-invert">
                                {question.answer.split('*').filter(point => point.trim()).map((point, i) => (
                                  <div key={i} className="flex items-start gap-2 mb-2">
                                    <span className="text-primary mt-1">•</span>
                                    <span 
                                      className="text-gray-700 dark:text-gray-300"
                                      dangerouslySetInnerHTML={{
                                        __html: point.trim().replace(/\*\*(.*?)\*\*/g, '<strong class="text-primary/80 dark:text-primary/90">$1</strong>')
                                      }}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No questions available
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Explanations Tab */}
            <TabsContent value="explanations" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-6">
                  <FileText className="w-5 h-5 text-secondary" />
                  <h3 className="font-semibold text-lg">Detailed Explanations</h3>
                </div>
                
                {studyGuide.explanations?.length > 0 ? (
                  <div className="space-y-6">
                    {studyGuide.explanations.map((explanation, index) => (
                      <div 
                        key={index}
                        className="bg-secondary/10 dark:bg-secondary/20 rounded-xl p-6 border border-secondary/20 dark:border-secondary/30"
                      >
                        <h4 
                          className="font-semibold text-lg text-secondary-foreground dark:text-secondary-foreground mb-3"
                          dangerouslySetInnerHTML={{
                            __html: explanation.title.replace(/\*\*(.*?)\*\*/g, '<strong class="text-secondary dark:text-secondary">$1</strong>')
                          }}
                        />
                        <div className="prose prose-green max-w-none dark:prose-invert">
                          <p 
                            className="text-secondary-foreground/80 dark:text-secondary-foreground/90 leading-relaxed"
                            dangerouslySetInnerHTML={{
                              __html: explanation.content.replace(/\*\*(.*?)\*\*/g, '<strong class="text-secondary dark:text-secondary">$1</strong>')
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No explanations available
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Summary Tab */}
            <TabsContent value="summary" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-6">
                  <Clock className="w-5 h-5 text-accent" />
                  <h3 className="font-semibold text-lg">Summary</h3>
                </div>
                
                <div className="bg-accent/10 dark:bg-accent/20 rounded-xl p-6 border border-accent/20 dark:border-accent/30">
                  {/* Overview */}
                  {studyGuide.summary?.overview && (
                    <div className="mb-6">
                      <h4 className="font-semibold text-accent-foreground dark:text-accent-foreground mb-3">Overview</h4>
                      <p 
                        className="text-accent-foreground/80 dark:text-accent-foreground/90 leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: studyGuide.summary?.overview.replace(/\*\*(.*?)\*\*/g, '<strong class="text-accent dark:text-accent">$1</strong>') || ''
                        }}
                      />
                    </div>
                  )}

                  {/* Key Takeaways */}
                  {studyGuide.summary?.keyTakeaways?.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-semibold text-accent-foreground dark:text-accent-foreground mb-3">
                        {studyGuide.language === 'es' ? 'Puntos Clave' : 'Key Takeaways'}
                      </h4>
                      <ul className="space-y-2">
                        {studyGuide.summary?.keyTakeaways?.map((takeaway, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-accent mt-1">✓</span>
                            <span 
                              className="text-accent-foreground/80 dark:text-accent-foreground/90"
                              dangerouslySetInnerHTML={{
                                __html: takeaway.replace(/\*\*(.*?)\*\*/g, '<strong class="text-accent dark:text-accent">$1</strong>')
                              }}
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Learning Objectives */}
                  {studyGuide.summary?.learningObjectives?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-accent-foreground dark:text-accent-foreground mb-3">
                        {studyGuide.language === 'es' ? 'Objetivos de Aprendizaje' : 'Learning Objectives'}
                      </h4>
                      <ul className="space-y-2">
                        {studyGuide.summary?.learningObjectives?.map((objective, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-accent mt-1">→</span>
                            <span 
                              className="text-accent-foreground/80 dark:text-accent-foreground/90"
                              dangerouslySetInnerHTML={{
                                __html: objective.replace(/\*\*(.*?)\*\*/g, '<strong class="text-accent dark:text-accent">$1</strong>')
                              }}
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-6">
                  <BookOpen className="w-5 h-5 text-muted-foreground" />
                  <h3 className="font-semibold text-lg">
                    {studyGuide.language === 'es' ? 'Tabla de Contenidos' : 'Table of Contents'}
                  </h3>
                </div>
                
                {studyGuide.tableOfContents ? (
                  <div className="bg-muted/50 dark:bg-muted/20 rounded-xl p-6 border border-muted dark:border-muted">
                    <div className="prose prose-orange max-w-none dark:prose-invert">
                      {studyGuide.tableOfContents?.split('\n').map((item, index) => (
                        <div key={index} className="flex items-start gap-2 py-1">
                          <span className="text-muted-foreground mt-1">▸</span>
                          <span className="text-muted-foreground">{item.trim()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No table of contents available
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}