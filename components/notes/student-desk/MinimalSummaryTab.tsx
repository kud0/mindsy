import React from 'react';

interface MinimalSummaryProps {
  summary: {
    essentialPoints: string[];
    examFocus: {
      mustKnow: string[];
      likelyQuestions: string[];
    };
  };
}

export const MinimalSummaryTab: React.FC<MinimalSummaryProps> = ({ summary }) => {
  if (!summary) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-gray-600">No summary available.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Essential Points */}
      {summary.essentialPoints && summary.essentialPoints.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            📋 Essential Points
          </h2>
          <div className="space-y-3">
            {summary.essentialPoints.map((point, index) => (
              <div key={index} className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white text-sm font-medium rounded-full flex items-center justify-center">
                  {index + 1}
                </span>
                <p className="text-gray-800 leading-relaxed">{point}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exam Focus */}
      {summary.examFocus && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            🎯 Exam Focus
          </h2>
          
          {/* Must Know */}
          {summary.examFocus.mustKnow && summary.examFocus.mustKnow.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="font-semibold text-green-800 mb-4">Must Know</h3>
              <ul className="space-y-2">
                {summary.examFocus.mustKnow.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-green-700">
                    <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-2"></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Likely Questions */}
          {summary.examFocus.likelyQuestions && summary.examFocus.likelyQuestions.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="font-semibold text-yellow-800 mb-4">Likely Questions</h3>
              <ul className="space-y-2">
                {summary.examFocus.likelyQuestions.map((question, index) => (
                  <li key={index} className="flex items-start gap-2 text-yellow-700">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0 mt-2"></span>
                    {question}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};