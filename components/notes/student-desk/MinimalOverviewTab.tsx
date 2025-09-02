import React from 'react';

interface MinimalOverviewTabProps {
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

export const MinimalOverviewTab: React.FC<MinimalOverviewTabProps> = ({ overview, metadata }) => {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Lecture Overview */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">{metadata.title}</h1>
        <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
          <span>{metadata.estimatedTime}</span>
          <span>•</span>
          <span>{metadata.difficulty}</span>
          <span>•</span>
          <span>{metadata.examImportance}</span>
        </div>
      </div>

      {/* Main Topic */}
      {overview.mainTopic && (
        <div className="bg-orange-50 border-l-4 border-orange-500 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
            📋 Main Topic
          </h2>
          <p className="text-gray-800 leading-relaxed">{overview.mainTopic}</p>
        </div>
      )}

      {/* Key Objectives */}
      {overview.keyObjectives && overview.keyObjectives.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            🎯 Key Objectives
          </h2>
          <div className="space-y-3">
            {overview.keyObjectives.map((objective, index) => (
              <div key={index} className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white text-sm font-medium rounded-full flex items-center justify-center">
                  {index + 1}
                </span>
                <p className="text-gray-800 leading-relaxed">{objective}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Core Concepts */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          💡 Core Concepts
        </h2>
        <div className="grid gap-3">
          {overview.coreConceptsList.map((concept, index) => (
            <div key={index} className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white text-sm font-medium rounded-full flex items-center justify-center">
                {index + 1}
              </span>
              <p className="text-gray-800 leading-relaxed">{concept}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};