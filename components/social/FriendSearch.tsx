'use client';

import { useState } from 'react';
import { Search, UserPlus, Check, Clock, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface SearchResult {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  connection_status: 'none' | 'friends' | 'request_sent' | 'request_received' | 'blocked';
  connection_id: string | null;
}

interface FriendSearchProps {
  onFriendRequestSent?: () => void;
}

export function FriendSearch({ onFriendRequestSent }: FriendSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);

  // Handle search
  const handleSearch = async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      setSearchPerformed(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/friends/search?q=${encodeURIComponent(searchQuery)}`);

      if (!response.ok) {
        throw new Error('Failed to search users');
      }

      const data = await response.json();
      setResults(data.users || []);
      setSearchPerformed(true);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  // Handle send friend request
  const handleSendRequest = async (userId: string) => {
    try {
      const response = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friend_id: userId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send friend request');
      }

      toast.success('Friend request sent!');

      // Refresh search results
      handleSearch(query);

      // Notify parent
      if (onFriendRequestSent) {
        onFriendRequestSent();
      }
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      toast.error(error.message || 'Failed to send friend request');
    }
  };

  // Debounced search
  const handleInputChange = (value: string) => {
    setQuery(value);

    // Clear timeout if exists
    const timeoutId = setTimeout(() => {
      handleSearch(value);
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  const getActionButton = (user: SearchResult) => {
    switch (user.connection_status) {
      case 'friends':
        return (
          <button
            disabled
            className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium"
          >
            <Check className="w-4 h-4" />
            Friends
          </button>
        );

      case 'request_sent':
        return (
          <button
            disabled
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium"
          >
            <Clock className="w-4 h-4" />
            Pending
          </button>
        );

      case 'request_received':
        return (
          <button
            disabled
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium"
          >
            <Clock className="w-4 h-4" />
            Respond in Requests
          </button>
        );

      case 'blocked':
        return (
          <button
            disabled
            className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium"
          >
            <X className="w-4 h-4" />
            Blocked
          </button>
        );

      default:
        return (
          <button
            onClick={() => handleSendRequest(user.id)}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Add Friend
          </button>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        </div>
      )}

      {/* Results */}
      {!loading && searchPerformed && (
        <div className="space-y-3">
          {results.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
              <Search className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 font-medium">No users found</p>
              <p className="text-gray-500 text-sm mt-1">
                Try searching with a different name or email
              </p>
            </div>
          ) : (
            results.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Avatar */}
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold text-lg">
                      {user.full_name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">
                      {user.full_name || 'Unknown User'}
                    </h4>
                    <p className="text-sm text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>

                {/* Action Button */}
                {getActionButton(user)}
              </div>
            ))
          )}
        </div>
      )}

      {/* Instructions */}
      {!searchPerformed && !loading && (
        <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
          <Search className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Search for classmates</p>
          <p className="text-gray-500 text-sm mt-1">
            Enter a name or email to find friends
          </p>
        </div>
      )}
    </div>
  );
}
