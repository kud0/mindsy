"use client"

import React from 'react';

interface OverviewTabProps {
  toc: Array<{ label: string; ts: number }>;
  keyPoints: Array<{ title: string; bodyHtml: string }>;
  overviewHtml: string;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ toc, keyPoints, overviewHtml }) => {
  return (
    <div className="p-4 space-y-6">
      {/* Overview Section */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Overview</h2>
        <div 
          className="prose prose-gray max-w-none"
          dangerouslySetInnerHTML={{ __html: overviewHtml }}
        />
      </section>

      {/* Table of Contents */}
      {toc && toc.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-3">Table of Contents</h2>
          <ul className="space-y-2">
            {toc.map((item, index) => (
              <li key={index} className="flex justify-between items-center py-2 px-3 bg-gray-50">
                <span>{item.label}</span>
                <span className="text-sm text-gray-500">{Math.floor(item.ts / 60)}:{(item.ts % 60).toString().padStart(2, '0')}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Key Points */}
      {keyPoints && keyPoints.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-3">Key Points</h2>
          <div className="space-y-4">
            {keyPoints.map((point, index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-medium text-gray-900">{point.title}</h3>
                <div 
                  className="prose prose-gray prose-sm max-w-none mt-1"
                  dangerouslySetInnerHTML={{ __html: point.bodyHtml }}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};