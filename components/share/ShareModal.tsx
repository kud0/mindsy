'use client';

import { useState, useEffect } from 'react';
import { X, Share2, Check, Loader2 } from 'lucide-react';
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

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  lectureTitle: string;
}

export function ShareModal({ isOpen, onClose, jobId, lectureTitle }: ShareModalProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingFriends, setFetchingFriends] = useState(true);

  // Fetch friends when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchFriends();
      setSelectedFriends(new Set());
      setMessage('');
    }
  }, [isOpen]);

  const fetchFriends = async () => {
    try {
      setFetchingFriends(true);
      const response = await fetch('/api/friends');

      if (!response.ok) {
        throw new Error('Failed to fetch friends');
      }

      const data = await response.json();
      setFriends(data.friends || []);
    } catch (error) {
      console.error('Error fetching friends:', error);
      toast.error('Failed to load friends');
    } finally {
      setFetchingFriends(false);
    }
  };

  const toggleFriend = (friendId: string) => {
    const newSelected = new Set(selectedFriends);
    if (newSelected.has(friendId)) {
      newSelected.delete(friendId);
    } else {
      newSelected.add(friendId);
    }
    setSelectedFriends(newSelected);
  };

  const handleShare = async () => {
    if (selectedFriends.size === 0) {
      toast.error('Please select at least one friend');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: jobId,
          friend_ids: Array.from(selectedFriends),
          message: message.trim() || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to share content');
      }

      // Show success toast
      if (data.shared_count === 1) {
        toast.success('Shared with 1 friend!');
      } else {
        toast.success(`Shared with ${data.shared_count} friends!`);
      }

      // Show errors if any
      if (data.errors && data.errors.length > 0) {
        console.warn('Some shares failed:', data.errors);
        toast.warning(`${data.errors.length} share(s) failed`);
      }

      onClose();
    } catch (error: any) {
      console.error('Error sharing:', error);
      toast.error(error.message || 'Failed to share content');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Share2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Share Lecture</h2>
              <p className="text-sm text-gray-500 truncate max-w-xs">{lectureTitle}</p>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Friends List */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-3 block">
              Select Friends ({selectedFriends.size} selected)
            </label>

            {fetchingFriends ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="font-medium">No friends yet</p>
                <p className="text-sm mt-1">Add friends to share content with them</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {friends.map((friend) => {
                  const isSelected = selectedFriends.has(friend.user.id);

                  return (
                    <button
                      key={friend.id}
                      onClick={() => toggleFriend(friend.user.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-semibold text-sm">
                          {friend.user.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>

                      {/* User Info */}
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {friend.user.full_name || 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {friend.user.email}
                        </p>
                      </div>

                      {/* Checkbox */}
                      <div
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-300'
                        }`}
                      >
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Optional Message */}
          <div>
            <label htmlFor="share-message" className="text-sm font-medium text-gray-700 mb-2 block">
              Message (Optional)
            </label>
            <textarea
              id="share-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a note for your friends..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              maxLength={200}
            />
            <p className="text-xs text-gray-500 mt-1">
              {message.length}/200 characters
            </p>
          </div>
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
            onClick={handleShare}
            disabled={loading || selectedFriends.size === 0}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sharing...
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                Share with {selectedFriends.size || '0'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
