'use client';

import { useState, useEffect } from 'react';
import { Share2, ArrowRight, ArrowLeft, Calendar, Loader2, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SharedContent {
  id: string;
  title: string;
  description: string | null;
  shared_at: string;
  recipient?: {
    id: string;
    full_name: string;
    email: string;
  };
  owner?: {
    id: string;
    full_name: string;
    email: string;
  };
  source_job?: {
    job_id: string;
    lecture_title: string;
    status: string;
  };
  copied_job?: {
    job_id: string;
    lecture_title: string;
    status: string;
  };
}

export function SharedTab() {
  const [activeSubTab, setActiveSubTab] = useState<'received' | 'sent'>('received');
  const [sentShares, setSentShares] = useState<SharedContent[]>([]);
  const [receivedShares, setReceivedShares] = useState<SharedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchShares();
  }, []);

  const fetchShares = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/share');

      if (!response.ok) {
        throw new Error('Failed to fetch shares');
      }

      const data = await response.json();
      setSentShares(data.sent || []);
      setReceivedShares(data.received || []);
    } catch (error) {
      console.error('Error fetching shares:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitial = (name: string) => {
    return name?.charAt(0)?.toUpperCase() || '?';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveSubTab('received')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeSubTab === 'received'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <ArrowRight className="w-4 h-4" />
          Received ({receivedShares.length})
        </button>

        <button
          onClick={() => setActiveSubTab('sent')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeSubTab === 'sent'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          Sent ({sentShares.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* Received Shares */}
          {activeSubTab === 'received' && (
            <div className="space-y-3">
              {receivedShares.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                  <Share2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">No shared content yet</p>
                  <p className="text-gray-500 text-sm mt-1">
                    When friends share lectures with you, they'll appear here
                  </p>
                </div>
              ) : (
                receivedShares.map((share) => (
                  <div
                    key={share.id}
                    className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => router.push(`/dashboard/lectures/${share.copied_job?.job_id}`)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-semibold text-lg">
                          {getInitial(share.owner?.full_name || '')}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-600 mb-1">
                              <span className="font-semibold text-gray-900">
                                {share.owner?.full_name || 'Unknown'}
                              </span>{' '}
                              shared with you
                            </p>
                            <h3 className="text-lg font-semibold text-gray-900 truncate mb-1">
                              {share.title}
                            </h3>
                            {share.description && (
                              <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                                "{share.description}"
                              </p>
                            )}
                          </div>

                          {/* Lecture icon */}
                          <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        </div>

                        {/* Metadata */}
                        <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(share.shared_at)}
                          </div>
                          <span>•</span>
                          <span className="truncate">{share.owner?.email}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Sent Shares */}
          {activeSubTab === 'sent' && (
            <div className="space-y-3">
              {sentShares.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                  <Share2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">You haven't shared anything yet</p>
                  <p className="text-gray-500 text-sm mt-1">
                    Click the share button on any lecture to share it with friends
                  </p>
                </div>
              ) : (
                sentShares.map((share) => (
                  <div
                    key={share.id}
                    className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => router.push(`/dashboard/lectures/${share.source_job?.job_id}`)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-semibold text-lg">
                          {getInitial(share.recipient?.full_name || '')}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-600 mb-1">
                              Shared with{' '}
                              <span className="font-semibold text-gray-900">
                                {share.recipient?.full_name || 'Unknown'}
                              </span>
                            </p>
                            <h3 className="text-lg font-semibold text-gray-900 truncate mb-1">
                              {share.title}
                            </h3>
                            {share.description && (
                              <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                                "{share.description}"
                              </p>
                            )}
                          </div>

                          {/* Lecture icon */}
                          <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        </div>

                        {/* Metadata */}
                        <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(share.shared_at)}
                          </div>
                          <span>•</span>
                          <span className="truncate">{share.recipient?.email}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
