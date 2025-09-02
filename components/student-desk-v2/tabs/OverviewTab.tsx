import React from 'react';

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
}

export function OverviewTab({ overview, metadata }: OverviewTabProps) {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Lecture Header */}
      <div className="text-center space-y-2 pb-6 border-b border-gray-200">
        <h1 className="text-2xl font-semibold text-gray-900">{metadata.title}</h1>
        <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
          <span>{metadata.estimatedTime}</span>
          <span>•</span>
          <span className="capitalize">{metadata.difficulty}</span>
          <span>•</span>
          <span className="capitalize">{metadata.examImportance} importance</span>
        </div>
      </div>

      {/* Main Topic */}
      {overview.mainTopic && (
        <div className="space-y-3">
          <h2 className="text-xl font-medium text-gray-900">Main Topic</h2>
          <div className="p-4 border border-gray-200 bg-white">
            <p className="text-gray-700 leading-relaxed">{overview.mainTopic}</p>
          </div>
        </div>
      )}

      {/* Key Objectives */}
      {overview.keyObjectives && overview.keyObjectives.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-medium text-gray-900">Key Objectives</h2>
          <div className="space-y-3">
            {overview.keyObjectives.map((objective, index) => (
              <div key={index} className="flex items-start gap-3 p-4 border border-gray-200">
                <span className="flex-shrink-0 w-6 h-6 bg-gray-900 text-white text-sm font-medium flex items-center justify-center">
                  {index + 1}
                </span>
                <p className="text-gray-700 leading-relaxed">{objective}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Core Concepts */}
      {overview.coreConceptsList && overview.coreConceptsList.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-medium text-gray-900">Core Concepts</h2>
          <div className="space-y-2">
            {overview.coreConceptsList.map((concept, index) => (
              <div key={index} className="flex items-start gap-3 p-4 border border-gray-200">
                <span className="flex-shrink-0 w-2 h-2 bg-gray-700 mt-2"></span>
                <p className="text-gray-700 leading-relaxed">{concept}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}