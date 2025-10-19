'use client';

import { Check, X, Clock } from 'lucide-react';

interface FriendRequestCardProps {
  request: {
    id: string;
    user: {
      id: string;
      full_name: string;
      email: string;
      avatar_url: string | null;
    };
    created_at: string;
  };
  type: 'received' | 'sent';
  onAccept?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
}

export function FriendRequestCard({
  request,
  type,
  onAccept,
  onReject,
  onCancel
}: FriendRequestCardProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Avatar */}
        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-white font-semibold text-lg">
            {request.user.full_name?.charAt(0)?.toUpperCase() || request.user.email.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 truncate">
            {request.user.full_name || 'Unknown User'}
          </h4>
          <p className="text-sm text-gray-500 truncate">{request.user.email}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(request.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      {type === 'received' ? (
        <div className="flex items-center gap-2">
          <button
            onClick={onAccept}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            title="Accept request"
          >
            <Check className="w-4 h-4" />
            Accept
          </button>
          <button
            onClick={onReject}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            title="Reject request"
          >
            <X className="w-4 h-4" />
            Reject
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium">
            <Clock className="w-4 h-4" />
            Pending
          </div>
          <button
            onClick={onCancel}
            className="flex items-center gap-1 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
            title="Cancel request"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
