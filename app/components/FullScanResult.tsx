/**
 * Full Scan Result Modal/Details Component
 * Shows complete profile analysis with all repos and details
 */

'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';

interface ProfileMetadata {
  login: string;
  avatar_url: string;
  name: string;
  bio: string;
  company: string;
  blog: string;
  location: string;
  public_repos: number;
  followers: number;
  following: number;
}

interface ScanResult {
  commits: number;
  pullRequests: number;
  issues: number;
  activeRepositories: number;
}

interface Repository {
  id: string;
  name: string;
  full_name: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  is_private: boolean;
  is_fork: boolean;
}

interface FullScanResultProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  profileMetadata?: ProfileMetadata;
  profileImage?: string;
  stats?: ScanResult;
  repositories?: Repository[];
  lastScannedAt: string;
  isGuest?: boolean;
}

export default function FullScanResult({
  isOpen,
  onClose,
  username,
  profileMetadata,
  profileImage,
  stats,
  repositories = [],
  lastScannedAt,
  isGuest = false,
}: FullScanResultProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'repositories'>('overview');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b flex items-center justify-between p-5 sm:p-6">
          <div className="flex items-center gap-4">
            {profileImage && (
              <img
                src={profileImage}
                alt={username}
                className="w-12 h-12 rounded-full"
              />
            )}
            <div>
              <h2 className="text-xl font-bold">{username}</h2>
              {isGuest && (
                <span className="text-xs text-yellow-600 font-medium">
                  Guest Scan
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-4 px-6 font-medium text-center transition-colors ${
              activeTab === 'overview'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('repositories')}
            className={`flex-1 py-4 px-6 font-medium text-center transition-colors ${
              activeTab === 'repositories'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Repositories ({repositories.length})
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div>
              {/* GitHub Profile Info */}
              {profileMetadata && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4">GitHub Profile</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {profileMetadata.name && (
                      <div>
                        <p className="text-sm text-gray-600">Full Name</p>
                        <p className="font-medium">{profileMetadata.name}</p>
                      </div>
                    )}
                    {profileMetadata.bio && (
                      <div className="col-span-2 md:col-span-3">
                        <p className="text-sm text-gray-600">Bio</p>
                        <p className="font-medium">{profileMetadata.bio}</p>
                      </div>
                    )}
                    {profileMetadata.company && (
                      <div>
                        <p className="text-sm text-gray-600">Company</p>
                        <p className="font-medium">{profileMetadata.company}</p>
                      </div>
                    )}
                    {profileMetadata.location && (
                      <div>
                        <p className="text-sm text-gray-600">Location</p>
                        <p className="font-medium">{profileMetadata.location}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-600">Public Repos</p>
                      <p className="font-medium">{profileMetadata.public_repos}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Followers</p>
                      <p className="font-medium">{profileMetadata.followers.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Following</p>
                      <p className="font-medium">{profileMetadata.following.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Contribution Stats */}
              {stats && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Contribution Stats (Last 90 Days)</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                      <p className="text-sm text-gray-700 font-medium">Commits</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {stats.commits.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                      <p className="text-sm text-gray-700 font-medium">Pull Requests</p>
                      <p className="text-3xl font-bold text-purple-600">
                        {stats.pullRequests.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                      <p className="text-sm text-gray-700 font-medium">Issues</p>
                      <p className="text-3xl font-bold text-green-600">
                        {stats.issues.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
                      <p className="text-sm text-gray-700 font-medium">Active Repos</p>
                      <p className="text-3xl font-bold text-orange-600">
                        {stats.activeRepositories}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'repositories' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Top Repositories</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {repositories.length > 0 ? (
                  repositories.map((repo) => (
                    <a
                      key={repo.id}
                      href={`https://github.com/${repo.full_name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 border rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-blue-600 hover:text-blue-700 truncate">
                            {repo.name}
                          </p>
                          {repo.description && (
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {repo.description}
                            </p>
                          )}
                        </div>
                        {repo.is_fork && (
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded ml-2">
                            Fork
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {repo.language && (
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            {repo.language}
                          </span>
                        )}
                        {repo.stars > 0 && (
                          <span>⭐ {repo.stars.toLocaleString()}</span>
                        )}
                        {repo.forks > 0 && (
                          <span>🔄 {repo.forks.toLocaleString()}</span>
                        )}
                      </div>
                    </a>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-8">No repositories found</p>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-4 border-t text-sm text-gray-500 text-center">
            Scanned on {new Date(lastScannedAt).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}
