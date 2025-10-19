import React from 'react';
import { BookOpen, Target, AlertCircle, CheckCircle } from 'lucide-react';

interface ContentSummaryTabProps {
  summary?: {
    overview?: string;
    keyTakeaways?: string[];
    mainConcepts?: Array<{
      title: string;
      description: string;
      importance: 'high' | 'medium' | 'low';
    }>;
    actionItems?: string[];
    prerequisites?: string[];
    nextSteps?: string[];
  };
}

export function ContentSummaryTab({ summary }: ContentSummaryTabProps) {
  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="text-gray-400 mb-3">
          <BookOpen className="w-12 h-12 mx-auto" />
        </div>
        <p className="text-gray-600 text-center">No summary available</p>
        <p className="text-sm text-gray-500 text-center mt-2">
          A comprehensive summary will be generated after processing
        </p>
      </div>
    );
  }

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high':
        return 'bg-red-50 border-red-200 text-red-700';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'low':
        return 'bg-green-50 border-green-200 text-green-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  return (
    <div className="min-h-full bg-white">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        
        {/* Overview Section */}
        {summary.overview && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Overview
            </h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 leading-relaxed">
                {summary.overview}
              </p>
            </div>
          </section>
        )}

        {/* Key Takeaways */}
        {summary.keyTakeaways && summary.keyTakeaways.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Key Takeaways
            </h2>
            <div className="space-y-2">
              {summary.keyTakeaways.map((takeaway, index) => (
                <div 
                  key={index} 
                  className="flex gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100"
                >
                  <CheckCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-gray-700 flex-1">{takeaway}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Main Concepts */}
        {summary.mainConcepts && summary.mainConcepts.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Main Concepts</h2>
            <div className="grid gap-3">
              {summary.mainConcepts.map((concept, index) => (
                <div 
                  key={index}
                  className={`rounded-lg border p-4 ${getImportanceColor(concept.importance)}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-medium">{concept.title}</h3>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-white/70">
                      {concept.importance} priority
                    </span>
                  </div>
                  <p className="text-sm opacity-90">{concept.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Prerequisites */}
        {summary.prerequisites && summary.prerequisites.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Prerequisites
            </h2>
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <ul className="space-y-2">
                {summary.prerequisites.map((prereq, index) => (
                  <li key={index} className="flex items-start gap-2 text-gray-700">
                    <span className="text-yellow-600 mt-1">•</span>
                    <span>{prereq}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Action Items */}
        {summary.actionItems && summary.actionItems.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Action Items</h2>
            <div className="space-y-2">
              {summary.actionItems.map((item, index) => (
                <label 
                  key={index}
                  className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input 
                    type="checkbox" 
                    className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-gray-700 flex-1">{item}</span>
                </label>
              ))}
            </div>
          </section>
        )}

        {/* Next Steps */}
        {summary.nextSteps && summary.nextSteps.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Next Steps</h2>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <ol className="space-y-2">
                {summary.nextSteps.map((step, index) => (
                  <li key={index} className="flex items-start gap-3 text-gray-700">
                    <span className="font-medium text-green-700 shrink-0">
                      {index + 1}.
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}