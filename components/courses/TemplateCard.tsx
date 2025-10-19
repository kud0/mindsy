'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ThumbsUp, FolderOpen, Star, Eye } from 'lucide-react';

interface Template {
  id: string;
  template_name: string;
  description?: string;
  vote_count: number;
  is_recommended: boolean;
  has_voted: boolean;
  creator_name: string;
  folder_structure: {
    folders: Array<{ name: string }>;
  };
}

interface TemplateCardProps {
  template: Template;
  onVote: (templateId: string) => Promise<void>;
  onPreview: (template: Template) => void;
  onUse: (template: Template) => void;
  isEnrolled: boolean;
}

export function TemplateCard({
  template,
  onVote,
  onPreview,
  onUse,
  isEnrolled
}: TemplateCardProps) {
  const [isVoting, setIsVoting] = useState(false);
  const folderCount = template.folder_structure?.folders?.length || 0;

  const handleVote = async () => {
    setIsVoting(true);
    try {
      await onVote(template.id);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className={`
      p-4 border rounded-lg transition-all
      ${template.is_recommended
        ? 'border-yellow-400 dark:border-yellow-600 bg-yellow-50/50 dark:bg-yellow-900/10'
        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
      }
    `}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {template.is_recommended && (
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            )}
            <h4 className="font-semibold text-gray-900 dark:text-white">
              {template.template_name}
            </h4>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Created by {template.creator_name}
          </p>
        </div>

        {/* Vote Button */}
        <Button
          variant={template.has_voted ? "default" : "outline"}
          size="sm"
          onClick={handleVote}
          disabled={isVoting || !isEnrolled}
          className="min-w-[80px]"
        >
          <ThumbsUp className={`w-4 h-4 mr-1 ${template.has_voted ? 'fill-current' : ''}`} />
          {template.vote_count}
        </Button>
      </div>

      {/* Description */}
      {template.description && (
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
          {template.description}
        </p>
      )}

      {/* Folder Count */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
        <FolderOpen className="w-4 h-4" />
        <span>{folderCount} {folderCount === 1 ? 'folder' : 'folders'}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPreview(template)}
          className="flex-1"
        >
          <Eye className="w-4 h-4 mr-1" />
          Preview
        </Button>
        <Button
          size="sm"
          onClick={() => onUse(template)}
          disabled={!isEnrolled}
          className="flex-1"
        >
          Use This
        </Button>
      </div>

      {!isEnrolled && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
          Enroll in course to vote or use templates
        </p>
      )}
    </div>
  );
}
