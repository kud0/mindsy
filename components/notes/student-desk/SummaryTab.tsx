"use client"

import React, { useState } from 'react';
import { 
  FileText, 
  Target, 
  Brain, 
  BookOpen, 
  Calendar, 
  ExternalLink, 
  CheckCircle, 
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { SummaryTabProps } from '@/types/lecture-data';

export const SummaryTab: React.FC<SummaryTabProps> = ({ summary }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['synthesis', 'retention']));

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  return (
    <div className="max-w-full">
      {/* Title */}
      <div className="sticky top-0 bg-white px-4 py-2 z-20 border-b border-gray-100">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-1">
          <FileText className="w-5 h-5" />
          Summary & Study Plan
        </h2>
        <p className="text-sm text-gray-600">
          Key takeaways and study strategy
        </p>
      </div>

      <div className="p-4 space-y-6">
        
        {/* Synthesis Section */}
        <section className="border border-gray-200 rounded-lg overflow-hidden">
          <div 
            onClick={() => toggleSection('synthesis')}
            className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 cursor-pointer hover:from-blue-100 hover:to-indigo-100 transition-colors"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                Core Message
              </h3>
              {expandedSections.has('synthesis') ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>
          
          {expandedSections.has('synthesis') && (
            <div className="p-4 space-y-4">
              {/* Core Message */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-blue-800 leading-relaxed font-medium">
                  {summary.synthesis.coreMessage}
                </p>
              </div>

              {/* Key Takeaways */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Key Takeaways</h4>
                <ul className="space-y-3">
                  {summary.synthesis.keyTakeaways.map((takeaway, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                      <span className="text-gray-700 leading-relaxed">{takeaway}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Conceptual Framework */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-semibold text-purple-800 mb-2">Conceptual Framework</h4>
                <p className="text-sm text-purple-700 leading-relaxed">
                  {summary.synthesis.conceptualFramework}
                </p>
              </div>

              {/* Big Picture Connection */}
              <div className="bg-orange-50 p-4 rounded-lg">
                <h4 className="font-semibold text-orange-800 mb-2">Big Picture Connection</h4>
                <p className="text-sm text-orange-700 leading-relaxed">
                  {summary.synthesis.bigPictureConnection}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Retention Section */}
        <section className="border border-gray-200 rounded-lg overflow-hidden">
          <div 
            onClick={() => toggleSection('retention')}
            className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 cursor-pointer hover:from-green-100 hover:to-emerald-100 transition-colors"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Brain className="w-5 h-5 text-green-600" />
                Memory & Retention
              </h3>
              {expandedSections.has('retention') ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>
          
          {expandedSections.has('retention') && (
            <div className="p-4 space-y-4">
              {/* Memory Strategy */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">Memory Strategy</h4>
                <p className="text-sm text-green-700 leading-relaxed">
                  {summary.retention.memoryStrategy}
                </p>
              </div>

              {/* Essential Formulas */}
              {summary.retention.essentialFormulas && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-yellow-800 mb-2">Essential Formulas</h4>
                  <p className="text-sm text-yellow-700 leading-relaxed">
                    {summary.retention.essentialFormulas}
                  </p>
                </div>
              )}

              {/* Must Know Facts */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Must Know Facts</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {summary.retention.mustKnowFacts.map((fact, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg">
                      <span className="text-sm text-gray-700">{fact}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Understanding Checkpoints */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Self-Check Questions</h4>
                <ul className="space-y-2">
                  {summary.retention.understandingCheckpoints.map((checkpoint, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-600 font-medium text-sm mt-0.5">?</span>
                      <span className="text-sm text-gray-700">{checkpoint}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>

        {/* Application Section */}
        <section className="border border-gray-200 rounded-lg overflow-hidden">
          <div 
            onClick={() => toggleSection('application')}
            className="bg-gradient-to-r from-orange-50 to-red-50 p-4 cursor-pointer hover:from-orange-100 hover:to-red-100 transition-colors"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-orange-600" />
                Application
              </h3>
              {expandedSections.has('application') ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>
          
          {expandedSections.has('application') && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">Immediate Use</h4>
                  <p className="text-sm text-green-700 leading-relaxed">
                    {summary.application.immediateUse}
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Upcoming Relevance</h4>
                  <p className="text-sm text-blue-700 leading-relaxed">
                    {summary.application.upcomingRelevance}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-purple-800 mb-2">Exam Preparation</h4>
                  <p className="text-sm text-purple-700 leading-relaxed">
                    {summary.application.examPreparation}
                  </p>
                </div>
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-indigo-800 mb-2">Real-world Transfer</h4>
                  <p className="text-sm text-indigo-700 leading-relaxed">
                    {summary.application.realWorldTransfer}
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Study Plan Section */}
        <section className="border border-gray-200 rounded-lg overflow-hidden">
          <div 
            onClick={() => toggleSection('studyPlan')}
            className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 cursor-pointer hover:from-purple-100 hover:to-pink-100 transition-colors"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                Study Timeline
              </h3>
              {expandedSections.has('studyPlan') ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>
          
          {expandedSections.has('studyPlan') && (
            <div className="p-4 space-y-4">
              <div className="space-y-4">
                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-semibold text-green-800 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Now
                  </h4>
                  <p className="text-sm text-gray-700 mt-1">{summary.studyPlan.now}</p>
                </div>
                
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-semibold text-blue-800 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Tonight
                  </h4>
                  <p className="text-sm text-gray-700 mt-1">{summary.studyPlan.tonight}</p>
                </div>
                
                <div className="border-l-4 border-yellow-500 pl-4">
                  <h4 className="font-semibold text-yellow-800 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    This Week
                  </h4>
                  <p className="text-sm text-gray-700 mt-1">{summary.studyPlan.thisWeek}</p>
                </div>
                
                <div className="border-l-4 border-orange-500 pl-4">
                  <h4 className="font-semibold text-orange-800 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Before Exam
                  </h4>
                  <p className="text-sm text-gray-700 mt-1">{summary.studyPlan.beforeExam}</p>
                </div>
                
                <div className="border-l-4 border-purple-500 pl-4">
                  <h4 className="font-semibold text-purple-800 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Long Term
                  </h4>
                  <p className="text-sm text-gray-700 mt-1">{summary.studyPlan.longTerm}</p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Resources Section */}
        <section className="border border-gray-200 rounded-lg overflow-hidden">
          <div 
            onClick={() => toggleSection('resources')}
            className="bg-gradient-to-r from-gray-50 to-slate-50 p-4 cursor-pointer hover:from-gray-100 hover:to-slate-100 transition-colors"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-gray-600" />
                Resources
              </h3>
              {expandedSections.has('resources') ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>
          
          {expandedSections.has('resources') && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Essential</h4>
                  <p className="text-sm text-blue-700 leading-relaxed">
                    {summary.resources.essential}
                  </p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">Practice</h4>
                  <p className="text-sm text-green-700 leading-relaxed">
                    {summary.resources.practice}
                  </p>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-purple-800 mb-2">Deeper Study</h4>
                  <p className="text-sm text-purple-700 leading-relaxed">
                    {summary.resources.deeper}
                  </p>
                </div>
                
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-orange-800 mb-2">Alternative</h4>
                  <p className="text-sm text-orange-700 leading-relaxed">
                    {summary.resources.alternative}
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};