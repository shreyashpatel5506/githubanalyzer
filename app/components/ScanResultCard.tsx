/**
 * Scan Result Card Component
 * Displays GitHub profile scan in short form with expandable details
 */

import React from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface ScanResultCardProps {
  id: string;
  username: string;
  github_user_id: string;
  repoCount: number;
  contributionStats?: {
    commits: number;
    pullRequests: number;
    issues: number;
  };
  lastScannedAt: string;
  onViewDetails?: () => void;
  isGuest?: boolean;
  profileImage?: string;
}

export default function ScanResultCard({
  id,
  username,
  github_user_id,
  repoCount,
  contributionStats,
  lastScannedAt,
  onViewDetails,
  isGuest = false,
  profileImage,
}: ScanResultCardProps) {
  const scannedTime = new Date(lastScannedAt);
  const timeAgo = formatDistanceToNow(scannedTime, { addSuffix: true });

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1">
          {/* Profile Image */}
          {profileImage && (
            <img
              src={profileImage}
              alt={username}
              className="w-12 h-12 rounded-full"
            />
          )}
          
          {/* Username & Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <a
                href={`https://github.com/${username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg font-semibold text-blue-600 hover:text-blue-700 truncate"
              >
                {username}
              </a>
              {isGuest && (
                <span className="inline-block bg-yellow-100 text-yellow-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                  Guest
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Scanned {timeAgo}
            </p>
          </div>
        </div>

        {/* View Details Button */}
        <button
          onClick={onViewDetails}
          className="ml-2 px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-sm font-medium transition-colors"
        >
          View
        </button>
      </div>

      {/* Stats Grid */}
      {contributionStats && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-blue-50 rounded p-3">
            <p className="text-xs text-gray-600 font-medium">Commits</p>
            <p className="text-xl font-bold text-blue-600">
              {contributionStats.commits.toLocaleString()}
            </p>
          </div>
          <div className="bg-purple-50 rounded p-3">
            <p className="text-xs text-gray-600 font-medium">Pull Requests</p>
            <p className="text-xl font-bold text-purple-600">
              {contributionStats.pullRequests.toLocaleString()}
            </p>
          </div>
          <div className="bg-green-50 rounded p-3">
            <p className="text-xs text-gray-600 font-medium">Issues</p>
            <p className="text-xl font-bold text-green-600">
              {contributionStats.issues.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Repos Info */}
      <div className="flex items-center justify-between text-sm text-gray-600 border-t pt-3">
        <span>📦 {repoCount} Repositories</span>
        <span className="text-xs text-gray-400">ID: {github_user_id.slice(0, 8)}...</span>
      </div>
    </div>
  );
}
