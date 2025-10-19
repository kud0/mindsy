import React, { useState } from 'react';
import { GitBranch, ZoomIn, ZoomOut, Maximize2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MindMapNode {
  id: string;
  label: string;
  type: 'root' | 'branch' | 'leaf';
  children?: MindMapNode[];
  description?: string;
  color?: string;
}

interface MindMapTabProps {
  mindMapData?: MindMapNode;
}

export function MindMapTab({ mindMapData }: MindMapTabProps) {
  const [zoom, setZoom] = useState(100);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 10, 150));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 10, 50));
  };

  const handleResetZoom = () => {
    setZoom(100);
  };

  if (!mindMapData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="text-gray-400 mb-3">
          <GitBranch className="w-12 h-12 mx-auto" />
        </div>
        <p className="text-gray-600 text-center">No mind map available</p>
        <p className="text-sm text-gray-500 text-center mt-2">
          A visual mind map will be generated to help you understand the concept relationships
        </p>
      </div>
    );
  }

  const renderNode = (node: MindMapNode, level: number = 0): React.ReactNode => {
    const isSelected = selectedNode === node.id;
    const nodeColor = node.color || (level === 0 ? 'bg-blue-500' : level === 1 ? 'bg-purple-500' : 'bg-gray-500');
    
    return (
      <div key={node.id} className="relative">
        {/* Node */}
        <div className={`flex ${level === 0 ? 'justify-center' : ''}`}>
          <button
            onClick={() => setSelectedNode(isSelected ? null : node.id)}
            className={`
              relative px-4 py-2 rounded-lg text-white font-medium
              transition-all duration-200 transform hover:scale-105
              ${nodeColor} ${isSelected ? 'ring-4 ring-offset-2 ring-blue-400' : ''}
              ${level === 0 ? 'text-lg' : level === 1 ? 'text-base' : 'text-sm'}
            `}
            style={{
              minWidth: level === 0 ? '150px' : level === 1 ? '120px' : '100px',
            }}
          >
            {node.label}
            {node.description && (
              <Info className="w-3 h-3 absolute top-1 right-1 opacity-70" />
            )}
          </button>
        </div>

        {/* Description Tooltip */}
        {isSelected && node.description && (
          <div className="absolute z-10 mt-2 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg max-w-xs">
            {node.description}
          </div>
        )}

        {/* Children */}
        {node.children && node.children.length > 0 && (
          <div className={`mt-6 ${level === 0 ? 'flex justify-center gap-8' : 'ml-8 space-y-4'}`}>
            {node.children.map(child => (
              <div key={child.id} className="relative">
                {/* Connection Line */}
                {level > 0 && (
                  <div className="absolute -left-8 top-4 w-8 h-0.5 bg-gray-300"></div>
                )}
                {renderNode(child, level + 1)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Simplified ASCII-based mind map for fallback
  const renderSimpleMindMap = () => {
    const renderSimpleNode = (node: MindMapNode, prefix: string = '', isLast: boolean = true): string[] => {
      const lines: string[] = [];
      const connector = isLast ? '└── ' : '├── ';
      const extension = isLast ? '    ' : '│   ';
      
      lines.push(prefix + connector + node.label);
      
      if (node.children) {
        node.children.forEach((child, index) => {
          const isLastChild = index === node.children!.length - 1;
          lines.push(...renderSimpleNode(child, prefix + extension, isLastChild));
        });
      }
      
      return lines;
    };

    if (!mindMapData) return [];
    
    const lines: string[] = [mindMapData.label];
    if (mindMapData.children) {
      mindMapData.children.forEach((child, index) => {
        const isLast = index === mindMapData.children!.length - 1;
        lines.push(...renderSimpleNode(child, '', isLast));
      });
    }
    
    return lines;
  };

  return (
    <div className="min-h-full bg-white relative">
      {/* Zoom Controls */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">Interactive Mind Map</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleZoomOut}
              disabled={zoom <= 50}
              className="h-8 w-8"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600 min-w-[3rem] text-center">
              {zoom}%
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={handleZoomIn}
              disabled={zoom >= 150}
              className="h-8 w-8"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleResetZoom}
              className="h-8 w-8 ml-2"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mind Map Content */}
      <div className="p-6 overflow-auto">
        <div 
          className="min-h-[500px] flex items-start justify-center transition-transform duration-200"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
        >
          {/* Visual Mind Map (simplified for mobile) */}
          <div className="block sm:hidden">
            <pre className="text-sm text-gray-700 font-mono bg-gray-50 p-4 rounded-lg">
              {renderSimpleMindMap().join('\n')}
            </pre>
          </div>
          
          {/* Interactive Mind Map (desktop) */}
          <div className="hidden sm:block">
            {renderNode(mindMapData)}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 pointer-events-auto">
          <p className="font-medium mb-1">Interactive Mind Map</p>
          <p className="text-xs">
            • Click nodes to see descriptions
            • Use zoom controls to adjust view
            • Swipe or scroll to navigate on mobile
          </p>
        </div>
      </div>
    </div>
  );
}