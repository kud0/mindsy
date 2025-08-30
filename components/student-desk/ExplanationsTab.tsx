"use client"

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Clock } from 'lucide-react';

interface ExplanationsTabProps {
  content: string;
}

export const ExplanationsTab: React.FC<ExplanationsTabProps> = ({ content }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

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

  // Parse the content into sections (this is mockup structure for now)
  const sections = [
    {
      id: 'ml-fundamentals',
      title: 'Machine Learning Fundamentals',
      teaser: 'Core concepts and definitions in machine learning',
      content: `<p>Machine learning is a subset of artificial intelligence that enables computers to learn and improve from experience without being explicitly programmed.</p>
        <p>The key insight is that instead of writing specific instructions for every possible scenario, we create algorithms that can identify patterns in data and make predictions or decisions based on those patterns.</p>`,
      timestamp: 120
    },
    {
      id: 'learning-types', 
      title: 'Types of Learning',
      teaser: 'Supervised, unsupervised, and reinforcement learning approaches',
      content: `<p>There are three main categories of machine learning approaches:</p>
        <ul>
          <li><strong>Supervised Learning:</strong> Uses labeled training data to learn input-output relationships</li>
          <li><strong>Unsupervised Learning:</strong> Finds hidden patterns in data without explicit labels</li>
          <li><strong>Reinforcement Learning:</strong> Learns through interaction with an environment using rewards and penalties</li>
        </ul>`,
      timestamp: 280
    },
    {
      id: 'model-evaluation',
      title: 'Model Evaluation Techniques', 
      teaser: 'Methods to assess and validate model performance',
      content: `<p>Proper evaluation is crucial for understanding how well your model will perform on new, unseen data.</p>
        <p>Key evaluation techniques include:</p>
        <ul>
          <li>Train/validation/test splits</li>
          <li>Cross-validation</li>
          <li>Performance metrics (accuracy, precision, recall, F1-score)</li>
          <li>Overfitting and underfitting detection</li>
        </ul>`,
      timestamp: 450
    }
  ];

  return (
    <div className="max-w-full">
      {/* Desktop: Mini TOC */}
      <div className="hidden md:block sticky top-0 bg-white p-4 z-20">
        <h3 className="text-sm font-medium text-gray-700 mb-2">In this explanation:</h3>
        <nav className="flex gap-4">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => {
                const element = document.getElementById(section.id);
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              {section.title}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-4 space-y-6">
        {sections.map(section => {
          const isExpanded = expandedSections.has(section.id);
          
          return (
            <div key={section.id} id={section.id} className="scroll-mt-20">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px]"
                aria-expanded={isExpanded}
              >
                <div className="text-left flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{section.title}</h3>
                  <p className="text-sm text-gray-600">{section.teaser}</p>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
                )}
              </button>
              
              {isExpanded && (
                <div className="px-3 pb-4">
                  <div 
                    className="prose prose-gray max-w-none mb-4"
                    dangerouslySetInnerHTML={{ __html: section.content }}
                  />
                  <div className="flex gap-2">
                    <button 
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-sm hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onClick={() => console.log(`Seeking to ${section.timestamp}s`)}
                    >
                      <Clock className="w-3 h-3" />
                      {Math.floor(section.timestamp / 60)}:{(section.timestamp % 60).toString().padStart(2, '0')}
                    </button>
                    <button className="px-3 py-1 bg-gray-100 text-gray-700 text-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500">
                      Show transcript
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};