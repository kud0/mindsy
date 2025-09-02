import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Explanation {
  id: string;
  concept: string;
  importance: 'high' | 'medium' | 'low';
  explanation: string;
  keyPoints?: string[];
  example?: string;
  visual?: string;
}

interface ExplanationsTabProps {
  explanations: Explanation[];
}

export function ExplanationsTab({ explanations }: ExplanationsTabProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

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

  if (!explanations || explanations.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">No detailed explanations available for this lecture.</p>
        </div>
      </div>
    );
  }

  // Group by importance
  const groupedByImportance = explanations.reduce((acc, explanation) => {
    const importance = explanation.importance || 'medium';
    if (!acc[importance]) acc[importance] = [];
    acc[importance].push(explanation);
    return acc;
  }, {} as Record<string, Explanation[]>);

  const importanceOrder = ['high', 'medium', 'low'];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 pb-6 border-b border-gray-200">
        <h2 className="text-2xl font-semibold text-gray-900">Detailed Explanations</h2>
        <p className="text-gray-500">{explanations.length} concept explanations</p>
      </div>

      {/* Explanations organized by importance */}
      <div className="space-y-6">
        {importanceOrder.map(importance => {
          const importanceExplanations = groupedByImportance[importance];
          if (!importanceExplanations || importanceExplanations.length === 0) return null;

          return (
            <div key={importance} className="space-y-3">
              {/* Importance header (only if multiple importance levels exist) */}
              {Object.keys(groupedByImportance).length > 1 && (
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-medium text-gray-900 capitalize">{importance} Importance</h3>
                  <div className="flex-1 h-px bg-gray-light"></div>
                  <span className="text-sm text-gray-500">
                    {importanceExplanations.length} concept{importanceExplanations.length === 1 ? '' : 's'}
                  </span>
                </div>
              )}
              
              {/* Explanations */}
              <div className="space-y-2">
                {importanceExplanations.map((explanation) => {
                  const isExpanded = expandedItems.has(explanation.id);
                  
                  return (
                    <div key={explanation.id} className="border border-gray-200">
                      {/* Header */}
                      <button
                        onClick={() => toggleExpansion(explanation.id)}
                        className="w-full p-4 text-left hover:bg-gray-50 transition-colors flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{explanation.concept}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500 capitalize">
                              {explanation.importance} importance
                            </span>
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                        )}
                      </button>

                      {/* Content */}
                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-4 border-t border-gray-200">
                          {/* Main Explanation */}
                          <div>
                            <p className="text-gray-700 leading-relaxed">{explanation.explanation}</p>
                          </div>

                          {/* Key Points */}
                          {explanation.keyPoints && explanation.keyPoints.length > 0 && (
                            <div className="border border-gray-200 p-3">
                              <h4 className="font-medium text-gray-900 mb-2 text-sm">Key Points</h4>
                              <ul className="space-y-1">
                                {explanation.keyPoints.map((point, index) => (
                                  <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                                    <span className="w-1.5 h-1.5 bg-gray-700 flex-shrink-0 mt-1.5"></span>
                                    {point}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Example */}
                          {explanation.example && (
                            <div className="border border-gray-200 p-3">
                              <h4 className="font-medium text-gray-900 mb-2 text-sm">Example</h4>
                              <p className="text-sm text-gray-700">{explanation.example}</p>
                            </div>
                          )}

                          {/* Visual */}
                          {explanation.visual && (
                            <div className="border border-gray-200 p-3">
                              <h4 className="font-medium text-gray-900 mb-2 text-sm">Visual Reference</h4>
                              <p className="text-sm text-gray-700">{explanation.visual}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Expand/Collapse All */}
      {explanations.length > 3 && (
        <div className="flex justify-center pt-4 border-t border-gray-200">
          <div className="flex gap-2">
            <button
              onClick={() => setExpandedItems(new Set(explanations.map(e => e.id)))}
              className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-medium transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={() => setExpandedItems(new Set())}
              className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-medium transition-colors"
            >
              Collapse All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}