import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface MinimalExplanation {
  id: string;
  concept: string;
  importance: string;
  explanation: string;
  keyPoints?: string[];
  example?: string;
}

interface MinimalExplanationsTabProps {
  explanations: MinimalExplanation[];
}

export const MinimalExplanationsTab: React.FC<MinimalExplanationsTabProps> = ({ explanations }) => {
  const [expandedExplanations, setExpandedExplanations] = useState<Set<string>>(new Set());

  const toggleExplanation = (id: string) => {
    setExpandedExplanations(prev => {
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
        <p className="text-gray-600">No explanations available.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Detailed Explanations</h2>
        <p className="text-gray-600">{explanations.length} concept explanations</p>
      </div>

      {explanations.map((explanation) => {
        const isExpanded = expandedExplanations.has(explanation.id);
        
        return (
          <div key={explanation.id} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Header */}
            <button
              onClick={() => toggleExplanation(explanation.id)}
              className="w-full p-4 text-left bg-blue-50 hover:bg-blue-100 transition-colors flex items-center justify-between"
            >
              <div>
                <h3 className="font-semibold text-gray-900">{explanation.concept}</h3>
                <span className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${
                  explanation.importance === 'high' ? 'bg-red-100 text-red-800' :
                  explanation.importance === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {explanation.importance}
                </span>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>

            {/* Content */}
            {isExpanded && (
              <div className="p-6 space-y-4">
                {/* Main Explanation */}
                <div className="prose max-w-none">
                  <p className="text-gray-800 leading-relaxed">{explanation.explanation}</p>
                </div>

                {/* Key Points */}
                {explanation.keyPoints && explanation.keyPoints.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-800 mb-2">Key Points</h4>
                    <ul className="space-y-1">
                      {explanation.keyPoints.map((point, index) => (
                        <li key={index} className="flex items-start gap-2 text-green-700">
                          <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-2"></span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Example */}
                {explanation.example && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-800 mb-2">💡 Example</h4>
                    <p className="text-yellow-700">{explanation.example}</p>
                  </div>
                )}

              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};