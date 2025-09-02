"use client"

import React from 'react';
import { FolderOpen, Download, Eye, FileText, File, ExternalLink } from 'lucide-react';
import { MaterialsTabProps } from '@/types/lecture-data';

export const MaterialsTab: React.FC<MaterialsTabProps> = ({ materials, resources }) => {
  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-600" />;
      case 'json':
        return <File className="w-5 h-5 text-blue-600" />;
      case 'txt':
      case 'md':
        return <FileText className="w-5 h-5 text-gray-600" />;
      default:
        return <File className="w-5 h-5 text-gray-600" />;
    }
  };

  const handleViewFile = (material: any) => {
    window.open(material.url, '_blank');
  };

  const handleDownloadFile = (material: any) => {
    const link = document.createElement('a');
    link.href = material.url;
    link.download = material.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-full">
      {/* Title */}
      <div className="sticky top-0 bg-white px-4 py-2 z-20 border-b border-gray-100">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-1">
          <FolderOpen className="w-5 h-5" />
          Study Materials
        </h2>
        <p className="text-sm text-gray-600">
          {materials.length} files • Access lecture resources and materials
        </p>
      </div>

      <div className="p-4 space-y-6">
        
        {/* Files Section */}
        <section>
          <h3 className="text-xl font-semibold mb-4">Lecture Files</h3>
          
          {materials.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No materials available for this lecture</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {materials.map((material) => (
                <div key={material.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 mt-1">
                      {getFileIcon(material.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate mb-1">
                        {material.name}
                      </h4>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                        <span className="uppercase font-mono font-medium">
                          {material.type}
                        </span>
                        {material.size !== 'Unknown' && (
                          <>
                            <span>•</span>
                            <span>{material.size}</span>
                          </>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewFile(material)}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                        
                        <button
                          onClick={() => handleDownloadFile(material)}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Resources Section */}
        <section>
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-purple-600" />
            Additional Resources
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Essential Resources */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">📚 Essential</h4>
              <p className="text-sm text-blue-700 leading-relaxed">
                {resources.essential}
              </p>
            </div>
            
            {/* Practice Resources */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-2">🏃 Practice</h4>
              <p className="text-sm text-green-700 leading-relaxed">
                {resources.practice}
              </p>
            </div>
            
            {/* Deeper Study */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-semibold text-purple-800 mb-2">🔬 Deeper Study</h4>
              <p className="text-sm text-purple-700 leading-relaxed">
                {resources.deeper}
              </p>
            </div>
            
            {/* Alternative Resources */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="font-semibold text-orange-800 mb-2">🎯 Alternative</h4>
              <p className="text-sm text-orange-700 leading-relaxed">
                {resources.alternative}
              </p>
            </div>
          </div>
        </section>

        {/* Quick Access */}
        <section className="bg-gradient-to-br from-gray-50 to-slate-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">⚡ Quick Access</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button className="flex flex-col items-center gap-2 p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
              <FileText className="w-6 h-6 text-red-600" />
              <span className="text-sm font-medium text-gray-700">All PDFs</span>
            </button>
            
            <button className="flex flex-col items-center gap-2 p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
              <Download className="w-6 h-6 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Download All</span>
            </button>
            
            <button className="flex flex-col items-center gap-2 p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
              <ExternalLink className="w-6 h-6 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">External Links</span>
            </button>
            
            <button className="flex flex-col items-center gap-2 p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
              <FolderOpen className="w-6 h-6 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">Organize</span>
            </button>
          </div>
        </section>

        {/* Study Materials Info */}
        <section className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-800 mb-2">💡 Study Materials Tips</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Download PDFs for offline access during study sessions</li>
            <li>• Use external resources to supplement your understanding</li>
            <li>• Practice materials are designed for active recall</li>
            <li>• Essential resources are required for exam preparation</li>
          </ul>
        </section>
      </div>
    </div>
  );
};