'use client';

import { UserMinus } from 'lucide-react';

interface FriendCardProps {
  friend: {
    id: string;
    user: {
      id: string;
      full_name: string;
      email: string;
      avatar_url: string | null;
    };
    created_at: string;
  };
  onRemove: () => void;
}

export function FriendCard({ friend, onRemove }: FriendCardProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Avatar */}
        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-white font-semibold text-lg">
            {friend.user.full_name?.charAt(0)?.toUpperCase() || friend.user.email.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 truncate">
            {friend.user.full_name || 'Unknown User'}
          </h4>
          <p className="text-sm text-gray-500 truncate">{friend.user.email}</p>
        </div>
      </div>

      {/* Remove Button */}
      <button
        onClick={onRemove}
        className="flex items-center gap-1 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
        title="Remove friend"
      >
        <UserMinus className="w-4 h-4" />
        Remove
      </button>
    </div>
  );
}
