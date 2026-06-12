/**
 * Scan Results Page
 * Shows all profile scans in card format with pagination
 * Accessible to both authenticated users and guests
 */
'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ScanResultCard from '@/app/components/ScanResultCard';
import FullScanResult from '@/app/components/FullScanResult';
import { useSessionAuth } from '@/app/lib/use-session-auth';
function ScanResultsContent() {
    var _a, _b;
    const searchParams = useSearchParams();
    const { isLoaded, isSignedIn, user } = useSessionAuth();
    const [guestToken, setGuestToken] = useState(null);
    const [scans, setScans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedScan, setSelectedScan] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const limit = 10;
    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        const tokenFromUrl = searchParams.get('guestToken');
        const tokenFromStorage = window.sessionStorage.getItem('guestToken');
        const nextToken = tokenFromUrl || tokenFromStorage;
        if (tokenFromUrl) {
            window.sessionStorage.setItem('guestToken', tokenFromUrl);
        }
        setGuestToken(nextToken);
    }, [searchParams]);
    useEffect(() => {
        if (!isLoaded) {
            return;
        }
        if (isSignedIn && (user === null || user === void 0 ? void 0 : user.userId)) {
            setGuestToken(null);
            if (typeof window !== 'undefined') {
                window.sessionStorage.removeItem('guestToken');
            }
        }
    }, [isLoaded, isSignedIn, user === null || user === void 0 ? void 0 : user.userId]);
    useEffect(() => {
        fetchScans();
    }, [page, guestToken]);
    const fetchScans = async () => {
        var _a;
        setLoading(true);
        setError(null);
        try {
            const headers = {
                'Content-Type': 'application/json',
            };
            // Add guest token to header if available
            if (guestToken) {
                headers['Authorization'] = `Bearer ${guestToken}`;
            }
            const response = await fetch(`/api/scanProfile/results?page=${page}&limit=${limit}`, { headers });
            if (!response.ok) {
                if (response.status === 401) {
                    setError('Please log in or provide a valid guest token');
                }
                else {
                    setError('Failed to fetch scan results');
                }
                setScans([]);
                return;
            }
            const data = await response.json();
            setScans(data.data || []);
            setTotalPages(((_a = data.pagination) === null || _a === void 0 ? void 0 : _a.totalPages) || 1);
        }
        catch (err) {
            console.error('[Results] Error:', err);
            setError('An error occurred while fetching results');
            setScans([]);
        }
        finally {
            setLoading(false);
        }
    };
    const handleViewDetails = async (scan) => {
        setLoading(true);
        try {
            const headers = {
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
        }
        catch (err) {
            console.error('[FullResult] Error:', err);
            setError('Failed to load full result');
        }
        finally {
            setLoading(false);
        }
    };
    if (loading && scans.length === 0) {
        return (_jsx("div", { className: "container mx-auto max-w-5xl px-4 py-12", children: _jsxs("div", { className: "flex flex-col items-center justify-center min-h-96", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" }), _jsx("p", { className: "text-gray-600", children: "Loading your scan results..." })] }) }));
    }
    return (_jsxs("div", { className: "container mx-auto max-w-5xl px-4 py-8", children: [_jsxs("div", { className: "mb-8", children: [_jsx("h1", { className: "text-3xl font-bold mb-2", children: "Profile Scans" }), _jsx("p", { className: "text-gray-600", children: isSignedIn ? 'Your saved profile scans' : 'Guest profile scans' })] }), error && (_jsx("div", { className: "mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700", children: error })), scans.length === 0 && !error && (_jsxs("div", { className: "text-center py-12 bg-gray-50 rounded-lg", children: [_jsx("p", { className: "text-gray-600 mb-4", children: "No scan results yet" }), _jsx("a", { href: "/", className: "inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors", children: "Start a Profile Scan" })] })), scans.length > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 mb-8", children: scans.map((scan) => {
                            var _a;
                            return (_jsx(ScanResultCard, { id: scan.id, username: scan.username, github_user_id: scan.github_user_id, repoCount: scan.repo_count, contributionStats: scan.contribution_stats, lastScannedAt: scan.last_scanned_at, profileImage: (_a = scan.profile_metadata) === null || _a === void 0 ? void 0 : _a.avatar_url, isGuest: scan.plan_visibility === 'limited', onViewDetails: () => handleViewDetails(scan) }, scan.id));
                        }) }), totalPages > 1 && (_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("button", { onClick: () => setPage(Math.max(1, page - 1)), disabled: page === 1, className: "px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed", children: "Previous" }), _jsxs("div", { className: "text-gray-600", children: ["Page ", _jsx("span", { className: "font-semibold", children: page }), " of", ' ', _jsx("span", { className: "font-semibold", children: totalPages })] }), _jsx("button", { onClick: () => setPage(Math.min(totalPages, page + 1)), disabled: page === totalPages, className: "px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed", children: "Next" })] }))] })), selectedScan && (_jsx(FullScanResult, { isOpen: showDetails, onClose: () => {
                    setShowDetails(false);
                    setSelectedScan(null);
                }, username: selectedScan.username, profileMetadata: selectedScan.profile_metadata, profileImage: (_a = selectedScan.profile_metadata) === null || _a === void 0 ? void 0 : _a.avatar_url, stats: (_b = selectedScan.profile_scan_result) === null || _b === void 0 ? void 0 : _b.stats, repositories: selectedScan.scanned_repositories || [], lastScannedAt: selectedScan.last_scanned_at, isGuest: selectedScan.plan_visibility === 'limited' }))] }));
}
export default function ScanResultsPage() {
    return (_jsx(Suspense, { fallback: _jsx("div", { className: "container mx-auto max-w-5xl px-4 py-12", children: _jsxs("div", { className: "flex flex-col items-center justify-center min-h-96", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" }), _jsx("p", { className: "text-gray-600", children: "Loading your scan results..." })] }) }), children: _jsx(ScanResultsContent, {}) }));
}
