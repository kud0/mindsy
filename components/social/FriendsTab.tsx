'use client';

import { useState, useEffect } from 'react';
import { Users, UserPlus, Inbox, Loader2 } from 'lucide-react';
import { FriendSearch } from './FriendSearch';
import { FriendCard } from './FriendCard';
import { FriendRequestCard } from './FriendRequestCard';

interface Friend {
  id: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
  status: string;
  created_at: string;
}

export function FriendsTab() {
  const [activeSubTab, setActiveSubTab] = useState<'friends' | 'search' | 'requests'>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [sentRequests, setSentRequests] = useState<Friend[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [userFolders, setUserFolders] = useState<Array<{ id: string; folder_name: string; lecture_count?: number }>>([]);

  // Fetch friends and requests
  useEffect(() => {
    fetchFriends();
    fetchUserFolders();
  }, []);

  const fetchFriends = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/friends');

      if (!response.ok) {
        throw new Error('Failed to fetch friends');
      }

      const data = await response.json();
      setFriends(data.friends || []);
      setSentRequests(data.sent_requests || []);
      setReceivedRequests(data.received_requests || []);
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserFolders = async () => {
    try {
      const response = await fetch('/api/folders');
      if (response.ok) {
        const data = await response.json();
        setUserFolders(data.folders || []);
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  };

  // Handle accepting friend request
  const handleAcceptRequest = async (connectionId: string) => {
    try {
      const response = await fetch(`/api/friends/accept/${connectionId}`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to accept request');
      }

      // Refresh friends list
      fetchFriends();
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  };

  // Handle rejecting/cancelling request
  const handleRejectRequest = async (connectionId: string) => {
    try {
      const response = await fetch(`/api/friends/${connectionId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to reject request');
      }

      // Refresh friends list
      fetchFriends();
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  // Handle removing friend
  const handleRemoveFriend = async (connectionId: string) => {
    if (!confirm('Are you sure you want to remove this friend?')) {
      return;
    }

    try {
      const response = await fetch(`/api/friends/${connectionId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to remove friend');
      }

      // Refresh friends list
      fetchFriends();
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  };

  const pendingRequestsCount = receivedRequests.length;

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveSubTab('friends')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
            activeSubTab === 'friends'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Users className="w-4 h-4" />
          Friends ({friends.length})
        </button>

        <button
          onClick={() => setActiveSubTab('search')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
            activeSubTab === 'search'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          Find Friends
        </button>

        <button
          onClick={() => setActiveSubTab('requests')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap relative ${
            activeSubTab === 'requests'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Inbox className="w-4 h-4" />
          Requests
          {pendingRequestsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {pendingRequestsCount}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* Friends List */}
          {activeSubTab === 'friends' && (
            <div className="space-y-3">
              {friends.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">No friends yet</p>
                  <p className="text-gray-500 text-sm mt-1">
                    Search for classmates to connect with
                  </p>
                  <button
                    onClick={() => setActiveSubTab('search')}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Find Friends
                  </button>
                </div>
              ) : (
                friends.map((friend) => (
                  <FriendCard
                    key={friend.id}
                    friend={friend}
                    onRemove={() => handleRemoveFriend(friend.id)}
                    userFolders={userFolders}
                  />
                ))
              )}
            </div>
          )}

          {/* Friend Search */}
          {activeSubTab === 'search' && (
            <FriendSearch onFriendRequestSent={fetchFriends} />
          )}

          {/* Friend Requests */}
          {activeSubTab === 'requests' && (
            <div className="space-y-6">
              {/* Received Requests */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Received Requests ({receivedRequests.length})
                </h3>
                {receivedRequests.length === 0 ? (
                  <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
                    <Inbox className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No pending requests</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {receivedRequests.map((request) => (
                      <FriendRequestCard
                        key={request.id}
                        request={request}
                        type="received"
                        onAccept={() => handleAcceptRequest(request.id)}
                        onReject={() => handleRejectRequest(request.id)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Sent Requests */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Sent Requests ({sentRequests.length})
                </h3>
                {sentRequests.length === 0 ? (
                  <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
                    <UserPlus className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No pending sent requests</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sentRequests.map((request) => (
                      <FriendRequestCard
                        key={request.id}
                        request={request}
                        type="sent"
                        onCancel={() => handleRejectRequest(request.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
