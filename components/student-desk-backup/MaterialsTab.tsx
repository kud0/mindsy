"use client"

import React from 'react';
import { Download, FileText, File, Image, MoreHorizontal } from 'lucide-react';

interface Material {
  id: string;
  name: string;
  type: string;
  url: string;
  size: string;
}

interface MaterialsTabProps {
  materials: Material[];
}

export const MaterialsTab: React.FC<MaterialsTabProps> = ({ materials }) => {
  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-600" />;
      case 'image':
      case 'img':
        return <Image className="w-5 h-5 text-green-600" />;
      case 'slides':
        return <FileText className="w-5 h-5 text-orange-600" />;
      case 'code':
        return <File className="w-5 h-5 text-blue-600" />;
      default:
        return <File className="w-5 h-5 text-gray-600" />;
    }
  };

  if (!materials || materials.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <File className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 text-lg">No materials available for this lecture.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Study Materials</h2>
        <p className="text-sm text-gray-600">{materials.length} files available</p>
      </div>

      <div className="space-y-1">
        {materials.map((material) => (
          <div 
            key={material.id} 
            className="flex items-center p-3 hover:bg-gray-50 transition-colors min-h-[48px]"
          >
            <div className="flex items-center flex-1 min-w-0">
              <div className="flex-shrink-0 mr-3">
                {getFileIcon(material.type)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 truncate">{material.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 uppercase font-medium">
                    {material.type}
                  </span>
                  <span className="text-xs text-gray-500">{material.size}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={() => window.open(material.url, '_blank')}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Open
              </button>
              <button
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500"
                aria-label={`More actions for ${material.name}`}
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-blue-50">
        <h3 className="font-medium text-gray-900 mb-2">Download All Materials</h3>
        <p className="text-sm text-gray-600 mb-3">
          Get all lecture materials in a single ZIP file for offline study.
        </p>
        <button className="px-4 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2">
          <Download className="w-4 h-4" />
          Download All ({materials.length} files)
        </button>
      </div>
    </div>
  );
};