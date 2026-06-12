"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Layout from "@/app/components/Layout";
import { useParams } from "next/navigation";
import { Bug, ExternalLink, GitPullRequest, ScanSearch, RefreshCw } from "lucide-react";
import Link from "next/link";
import UpgradeModal from "@/app/components/UpgradeModal";
export default function BugsPage() {
    const params = useParams();
    const owner = params.owner;
    const repo = params.repo;
    const [bugs, setBugs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [filter, setFilter] = useState("all");
    const [generatingPR, setGeneratingPR] = useState(false);
    const [showUpgrade, setShowUpgrade] = useState(false);
    const [scanStatus, setScanStatus] = useState(null);
    const [scannedBranch, setScannedBranch] = useState('main');
    const scanNowButtonRef = useRef(null);
    const buildGitHubFileUrl = (fileName, line) => {
        const safePath = fileName.split('/').map(encodeURIComponent).join('/');
        return `https://github.com/${owner}/${repo}/blob/${scannedBranch}/${safePath}#L${line}`;
    };
    const loadBugs = useCallback(async () => {
        const res = await fetch(`/api/repos/${owner}/${repo}/bugs`);
        const status = res.status;
        const data = await res.json();
        if (status === 403)
            setShowUpgrade(true);
        setBugs(data.bugs || []);
        setScannedBranch(data.scannedBranch || 'main');
        return data.bugs || [];
    }, [owner, repo]);
    useEffect(() => {
        loadBugs().finally(() => setLoading(false));
    }, [loadBugs]);
    useEffect(() => {
        if (loading || scanning || bugs.length !== 0)
            return;
        const button = scanNowButtonRef.current;
        if (!button)
            return;
        button.focus();
        button.scrollIntoView({ behavior: "smooth", block: "center" });
    }, [loading, scanning, bugs.length]);
    const handleRunScan = async () => {
        setScanning(true);
        setScanStatus("Starting scan...");
        try {
            const res = await fetch("/api/scan/enqueue", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ repoFullName: `${owner}/${repo}` }),
            });
            const data = await res.json();
            if (!res.ok) {
                setScanStatus(data.error || "Failed to start scan");
                return;
            }
            const scanId = data.scanId;
            setScanStatus("Scanning repository files...");
            // Poll until complete
            let attempts = 0;
            const poll = async () => {
                var _a;
                attempts++;
                const statusRes = await fetch(`/api/scan/history?scanId=${scanId}`);
                const statusData = await statusRes.json();
                const scan = (_a = statusData.scans) === null || _a === void 0 ? void 0 : _a[0];
                if ((scan === null || scan === void 0 ? void 0 : scan.status) === 'completed') {
                    setScanStatus("Scan complete! Loading results...");
                    await loadBugs();
                    setScanning(false);
                    setScanStatus(null);
                }
                else if ((scan === null || scan === void 0 ? void 0 : scan.status) === 'failed') {
                    setScanStatus("Scan failed. Showing any previous results.");
                    setScanning(false);
                }
                else if (attempts < 30) {
                    setScanStatus(`Analyzing code... (${attempts * 5}s)`);
                    setTimeout(poll, 5000);
                }
                else {
                    setScanStatus("Scan is taking too long. Please refresh to check results.");
                    setScanning(false);
                }
            };
            setTimeout(poll, 5000);
        }
        catch (err) {
            setScanStatus(err instanceof Error ? err.message : "Failed to run scan");
            setScanning(false);
        }
    };
    const handleGeneratePR = async (bug) => {
        setGeneratingPR(true);
        try {
            const res = await fetch(`/api/repos/${owner}/${repo}/pr/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "bug", issueId: bug.id, issue: bug }),
            });
            const data = await res.json();
            if (res.status === 403) {
                setShowUpgrade(true);
            }
            else if (res.ok) {
                alert(`PR created successfully! ${data.pr_url || ""}`);
            }
            else {
                alert(data.error || "Failed to create PR");
            }
        }
        catch (err) {
            alert(err instanceof Error ? err.message : "Failed to create PR");
        }
        finally {
            setGeneratingPR(false);
        }
    };
    const filteredBugs = bugs.filter((b) => {
        if (filter === "all")
            return true;
        return b.severity === filter;
    });
    const severityCount = {
        high: bugs.filter((b) => b.severity === 'high' || b.severity === 'critical').length,
        medium: bugs.filter((b) => b.severity === 'medium').length,
        low: bugs.filter((b) => b.severity === 'low').length,
    };
    const getSeverityColor = (severity) => {
        if (severity === 'critical' || severity === 'high')
            return "text-red-500 dark:text-red-300";
        if (severity === 'medium')
            return "text-yellow-600 dark:text-yellow-300";
        return "text-blue-600 dark:text-blue-300";
    };
    return (_jsxs(Layout, { children: [_jsxs("div", { className: "max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500", children: [_jsxs("div", { className: "flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-4", children: [_jsx(Link, { href: "/repos", className: "hover:text-gray-900 dark:hover:text-white", children: "Repositories" }), _jsx("span", { children: "/" }), _jsxs(Link, { href: `/repos/${owner}/${repo}`, className: "hover:text-gray-900 dark:hover:text-white", children: [owner, "/", repo] }), _jsx("span", { children: "/" }), _jsx("span", { className: "text-gray-900 dark:text-white", children: "Bugs" })] }), _jsxs("div", { className: "flex items-center justify-between mb-8", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-3 mb-2", children: [_jsx("h1", { className: "text-4xl font-bold text-gray-900 dark:text-white", children: "Bug Detection Report" }), _jsx("span", { className: "bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm font-semibold", children: "PRO" })] }), _jsx("p", { className: "text-gray-500 dark:text-gray-400", children: scanning ? scanStatus : `Detected ${bugs.length} bug finding(s)` })] }), _jsxs("div", { className: "flex gap-3", children: [_jsxs("button", { onClick: handleRunScan, disabled: scanning, className: "flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-4 py-2.5 rounded-lg font-semibold transition-all", children: [scanning ? _jsx(RefreshCw, { size: 18, className: "animate-spin" }) : _jsx(ScanSearch, { size: 18 }), scanning ? "Scanning..." : "Run Scan"] }), _jsxs("button", { onClick: () => handleGeneratePR(bugs[0]), disabled: generatingPR || bugs.length === 0, className: "bg-linear-to-r from-red-500 to-pink-500 text-white px-6 py-2.5 rounded-lg font-semibold hover:shadow-lg disabled:opacity-50 transition-all flex items-center gap-2", children: [_jsx(GitPullRequest, { size: 18 }), generatingPR ? "Generating..." : "Fix PR"] })] })] }), _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4 mb-8", children: [_jsxs("button", { onClick: () => setFilter("all"), className: `p-4 rounded-lg border-2 transition-all ${filter === "all"
                                    ? "bg-purple-500/10 border-purple-500"
                                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-purple-400"}`, children: [_jsx("div", { className: "text-2xl font-bold text-gray-900 dark:text-white", children: bugs.length }), _jsx("div", { className: "text-sm text-gray-500 dark:text-gray-400", children: "All Bugs" })] }), _jsxs("button", { onClick: () => setFilter("high"), className: `p-4 rounded-lg border-2 transition-all ${filter === "high"
                                    ? "bg-red-500/10 border-red-500"
                                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-red-400"}`, children: [_jsx("div", { className: "text-2xl font-bold text-red-300", children: severityCount.high }), _jsx("div", { className: "text-sm text-gray-500 dark:text-gray-400", children: "High Severity" })] }), _jsxs("button", { onClick: () => setFilter("medium"), className: `p-4 rounded-lg border-2 transition-all ${filter === "medium"
                                    ? "bg-yellow-500/10 border-yellow-500"
                                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-yellow-400"}`, children: [_jsx("div", { className: "text-2xl font-bold text-yellow-300", children: severityCount.medium }), _jsx("div", { className: "text-sm text-gray-500 dark:text-gray-400", children: "Medium Severity" })] }), _jsxs("button", { onClick: () => setFilter("low"), className: `p-4 rounded-lg border-2 transition-all ${filter === "low"
                                    ? "bg-blue-500/10 border-blue-500"
                                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-400"}`, children: [_jsx("div", { className: "text-2xl font-bold text-blue-300", children: severityCount.low }), _jsx("div", { className: "text-sm text-gray-500 dark:text-gray-400", children: "Low Severity" })] })] }), loading ? (_jsx("div", { className: "text-center py-20 text-gray-500 dark:text-gray-400", children: "Loading..." })) : scanning ? (_jsxs("div", { className: "text-center py-20 rounded-2xl border border-gray-200 bg-white dark:bg-gray-800/60 dark:border-gray-700", children: [_jsx(RefreshCw, { size: 48, className: "animate-spin text-emerald-500 mx-auto mb-4" }), _jsx("h2", { className: "text-2xl font-bold text-gray-900 dark:text-white mb-2", children: "Scanning Repository..." }), _jsx("p", { className: "text-gray-500 dark:text-gray-400", children: scanStatus })] })) : filteredBugs.length === 0 ? (_jsx("div", { className: "text-center py-20 rounded-2xl border border-gray-200 bg-white dark:bg-gray-800/60 dark:border-gray-700", children: bugs.length === 0 ? (_jsxs(_Fragment, { children: [_jsx(ScanSearch, { size: 56, className: "mx-auto mb-4 text-gray-400" }), _jsx("h2", { className: "text-2xl font-bold text-gray-900 dark:text-white mb-2", children: "No Scan Results Yet" }), _jsx("p", { className: "text-gray-500 dark:text-gray-400 mb-6", children: "Run a scan to detect bugs in your repository code." }), _jsxs("button", { ref: scanNowButtonRef, onClick: handleRunScan, disabled: scanning, className: "inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/40 focus-visible:scale-[1.03]", children: [_jsx(ScanSearch, { size: 20 }), "Scan Now"] })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "text-6xl mb-4", children: "\uD83C\uDF89" }), _jsx("h2", { className: "text-2xl font-bold text-gray-900 dark:text-white mb-2", children: "No bugs in this category" }), _jsx("p", { className: "text-gray-500 dark:text-gray-400", children: "Try selecting a different severity level" })] })) })) : (_jsx("div", { className: "space-y-4", children: filteredBugs.map((bug) => (_jsxs("div", { className: "rounded-xl p-6 border border-gray-200 bg-white shadow-sm hover:border-red-400 dark:bg-gray-800/70 dark:border-gray-700 transition-all", children: [_jsx("div", { className: "flex items-start justify-between mb-4", children: _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-3 mb-2", children: [_jsx(Bug, { className: "text-red-400", size: 24 }), _jsxs("span", { className: `font-semibold ${getSeverityColor(bug.severity)}`, children: [bug.severity.toUpperCase(), " Severity"] })] }), _jsx("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white mb-2", children: bug.explanation }), _jsxs("div", { className: "text-sm text-gray-500 dark:text-gray-400", children: [_jsx("span", { className: "font-mono", children: bug.fileName || "Location unknown" }), _jsxs("span", { className: "ml-3", children: ["Line ", bug.line] })] }), _jsxs("div", { className: "mt-3 bg-green-500/10 border-l-4 border-green-500 p-3 rounded", children: [_jsx("div", { className: "text-sm font-semibold text-green-300 mb-1", children: "Suggested fix" }), _jsx("div", { className: "text-sm text-gray-700 dark:text-gray-200", children: bug.suggestedFix })] })] }) }), _jsxs("div", { className: "flex gap-3", children: [bug.fileName && (_jsxs("a", { href: buildGitHubFileUrl(bug.fileName, bug.line), target: "_blank", rel: "noopener noreferrer", className: "flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white px-4 py-2 rounded-lg transition-all text-sm", children: [_jsx(ExternalLink, { size: 16 }), "Open in GitHub"] })), _jsxs("button", { onClick: () => handleGeneratePR(bug), disabled: generatingPR, className: "flex items-center gap-2 bg-linear-to-r from-green-500 to-teal-500 hover:shadow-lg text-white px-4 py-2 rounded-lg transition-all text-sm disabled:opacity-50", children: [_jsx(GitPullRequest, { size: 16 }), "Generate Fix PR"] })] })] }, bug.id))) }))] }), _jsx(UpgradeModal, { isOpen: showUpgrade, onClose: () => setShowUpgrade(false), feature: "Bug Detection" })] }));
}
