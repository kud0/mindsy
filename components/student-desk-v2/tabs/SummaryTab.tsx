import React, { useState, useEffect } from 'react';
import { BookText, Star, AlertTriangle } from 'lucide-react';
import { PersonalNoteCard } from '../PersonalNoteCard';

interface SummaryTabProps {
  summary: {
    // NEW SCHEMA (from Grok generateStudentDeskContent)
    sections?: Array<{
      heading: string;
      content: string;
      keyPoints?: string[];
    }>;
    mustKnow?: Array<{
      concept: string;
      explanation: string;
    }>;
    commonPitfalls?: Array<{
      pitfall: string;
      explanation: string;
      howToAvoid?: string;
    }>;
    // OLD SCHEMA (legacy support)
    essentialPoints?: string[];
    examFocus?: {
      mustKnow: string[];
      likelyQuestions: string[];
    };
  };
  jobId?: string;
  onTutorExplain?: (selectedText: string, tabName: string, sectionContext: string) => void;
}

export function SummaryTab({ summary, jobId, onTutorExplain }: SummaryTabProps) {
  const [userNote, setUserNote] = useState<string>('');

  // Fetch user note on mount
  useEffect(() => {
    if (!jobId) return;

    const fetchNote = async () => {
      try {
        const response = await fetch(`/api/lectures/${jobId}/notes`);
        if (!response.ok) return;

        const data = await response.json();
        const note = data.notes?.find((n: any) =>
          n.content_type === 'summary' && n.content_id === 'overall'
        );

        if (note) {
          setUserNote(note.note_content);
        }
      } catch (error) {
        console.error('Failed to fetch note:', error);
      }
    };

    fetchNote();
  }, [jobId]);

  // Check if we have either NEW format or OLD format data
  const hasNewFormat = summary?.sections && summary.sections.length > 0;
  const hasOldFormat = summary?.essentialPoints && summary.essentialPoints.length > 0;

  if (!summary || (!hasNewFormat && !hasOldFormat)) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">No summary available for this lecture.</p>
        </div>
      </div>
    );
  }

  // If OLD format, convert to NEW format structure for display
  const displaySummary = hasNewFormat ? summary : {
    sections: summary.essentialPoints?.map((point: string, index: number) => ({
      heading: `Key Point ${index + 1}`,
      content: point,
      keyPoints: []
    })) || [],
    mustKnow: summary.examFocus?.mustKnow?.map((concept: string) => ({
      concept: concept,
      explanation: 'Essential concept for exam preparation'
    })) || [],
    commonPitfalls: []
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2 pb-6 border-b border-gray-200">
        <h2 className="text-2xl font-semibold text-gray-900">Lecture Summary</h2>
        <p className="text-gray-500">Key takeaways and exam preparation</p>
      </div>

      {/* Summary Sections */}
      {displaySummary.sections && displaySummary.sections.length > 0 && (
        <div className="space-y-6">
          {displaySummary.sections.map((section, index) => (
            <div key={index} className="space-y-3">
              <div className="flex items-center gap-2">
                <BookText className="w-5 h-5 text-gray-700" />
                <h3 className="text-lg font-semibold text-gray-900">{section.heading}</h3>
              </div>
              <p className="text-gray-700 leading-relaxed pl-7">{section.content}</p>
              {section.keyPoints && section.keyPoints.length > 0 && (
                <ul className="space-y-2 pl-7">
                  {section.keyPoints.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-700">
                      <span className="flex-shrink-0 w-1.5 h-1.5 bg-gray-700 rounded-full mt-2"></span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Must-Know Concepts */}
      {displaySummary.mustKnow && displaySummary.mustKnow.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-600" />
            <h3 className="text-lg font-semibold text-gray-900">Must-Know Concepts</h3>
          </div>
          <div className="space-y-4 pl-7">
            {displaySummary.mustKnow.map((item, index) => (
              <div key={index} className="space-y-1">
                <h4 className="font-medium text-gray-900">{item.concept}</h4>
                <p className="text-sm text-gray-600 leading-relaxed">{item.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Common Pitfalls */}
      {displaySummary.commonPitfalls && displaySummary.commonPitfalls.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900">Common Pitfalls</h3>
          </div>
          <div className="space-y-4 pl-7">
            {displaySummary.commonPitfalls.map((item, index) => (
              <div key={index} className="space-y-2 bg-orange-50 border-l-4 border-orange-400 p-4">
                <h4 className="font-medium text-gray-900">{item.pitfall}</h4>
                <p className="text-sm text-gray-700 leading-relaxed">{item.explanation}</p>
                {item.howToAvoid && (
                  <p className="text-sm text-gray-600 leading-relaxed mt-2">
                    <span className="font-medium text-gray-900">How to avoid:</span> {item.howToAvoid}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Personal Summary Note */}
      {jobId && (
        <div className="pt-6 border-t border-gray-200">
          <PersonalNoteCard
            jobId={jobId}
            contentType="summary"
            contentId="overall"
            initialNote={userNote}
            placeholder="Add your own summary, key takeaways, or exam prep notes..."
            onSave={(note) => setUserNote(note)}
          />
        </div>
      )}
    </div>
  );
}
