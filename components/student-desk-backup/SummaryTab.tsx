"use client"

import React from 'react';
import { BookOpen, Clock } from 'lucide-react';

interface SummaryTabProps {
  content: string;
}

export const SummaryTab: React.FC<SummaryTabProps> = ({ content }) => {
  return (
    <div className="p-4 max-w-4xl">
      {/* Key Takeaways Section */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Key Takeaways</h2>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 bg-blue-600 mt-2 flex-shrink-0"></div>
            <span className="text-gray-700">Machine learning algorithms can be categorized into supervised, unsupervised, and reinforcement learning</span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 bg-blue-600 mt-2 flex-shrink-0"></div>
            <span className="text-gray-700">Model evaluation is crucial for assessing performance and avoiding overfitting</span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 bg-blue-600 mt-2 flex-shrink-0"></div>
            <span className="text-gray-700">Different algorithms work better for different types of problems and data</span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 bg-blue-600 mt-2 flex-shrink-0"></div>
            <span className="text-gray-700">Understanding your data characteristics is essential for choosing the right approach</span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 bg-blue-600 mt-2 flex-shrink-0"></div>
            <span className="text-gray-700">Feature engineering and data preprocessing significantly impact model performance</span>
          </li>
        </ul>
      </section>

      {/* Overview Sections */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Overview</h2>
        <div className="space-y-6">
          
          <div>
            <h3 className="font-medium text-gray-900 mb-2">What is Machine Learning?</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              Machine learning is a method of data analysis that automates analytical model building. 
              It's based on the idea that systems can learn from data, identify patterns, and make 
              decisions with minimal human intervention.
            </p>
            <div className="flex gap-2">
              <button className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-sm hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <BookOpen className="w-3 h-3" />
                Jump to explanation
              </button>
              <button className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 text-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500">
                <Clock className="w-3 h-3" />
                Go to 0:45
              </button>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-2">Core Learning Paradigms</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              The three main approaches to machine learning each solve different types of problems. 
              Supervised learning predicts outcomes, unsupervised learning discovers patterns, 
              and reinforcement learning optimizes sequential decisions.
            </p>
            <div className="flex gap-2">
              <button className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-sm hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <BookOpen className="w-3 h-3" />
                Jump to explanation
              </button>
              <button className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 text-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500">
                <Clock className="w-3 h-3" />
                Go to 2:20
              </button>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-2">Model Validation</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              Proper evaluation techniques ensure your model generalizes well to new data. 
              This includes splitting data appropriately, using cross-validation, and 
              selecting metrics that align with your business objectives.
            </p>
            <div className="flex gap-2">
              <button className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-sm hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <BookOpen className="w-3 h-3" />
                Jump to explanation
              </button>
              <button className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 text-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500">
                <Clock className="w-3 h-3" />
                Go to 7:15
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* Important Formulas/Definitions Callout */}
      <div className="p-4 bg-amber-50">
        <h3 className="font-medium text-amber-900 mb-2">Key Formula</h3>
        <div className="text-amber-800 font-mono text-sm mb-2">
          Accuracy = (True Positives + True Negatives) / Total Predictions
        </div>
        <p className="text-amber-700 text-sm">
          While accuracy is intuitive, it can be misleading with imbalanced datasets. 
          Consider precision, recall, and F1-score for a more complete picture.
        </p>
      </div>
    </div>
  );
};