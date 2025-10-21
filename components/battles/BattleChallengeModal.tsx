'use client';

import { useState, useEffect } from 'react';
import { X, Swords, Loader2, Trophy } from 'lucide-react';
import { toast } from 'sonner';

interface Friend {
  id: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

interface Folder {
  id: string;
  folder_name: string;
  lecture_count?: number;
}

interface BattleChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  friend: Friend;
  folders: Folder[];
}

export function BattleChallengeModal({ isOpen, onClose, friend, folders }: BattleChallengeModalProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [fetchingFolders, setFetchingFolders] = useState(false);
  const [availableFolders, setAvailableFolders] = useState<Folder[]>(folders);

  // Fetch folders when modal opens
  useEffect(() => {
    if (isOpen && folders.length === 0) {
      fetchFolders();
    } else {
      setAvailableFolders(folders);
    }
  }, [isOpen, folders]);

  const fetchFolders = async () => {
    try {
      setFetchingFolders(true);
      const response = await fetch('/api/folders');

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Folder fetch failed:', response.status, errorData);
        throw new Error(`Failed to fetch folders: ${response.status}`);
      }

      const data = await response.json();
      setAvailableFolders(data.folders || []);
    } catch (error) {
      console.error('Error fetching folders:', error);
      toast.error('Failed to load folders');
    } finally {
      setFetchingFolders(false);
    }
  };

  const handleSendChallenge = async () => {
    if (!selectedFolderId) {
      toast.error('Please select a folder');
      return;
    }

    const selectedFolder = availableFolders.find(f => f.id === selectedFolderId);
    if (!selectedFolder) {
      toast.error('Selected folder not found');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/battles/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opponentId: friend.user.id,
          folderId: selectedFolderId,
          folderName: selectedFolder.folder_name
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create battle');
      }

      toast.success(`Challenge sent to ${friend.user.full_name}!`);
      onClose();
    } catch (error: any) {
      console.error('Error sending challenge:', error);
      toast.error(error.message || 'Failed to send challenge');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedFolder = availableFolders.find(f => f.id === selectedFolderId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:backdrop-blur-2xl backdrop-blur-sm">
      <div className="bg-white dark:bg-background/90 rounded-2xl shadow-2xl dark:shadow-black/50 border border-gray-200 dark:border-white/10 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Swords className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Quiz Battle</h2>
              <p className="text-sm text-gray-500">
                Challenge {friend.user.full_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Battle Info */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-gray-900">Battle Format</h3>
            </div>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• 3 rounds of questions</li>
              <li>• 5 questions per round</li>
              <li>• 15 total questions</li>
              <li>• Best score wins!</li>
            </ul>
          </div>

          {/* Folder Selection */}
          <div>
            <label htmlFor="folder-select" className="text-sm font-medium text-gray-700 mb-2 block">
              Select Study Folder
            </label>
            {fetchingFolders ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
              </div>
            ) : availableFolders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="font-medium">No folders available</p>
                <p className="text-sm mt-1">Create study materials first</p>
              </div>
            ) : (
              <select
                id="folder-select"
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Choose a folder...</option>
                {availableFolders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.folder_name}
                    {folder.lecture_count !== undefined && ` (${folder.lecture_count} lectures)`}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedFolder && (
            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
              Questions will be generated from <span className="font-semibold">{selectedFolder.folder_name}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSendChallenge}
            disabled={loading || !selectedFolderId}
            className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Swords className="w-4 h-4" />
                Send Challenge
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
