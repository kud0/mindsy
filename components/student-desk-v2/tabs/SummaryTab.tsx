import React from 'react';

interface SummaryTabProps {
  summary: {
    essentialPoints: string[];
    examFocus: {
      mustKnow: string[];
      likelyQuestions: string[];
    };
  };
}

export function SummaryTab({ summary }: SummaryTabProps) {
  if (!summary) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">No summary available for this lecture.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2 pb-6 border-b border-gray-200">
        <h2 className="text-2xl font-semibold text-gray-900">Lecture Summary</h2>
        <p className="text-gray-500">Key takeaways and exam preparation</p>
      </div>

      {/* Essential Points */}
      {summary.essentialPoints && summary.essentialPoints.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-medium text-gray-900">Essential Points</h3>
          <div className="space-y-3">
            {summary.essentialPoints.map((point, index) => (
              <div key={index} className="flex items-start gap-3 p-4 border border-gray-200">
                <span className="flex-shrink-0 w-6 h-6 bg-gray-900 text-white text-sm font-medium flex items-center justify-center">
                  {index + 1}
                </span>
                <p className="text-gray-700 leading-relaxed">{point}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exam Focus */}
      {summary.examFocus && (
        <div className="space-y-6">
          <h3 className="text-xl font-medium text-gray-900">Exam Focus</h3>
          
          <div className="grid gap-6 md:grid-cols-2">
            {/* Must Know */}
            {summary.examFocus.mustKnow && summary.examFocus.mustKnow.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Must Know</h4>
                <div className="border border-gray-200 p-4">
                  <ul className="space-y-2">
                    {summary.examFocus.mustKnow.map((item, index) => (
                      <li key={index} className="flex items-start gap-2 text-gray-700 text-sm">
                        <span className="w-1.5 h-1.5 bg-gray-700 flex-shrink-0 mt-1.5"></span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Likely Questions */}
            {summary.examFocus.likelyQuestions && summary.examFocus.likelyQuestions.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Likely Questions</h4>
                <div className="border border-gray-200 p-4">
                  <ul className="space-y-2">
                    {summary.examFocus.likelyQuestions.map((question, index) => (
                      <li key={index} className="flex items-start gap-2 text-gray-700 text-sm">
                        <span className="text-gray-500 text-xs mt-0.5">?</span>
                        {question}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Study Recommendations */}
      <div className="border-t border-gray-200 pt-6">
        <div className="p-4 border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-2 text-sm">Study Recommendations</h4>
          <ul className="space-y-1 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-gray-700 flex-shrink-0 mt-1.5"></span>
              Review essential points multiple times for retention
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-gray-700 flex-shrink-0 mt-1.5"></span>
              Practice answering the likely exam questions
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-gray-700 flex-shrink-0 mt-1.5"></span>
              Focus extra time on "must know" concepts
            </li>
            {summary.examFocus?.mustKnow && summary.examFocus.mustKnow.length > 0 && (
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-gray-700 flex-shrink-0 mt-1.5"></span>
                Create flashcards for key terminology and concepts
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}