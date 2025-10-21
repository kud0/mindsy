import React from 'react';
import { BookOpen, Target, List } from 'lucide-react';
import { TutorContextMenu } from '../TutorContextMenu';

interface Explanation {
  id: string;
  concept: string;
  introduction?: string;
  sections?: Array<{
    heading: string;
    content: string;
    points?: string[];
  }>;
  importance?: 'high' | 'medium' | 'low';
}

interface OverviewTabProps {
  overview: {
    mainTopic: string;
    keyObjectives: string[];
    coreConceptsList: string[];
  };
  metadata: {
    title: string;
    difficulty: string;
    estimatedTime: string;
    subjectDomain: string;
    examImportance: string;
  };
  explanations?: Explanation[];
  onTutorExplain?: (selectedText: string, tabName: string, sectionContext: string) => void;
}

export function OverviewTab({ overview, metadata, explanations = [], onTutorExplain }: OverviewTabProps) {
  // Helper to get first sentence from introduction
  const getFirstSentence = (text?: string): string => {
    if (!text) return '';
    const match = text.match(/^[^.!?]+[.!?]/);
    return match ? match[0] : text.substring(0, 100) + '...';
  };

  // Build section context for AI tutor
  const getSectionContext = (): string => {
    const parts: string[] = [];

    // Add main topic
    if (overview.mainTopic) {
      parts.push(`Introduction: ${overview.mainTopic}`);
    }

    // Add objectives
    if (overview.keyObjectives && overview.keyObjectives.length > 0) {
      parts.push(`Learning Objectives: ${overview.keyObjectives.join('; ')}`);
    }

    // Add class outline
    if (explanations && explanations.length > 0) {
      const outline = explanations.map((exp, i) =>
        `${i + 1}. ${exp.concept}: ${getFirstSentence(exp.introduction)}`
      ).join(' ');
      parts.push(`Class Outline: ${outline}`);
    }

    return parts.join('\n\n');
  };

  // Handle tutor explain callback
  const handleExplain = (selectedText: string) => {
    if (onTutorExplain) {
      const context = getSectionContext();
      onTutorExplain(selectedText, 'overview', context);
    }
  };

  const content = (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Lecture Header */}
      <div className="text-center space-y-2 pb-6 border-b border-border">
        <h1 className="text-2xl font-semibold text-foreground">{metadata.title}</h1>
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <span>{metadata.estimatedTime}</span>
          <span>•</span>
          <span className="capitalize">{metadata.difficulty}</span>
          <span>•</span>
          <span className="capitalize">{metadata.examImportance} importance</span>
        </div>
      </div>

      {/* Introduction */}
      {overview.mainTopic && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-foreground" />
            <h2 className="text-xl font-semibold text-foreground">Introduction</h2>
          </div>
          <p className="text-foreground leading-relaxed pl-7">{overview.mainTopic}</p>
        </div>
      )}

      {/* Class Outline */}
      {explanations && explanations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <List className="w-5 h-5 text-foreground" />
            <h2 className="text-xl font-semibold text-foreground">Class Outline</h2>
          </div>
          <div className="space-y-3 pl-7">
            {explanations.map((explanation, index) => (
              <div key={explanation.id} className="space-y-1">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 text-sm font-medium text-muted-foreground mt-0.5">
                    {index + 1}.
                  </span>
                  <div className="flex-1 space-y-1">
                    <h3 className="font-medium text-foreground">{explanation.concept}</h3>
                    {explanation.introduction && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {getFirstSentence(explanation.introduction)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Learning Objectives */}
      {overview.keyObjectives && overview.keyObjectives.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-foreground" />
            <h2 className="text-xl font-semibold text-foreground">Learning Objectives</h2>
          </div>
          <div className="space-y-2 pl-7">
            {overview.keyObjectives.map((objective, index) => (
              <div key={index} className="flex items-start gap-3">
                <span className="flex-shrink-0 text-muted-foreground/60 mt-1">✓</span>
                <p className="text-foreground leading-relaxed">{objective}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // If no tutor callback provided, return content as-is
  if (!onTutorExplain) {
    return content;
  }

  // Wrap content in TutorContextMenu if callback is provided
  return (
    <TutorContextMenu onExplain={handleExplain}>
      {content}
    </TutorContextMenu>
  );
}