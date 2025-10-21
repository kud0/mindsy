import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { PersonalNoteCard } from '../PersonalNoteCard';

interface ExplanationSection {
  heading: string;
  content: string;  // Paragraph content with markdown support
  points?: string[];  // Optional bullet points after content
}

interface Explanation {
  id: string;
  concept: string;  // MUST be specific (e.g., "Estructura del Esqueleto Axial")
  section?: string;  // Logical section/theme grouping (e.g., "Anatomía General")
  timestamps?: {     // When discussed in lecture (for audio seeking)
    start: number;
    end: number;
  };
  introduction: string;  // Opening paragraph explaining the concept
  sections?: ExplanationSection[];  // Subsections with headers
  importance: 'high' | 'medium' | 'low';
  example?: string;

  // Legacy format support (will be removed after migration)
  explanation?: string;
  keyPoints?: string[];
}

interface ExplanationsTabProps {
  explanations: Explanation[];
  itemType?: string; // Flexible type name (e.g., "concept", "topic", "section") - defaults to "item"
  onSeekToTime?: (timeInSeconds: number) => void; // Callback to seek audio player
  jobId?: string; // Job ID for notes
  onTutorExplain?: (selectedText: string, tabName: string, sectionContext: string) => void; // AI Tutor
}

export function ExplanationsTab({ explanations, itemType = 'item', onSeekToTime, jobId, onTutorExplain }: ExplanationsTabProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [userNotes, setUserNotes] = useState<Record<string, string>>({});

  // Pluralize the item type
  const pluralType = explanations.length === 1 ? itemType : `${itemType}s`;

  // Fetch user notes on mount
  useEffect(() => {
    if (!jobId) return;

    const fetchNotes = async () => {
      try {
        const response = await fetch(`/api/lectures/${jobId}/notes`);
        if (!response.ok) return;

        const data = await response.json();
        const notesMap: Record<string, string> = {};

        data.notes?.forEach((note: any) => {
          if (note.content_type === 'explanation') {
            notesMap[note.content_id] = note.note_content;
          }
        });

        setUserNotes(notesMap);
      } catch (error) {
        console.error('Failed to fetch notes:', error);
      }
    };

    fetchNotes();
  }, [jobId]);

  const toggleExpansion = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionName)) {
        newSet.delete(sectionName);
      } else {
        newSet.add(sectionName);
      }
      return newSet;
    });
  };

  // Helper to format timestamp as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Group explanations by section (if sections exist)
  const groupedExplanations = React.useMemo(() => {
    const hasSections = explanations.some(exp => exp.section);

    if (!hasSections) {
      // No sections - return single default group
      return [{ sectionName: null, explanations: explanations }];
    }

    // Group by section
    const groups: Record<string, Explanation[]> = {};
    explanations.forEach(exp => {
      const section = exp.section || 'Uncategorized';
      if (!groups[section]) groups[section] = [];
      groups[section].push(exp);
    });

    return Object.entries(groups).map(([sectionName, exps]) => ({
      sectionName,
      explanations: exps
    }));
  }, [explanations]);

  if (!explanations || explanations.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">No detailed explanations available for this lecture.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {groupedExplanations.map((group, groupIndex) => {
        const showSectionHeader = group.sectionName && group.explanations.length > 1; // Only show header if multiple explanations
        const isSectionExpanded = !showSectionHeader || expandedSections.has(group.sectionName); // Always expanded if no header

        return (
          <div key={group.sectionName || 'default'} className="space-y-3">
            {/* Section Header (only if multiple explanations) */}
            {showSectionHeader && (
              <div className="mb-4">
                <button
                  onClick={() => toggleSection(group.sectionName!)}
                  className="flex items-center gap-2 w-full text-left hover:bg-muted p-2 rounded transition-colors"
                >
                  <h2 className="text-lg font-bold text-foreground">{group.sectionName}</h2>
                  <span className="text-sm text-muted-foreground">({group.explanations.length})</span>
                  {isSectionExpanded ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground ml-auto" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground ml-auto" />
                  )}
                </button>
                <div className="h-px bg-border mt-2" />
              </div>
            )}

            {/* Explanations in this section */}
            {isSectionExpanded && (
              <div className="space-y-3">
                {group.explanations.map((explanation, index) => {
                  const isExpanded = expandedItems.has(explanation.id);

                  return (
                    <div key={explanation.id} className="border border-border rounded-lg overflow-hidden">
                      {/* Header - Clickable */}
                      <div className="flex items-center">
                        <button
                          onClick={() => toggleExpansion(explanation.id)}
                          className="flex-1 p-4 text-left hover:bg-muted transition-colors flex items-center gap-3"
                        >
                          {/* Numbered badge */}
                          <div className="flex-shrink-0 w-8 h-8 bg-orange-500 dark:bg-orange-600 text-white rounded flex items-center justify-center font-semibold text-sm">
                            {index + 1}
                          </div>

                          {/* Concept name */}
                          <h3 className="flex-1 font-semibold text-foreground">{explanation.concept}</h3>

                          {/* Expand/collapse icon */}
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                          )}
                        </button>

                        {/* Timestamp button (if available) */}
                        {explanation.timestamps && onSeekToTime && (
                          <button
                            onClick={() => onSeekToTime(explanation.timestamps!.start)}
                            className="px-3 py-2 mr-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors whitespace-nowrap"
                            title={`Jump to ${formatTime(explanation.timestamps.start)}`}
                          >
                            ⏵ {formatTime(explanation.timestamps.start)}
                          </button>
                        )}
                      </div>

              {/* Content - Only visible when expanded */}
              {isExpanded && (
                <div className="px-4 pb-4 pl-16 space-y-4">
                  {/* New format: Introduction + Sections */}
                  {explanation.introduction ? (
                    <>
                      {/* Introduction paragraph */}
                      <div className="text-foreground leading-relaxed">
                        {explanation.introduction}
                      </div>

                      {/* Subsections with headers (like competitor) */}
                      {explanation.sections && explanation.sections.length > 0 && (
                        <div className="space-y-4">
                          {explanation.sections.map((section, sectionIdx) => (
                            <div key={`${explanation.id}-section-${sectionIdx}`} className="space-y-2">
                              {/* Section header */}
                              <h4 className="font-semibold text-foreground text-base">
                                {section.heading}
                              </h4>

                              {/* Section content paragraph */}
                              {section.content && (
                                <div className="text-foreground leading-relaxed">
                                  {section.content}
                                </div>
                              )}

                              {/* Section bullet points (if present) */}
                              {section.points && section.points.length > 0 && (
                                <ul className="space-y-1.5 ml-4">
                                  {section.points.map((point, pointIdx) => (
                                    <li key={`${explanation.id}-section-${sectionIdx}-point-${pointIdx}`} className="flex items-start gap-2">
                                      <span className="text-foreground">•</span>
                                      <span className="text-foreground flex-1">{point}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    /* Legacy format fallback */
                    <>
                      {/* Main Explanation */}
                      <div className="text-foreground leading-relaxed">
                        {explanation.explanation || 'No explanation available'}
                      </div>

                      {/* Key Points */}
                      {explanation.keyPoints && explanation.keyPoints.length > 0 && (
                        <div className="space-y-2">
                          <ul className="space-y-2">
                            {explanation.keyPoints.map((point, idx) => (
                              <li key={`${explanation.id}-point-${idx}`} className="flex items-start gap-2">
                                <span className="text-foreground">•</span>
                                <span className="text-foreground flex-1">{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}

                  {/* Example - if present (both formats) */}
                  {explanation.example && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-sm font-medium text-foreground mb-2">Example:</p>
                      <p className="text-foreground text-sm">{explanation.example}</p>
                    </div>
                  )}

                  {/* Personal Note Card */}
                  {jobId && (
                    <PersonalNoteCard
                      jobId={jobId}
                      contentType="explanation"
                      contentId={explanation.id}
                      initialNote={userNotes[explanation.id] || ''}
                      placeholder="Add your own understanding, examples, or key points in your own words..."
                      onSave={(note) => {
                        setUserNotes(prev => ({
                          ...prev,
                          [explanation.id]: note
                        }));
                      }}
                    />
                  )}
                </div>
              )}
            </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Expand/Collapse All - at bottom */}
      {explanations.length > 3 && (
        <div className="flex justify-center pt-2">
          <div className="flex gap-2">
            <button
              onClick={() => setExpandedItems(new Set(explanations.map(e => e.id)))}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={() => setExpandedItems(new Set())}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
            >
              Collapse All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}