"use client"

import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Lightbulb, AlertTriangle, Users, BookmarkCheck } from 'lucide-react';
import { ExplanationsTabProps } from '@/types/lecture-data';

export const ExplanationsTab: React.FC<ExplanationsTabProps> = ({ explanations }) => {
  const [expandedExplanations, setExpandedExplanations] = useState<Set<string>>(new Set());

  const toggleExplanation = (explanationId: string) => {
    setExpandedExplanations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(explanationId)) {
        newSet.delete(explanationId);
      } else {
        newSet.add(explanationId);
      }
      return newSet;
    });
  };

  if (!explanations || explanations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">No detailed explanations available yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full">
      {/* Title */}
      <div className="sticky top-0 bg-white px-4 py-2 z-20 border-b border-gray-100">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-1">
          <BookOpen className="w-5 h-5" />
          Detailed Explanations
        </h2>
        <p className="text-sm text-gray-600">
          {explanations.length} concepts • Deep understanding
        </p>
      </div>

      <div className="p-4 space-y-6">
        {explanations.map((explanation) => {
          const isExpanded = expandedExplanations.has(explanation.id);

          return (
            <div key={explanation.id} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Explanation Header */}
              <div 
                onClick={() => toggleExplanation(explanation.id)}
                className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 cursor-pointer hover:from-blue-100 hover:to-indigo-100 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {explanation.concept}
                    </h3>
                    <p className="text-sm text-gray-700">
                      {explanation.importance}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="p-4 space-y-6">
                  
                  {/* Multi-Modal Explanation */}
                  <section>
                    <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-yellow-600" />
                      Multiple Perspectives
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Verbal Explanation */}
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h5 className="font-medium text-blue-800 mb-2">📝 Verbal</h5>
                        <p className="text-sm text-blue-700 leading-relaxed">
                          {explanation.multiModalExplanation.verbal}
                        </p>
                      </div>

                      {/* Visual Explanation */}
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h5 className="font-medium text-green-800 mb-2">👁️ Visual</h5>
                        <p className="text-sm text-green-700 leading-relaxed">
                          {explanation.multiModalExplanation.visual}
                        </p>
                      </div>

                      {/* Analogical Explanation */}
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <h5 className="font-medium text-purple-800 mb-2">🔗 Analogy</h5>
                        <p className="text-sm text-purple-700 leading-relaxed">
                          {explanation.multiModalExplanation.analogical}
                        </p>
                      </div>

                      {/* Procedural Explanation */}
                      <div className="bg-orange-50 p-4 rounded-lg">
                        <h5 className="font-medium text-orange-800 mb-2">⚙️ How-to</h5>
                        <p className="text-sm text-orange-700 leading-relaxed">
                          {explanation.multiModalExplanation.procedural}
                        </p>
                      </div>
                    </div>

                    {/* Mathematical & Example */}
                    <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {explanation.multiModalExplanation.mathematical && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h5 className="font-medium text-gray-800 mb-2">📊 Mathematical</h5>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {explanation.multiModalExplanation.mathematical}
                          </p>
                        </div>
                      )}
                      
                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <h5 className="font-medium text-yellow-800 mb-2">💡 Example</h5>
                        <p className="text-sm text-yellow-700 leading-relaxed">
                          {explanation.multiModalExplanation.example}
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Depth Levels */}
                  <section>
                    <h4 className="font-semibold text-gray-800 mb-4">Understanding Levels</h4>
                    <div className="space-y-3">
                      <div className="border-l-4 border-green-500 pl-4">
                        <h5 className="font-medium text-green-800">Surface Level</h5>
                        <p className="text-sm text-gray-700 mt-1">{explanation.depthLevels.surface}</p>
                      </div>
                      <div className="border-l-4 border-yellow-500 pl-4">
                        <h5 className="font-medium text-yellow-800">Working Level</h5>
                        <p className="text-sm text-gray-700 mt-1">{explanation.depthLevels.working}</p>
                      </div>
                      <div className="border-l-4 border-red-500 pl-4">
                        <h5 className="font-medium text-red-800">Deep Level</h5>
                        <p className="text-sm text-gray-700 mt-1">{explanation.depthLevels.deep}</p>
                      </div>
                    </div>
                  </section>

                  {/* Common Confusions */}
                  {explanation.commonConfusions.length > 0 && (
                    <section>
                      <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        Common Confusions
                      </h4>
                      <div className="space-y-3">
                        {explanation.commonConfusions.map((confusion, index) => (
                          <div key={index} className="bg-red-50 border border-red-200 p-4 rounded-lg">
                            <h5 className="font-medium text-red-800 mb-2">
                              ❌ Misconception
                            </h5>
                            <p className="text-sm text-red-700 mb-3">
                              {confusion.confusion}
                            </p>
                            <h5 className="font-medium text-green-800 mb-2">
                              ✅ Clarification
                            </h5>
                            <p className="text-sm text-green-700">
                              {confusion.clarification}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Expert Perspective */}
                  <section>
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-600" />
                      Expert Perspective
                    </h4>
                    <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg">
                      <p className="text-sm text-indigo-700 leading-relaxed">
                        {explanation.expertPerspective}
                      </p>
                    </div>
                  </section>

                  {/* Study Tips */}
                  {explanation.studyTips && (
                    <section>
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <BookmarkCheck className="w-4 h-4 text-green-600" />
                        Study Tips
                      </h4>
                      <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                        <p className="text-sm text-green-700 leading-relaxed">
                          {explanation.studyTips}
                        </p>
                      </div>
                    </section>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};