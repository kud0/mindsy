'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, Plus, GripVertical } from 'lucide-react';

interface Folder {
  id: string;
  name: string;
}

interface TemplateBuilderProps {
  onSubmit: (template: {
    template_name: string;
    description: string;
    folder_structure: { folders: Array<{ name: string }> };
  }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function TemplateBuilder({ onSubmit, onCancel, isSubmitting = false }: TemplateBuilderProps) {
  const [templateName, setTemplateName] = useState('');
  const [description, setDescription] = useState('');
  const [folders, setFolders] = useState<Folder[]>([
    { id: '1', name: 'Week 1' },
    { id: '2', name: 'Week 2' },
    { id: '3', name: 'Midterm Review' },
    { id: '4', name: 'Final Prep' }
  ]);
  const [newFolderName, setNewFolderName] = useState('');

  const addFolder = () => {
    if (!newFolderName.trim()) return;

    const newFolder: Folder = {
      id: Date.now().toString(),
      name: newFolderName.trim()
    };

    setFolders([...folders, newFolder]);
    setNewFolderName('');
  };

  const removeFolder = (id: string) => {
    setFolders(folders.filter(f => f.id !== id));
  };

  const updateFolderName = (id: string, name: string) => {
    setFolders(folders.map(f => f.id === id ? { ...f, name } : f));
  };

  const handleSubmit = () => {
    if (!templateName.trim()) {
      alert('Please enter a template name');
      return;
    }

    if (folders.length === 0) {
      alert('Please add at least one folder');
      return;
    }

    // Check for empty folder names
    const hasEmptyNames = folders.some(f => !f.name.trim());
    if (hasEmptyNames) {
      alert('All folders must have a name');
      return;
    }

    onSubmit({
      template_name: templateName.trim(),
      description: description.trim(),
      folder_structure: {
        folders: folders.map(f => ({ name: f.name.trim() }))
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Template Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Template Name *
        </label>
        <Input
          placeholder="e.g., Weekly Structure (12 weeks)"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description (Optional)
        </label>
        <Textarea
          placeholder="Describe your folder organization..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          disabled={isSubmitting}
        />
      </div>

      {/* Folder List */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Folder Structure *
        </label>

        <div className="space-y-2 mb-3">
          {folders.map((folder, index) => (
            <div
              key={folder.id}
              className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <GripVertical className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500 dark:text-gray-400 w-6">
                {index + 1}.
              </span>
              <Input
                value={folder.name}
                onChange={(e) => updateFolderName(folder.id, e.target.value)}
                className="flex-1"
                disabled={isSubmitting}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFolder(folder.id)}
                disabled={isSubmitting}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Add Folder */}
        <div className="flex gap-2">
          <Input
            placeholder="New folder name..."
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addFolder()}
            disabled={isSubmitting}
          />
          <Button
            variant="outline"
            onClick={addFolder}
            disabled={isSubmitting || !newFolderName.trim()}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !templateName.trim() || folders.length === 0}
        >
          {isSubmitting ? 'Creating...' : 'Create Template'}
        </Button>
      </div>
    </div>
  );
}
