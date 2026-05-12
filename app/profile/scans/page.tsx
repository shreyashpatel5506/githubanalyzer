/**
 * Scan Results Page
 * Shows all profile scans in card format with pagination
 * Accessible to both authenticated users and guests
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ScanResultCard from '@/app/components/ScanResultCard';
import FullScanResult from '@/app/components/FullScanResult';
import { useSessionAuth } from '@/app/lib/use-session-auth';

interface ScanData {
  id: string;
  github_user_id: string;
  username: string;
  profile_metadata?: any;
  profile_scan_result?: any;
  last_scanned_at: string;
  created_at: string;
  repo_count: number;
  contribution_stats?: {
    commits: number;
    pullRequests: number;
    issues: number;
  };
  plan_visibility?: 'full' | 'partial' | 'limited';
}

export default function ScanResultsPage() {
  const searchParams = useSearchParams();
  const { session } = useSessionAuth();
  const guestToken = searchParams.get('guestToken') || sessionStorage.getItem('guestToken');

  const [scans, setScans] = useState<ScanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedScan, setSelectedScan] = useState<ScanData | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const limit = 10;

  useEffect(() => {
    // Store guest token in sessionStorage if provided
    if (guestToken) {
      sessionStorage.setItem('guestToken', guestToken);
    }
  }, [guestToken]);

  useEffect(() => {
    fetchScans();
  }, [page, guestToken]);

  const fetchScans = async () => {
    setLoading(true);
    setError(null);

    try {
      const headers: any = {
        'Content-Type': 'application/json',
      };

      // Add guest token to header if available
      if (guestToken) {
        headers['Authorization'] = `Bearer ${guestToken}`;
      }

      const response = await fetch(
        `/api/scanProfile/results?page=${page}&limit=${limit}`,
        { headers }
      );

      if (!response.ok) {
        if (response.status === 401) {
          setError('Please log in or provide a valid guest token');
        } else {
          setError('Failed to fetch scan results');
        }
        setScans([]);
        return;
      }

      const data = await response.json();

      setScans(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error('[Results] Error:', err);
      setError('An error occurred while fetching results');
      setScans([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (scan: ScanData) => {
    setLoading(true);

    try {
      const headers: any = {
        'Content-Type': 'application/json',
      };

      if (guestToken) {
        headers['Authorization'] = `Bearer ${guestToken}`;
      }

      const response = await fetch('/api/scanProfile/results', {
        method: 'POST',
        headers,
        body: JSON.stringify({ scanId: scan.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch full result');
      }

      const data = await response.json();
      setSelectedScan(data.data);
      setShowDetails(true);
    } catch (err) {
      console.error('[FullResult] Error:', err);
      setError('Failed to load full result');
    } finally {
      setLoading(false);
    }
  };

  if (loading && scans.length === 0) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-12">
        <div className="flex flex-col items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading your scan results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Profile Scans</h1>
        <p className="text-gray-600">
          {session?.userId ? 'Your saved profile scans' : 'Guest profile scans'}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Empty State */}
      {scans.length === 0 && !error && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600 mb-4">No scan results yet</p>
          <a
            href="/"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Start a Profile Scan
          </a>
        </div>
      )}

      {/* Results Grid */}
      {scans.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {scans.map((scan) => (
              <ScanResultCard
                key={scan.id}
                id={scan.id}
                username={scan.username}
                github_user_id={scan.github_user_id}
                repoCount={scan.repo_count}
                contributionStats={scan.contribution_stats}
                lastScannedAt={scan.last_scanned_at}
                profileImage={scan.profile_metadata?.avatar_url}
                isGuest={scan.plan_visibility === 'limited'}
                onViewDetails={() => handleViewDetails(scan)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <div className="text-gray-600">
                Page <span className="font-semibold">{page}</span> of{' '}
                <span className="font-semibold">{totalPages}</span>
              </div>

              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Full Result Modal */}
      {selectedScan && (
        <FullScanResult
          isOpen={showDetails}
          onClose={() => {
            setShowDetails(false);
            setSelectedScan(null);
          }}
          username={selectedScan.username}
          profileMetadata={selectedScan.profile_metadata}
          profileImage={selectedScan.profile_metadata?.avatar_url}
          stats={selectedScan.profile_scan_result?.stats}
          repositories={selectedScan.scanned_repositories || []}
          lastScannedAt={selectedScan.last_scanned_at}
          isGuest={selectedScan.plan_visibility === 'limited'}
        />
      )}
    </div>
  );
}
