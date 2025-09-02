"use client"

import React from 'react';
import { Eye, Clock, BookOpen, Target, Lightbulb } from 'lucide-react';
import { OverviewTabProps } from '@/types/lecture-data';

export const OverviewTab: React.FC<OverviewTabProps> = ({ overview, metadata }) => {
  return (
    <div className="max-w-full">
      {/* Title */}
      <div className="sticky top-0 bg-white px-4 py-2 z-20">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
          <Eye className="w-5 h-5" />
          Lecture Overview
        </h2>
      </div>

      <div className="p-4 space-y-6">
        {/* Lecture Hook & Metadata */}
        <section className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-start gap-3 mb-3">
            <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">¿Por qué es importante?</h3>
              <p className="text-gray-700 text-sm leading-relaxed">{metadata.hook}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-600 mt-3">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {metadata.estimatedTime}
            </span>
            <span className="bg-gray-200 px-2 py-1 rounded-full text-xs">
              {metadata.difficulty}
            </span>
            <span className="text-xs text-gray-500">
              {metadata.examRelevance}
            </span>
          </div>
        </section>

        {/* The Big Picture */}
        <section>
          <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <Target className="w-5 h-5 text-orange-600" />
            The Big Picture
          </h3>
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-700 leading-relaxed">{overview.theBigPicture}</p>
          </div>
        </section>

        {/* Why Care Matrix */}
        <section>
          <h3 className="text-xl font-semibold mb-3">Why This Matters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 p-3 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">Practical</h4>
              <p className="text-sm text-green-700">{overview.whyCareMatrix.practical}</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <h4 className="font-medium text-purple-800 mb-2">Academic</h4>
              <p className="text-sm text-purple-700">{overview.whyCareMatrix.academic}</p>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">Personal</h4>
              <p className="text-sm text-yellow-700">{overview.whyCareMatrix.personal}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Societal</h4>
              <p className="text-sm text-blue-700">{overview.whyCareMatrix.societal}</p>
            </div>
          </div>
        </section>

        {/* Learning Path */}
        <section>
          <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            Learning Path
          </h3>
          <div className="space-y-4">
            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-medium text-green-800">Start Here</h4>
              <p className="text-sm text-gray-700 mt-1">{overview.learningPath.startHere}</p>
            </div>
            <div className="border-l-4 border-yellow-500 pl-4">
              <h4 className="font-medium text-yellow-800">Build To</h4>
              <p className="text-sm text-gray-700 mt-1">{overview.learningPath.buildTo}</p>
            </div>
            <div className="border-l-4 border-red-500 pl-4">
              <h4 className="font-medium text-red-800">Master This</h4>
              <p className="text-sm text-gray-700 mt-1">{overview.learningPath.masterThis}</p>
            </div>
          </div>
        </section>

        {/* Core Concepts */}
        <section>
          <h3 className="text-xl font-semibold mb-3">Core Ideas</h3>
          <ul className="space-y-2">
            {overview.conceptInventory.coreIdeas.map((idea, index) => (
              <li key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0" />
                <span className="text-sm text-gray-700 leading-relaxed">{idea}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Prerequisites */}
        <section>
          <h3 className="text-xl font-semibold mb-3">Prerequisites</h3>
          <div className="bg-orange-50 p-4 rounded-lg">
            <p className="text-sm text-orange-800 leading-relaxed">
              {overview.conceptInventory.prerequisites}
            </p>
          </div>
        </section>

        {/* Study Strategy */}
        <section>
          <h3 className="text-xl font-semibold mb-3">Study Strategy</h3>
          <div className="bg-indigo-50 p-4 rounded-lg">
            <p className="text-sm text-indigo-800 leading-relaxed">
              {overview.studyStrategy}
            </p>
          </div>
        </section>

        {/* Surprising Fact */}
        <section className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2 text-yellow-800">💡 Surprising Fact</h3>
          <p className="text-sm text-yellow-700 leading-relaxed">
            {metadata.surprisingFact}
          </p>
        </section>
      </div>
    </div>
  );
};