"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Layout from "@/app/components/Layout";
import { useParams } from "next/navigation";
import { ExternalLink, GitPullRequest, RefreshCw, ScanSearch } from "lucide-react";
import Link from "next/link";
import UpgradeModal from "@/app/components/UpgradeModal";
export default function CodeSmellsPage() {
    const params = useParams();
    const owner = params.owner;
    const repo = params.repo;
    const [smells, setSmells] = useState([]);
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
    const loadSmells = useCallback(async () => {
        const res = await fetch(`/api/repos/${owner}/${repo}/code-smells`);
        const status = res.status;
        const data = await res.json();
        if (status === 403) {
            setShowUpgrade(true);
        }
        setSmells(data.smells || []);
        setScannedBranch(data.scannedBranch || 'main');
        return data.smells || [];
    }, [owner, repo]);
    useEffect(() => {
        loadSmells()
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    }, [loadSmells]);
    useEffect(() => {
        if (loading || scanning || smells.length !== 0)
            return;
        const button = scanNowButtonRef.current;
        if (!button)
            return;
        button.focus();
        button.scrollIntoView({ behavior: "smooth", block: "center" });
    }, [loading, scanning, smells.length]);
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
                setScanning(false);
                return;
            }
            const scanId = data.scanId;
            setScanStatus("Scanning repository files...");
            let attempts = 0;
            const poll = async () => {
                var _a;
                attempts++;
                const statusRes = await fetch(`/api/scan/history?scanId=${scanId}`);
                const statusData = await statusRes.json();
                const scan = (_a = statusData.scans) === null || _a === void 0 ? void 0 : _a[0];
                if ((scan === null || scan === void 0 ? void 0 : scan.status) === "completed") {
                    setScanStatus("Scan complete! Loading results...");
                    await loadSmells();
                    setScanning(false);
                    setScanStatus(null);
                }
                else if ((scan === null || scan === void 0 ? void 0 : scan.status) === "failed") {
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
    const handleGeneratePR = async (smell) => {
        setGeneratingPR(true);
        try {
            const res = await fetch(`/api/repos/${owner}/${repo}/pr/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "code-smell", issueId: smell.id, issue: smell }),
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
    const filteredSmells = smells.filter((s) => filter === "all" ? true : s.severity === filter);
    const severityCount = {
        critical: smells.filter((s) => s.severity === "critical").length,
        high: smells.filter((s) => s.severity === "high").length,
        medium: smells.filter((s) => s.severity === "medium" || s.severity === "warning").length,
        low: smells.filter((s) => s.severity === "low" || s.severity === "info").length,
    };
    const getSeverityColor = (severity) => {
        switch (severity.toLowerCase()) {
            case "critical":
                return "bg-red-500/20 text-red-300 border-red-500";
            case "high":
            case "error":
                return "bg-orange-500/20 text-orange-300 border-orange-500";
            case "medium":
            case "warning":
                return "bg-yellow-500/20 text-yellow-300 border-yellow-500";
            default:
                return "bg-blue-500/20 text-blue-300 border-blue-500";
        }
    };
    return (_jsxs(Layout, { children: [_jsxs("div", { className: "max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500", children: [_jsxs("div", { className: "flex items-center gap-2 text-gray-400 text-sm mb-4", children: [_jsx(Link, { href: "/repos", className: "hover:text-white", children: "Repositories" }), _jsx("span", { children: "/" }), _jsxs(Link, { href: `/repos/${owner}/${repo}`, className: "hover:text-white", children: [owner, "/", repo] }), _jsx("span", { children: "/" }), _jsx("span", { className: "text-white", children: "Code Smells" })] }), _jsxs("div", { className: "flex items-center justify-between mb-8", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-4xl font-bold text-gray-900 dark:text-white mb-2", children: "Code Smells Analysis" }), _jsx("p", { className: "text-gray-500 dark:text-gray-400", children: scanning ? scanStatus : `Detected ${smells.length} code smell(s)` })] }), _jsxs("div", { className: "flex gap-3", children: [_jsxs("button", { onClick: handleRunScan, disabled: scanning, className: "flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-4 py-2.5 rounded-lg font-semibold transition-all", children: [scanning ? _jsx(RefreshCw, { size: 18, className: "animate-spin" }) : _jsx(ScanSearch, { size: 18 }), scanning ? "Scanning..." : "Run Scan"] }), _jsxs("button", { onClick: () => handleGeneratePR(smells[0]), disabled: generatingPR || smells.length === 0, className: "bg-linear-to-r from-purple-500 to-pink-500 text-white px-6 py-2.5 rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 disabled:opacity-50 transition-all flex items-center gap-2", children: [_jsx(GitPullRequest, { size: 18 }), generatingPR ? "Generating..." : "Fix PR"] })] })] }), _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-5 gap-4 mb-8", children: [_jsxs("button", { onClick: () => setFilter("all"), className: `p-4 rounded-lg border-2 transition-all ${filter === "all"
                                    ? "bg-purple-500/10 border-purple-500"
                                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-purple-400"}`, children: [_jsx("div", { className: "text-2xl font-bold text-gray-900 dark:text-white", children: smells.length }), _jsx("div", { className: "text-sm text-gray-500 dark:text-gray-400", children: "All Issues" })] }), _jsxs("button", { onClick: () => setFilter("critical"), className: `p-4 rounded-lg border-2 transition-all ${filter === "critical"
                                    ? "bg-red-500/10 border-red-500"
                                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-red-400"}`, children: [_jsx("div", { className: "text-2xl font-bold text-red-300", children: severityCount.critical }), _jsx("div", { className: "text-sm text-gray-500 dark:text-gray-400", children: "Critical" })] }), _jsxs("button", { onClick: () => setFilter("high"), className: `p-4 rounded-lg border-2 transition-all ${filter === "high"
                                    ? "bg-orange-500/10 border-orange-500"
                                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-orange-400"}`, children: [_jsx("div", { className: "text-2xl font-bold text-orange-300", children: severityCount.high }), _jsx("div", { className: "text-sm text-gray-500 dark:text-gray-400", children: "High" })] }), _jsxs("button", { onClick: () => setFilter("medium"), className: `p-4 rounded-lg border-2 transition-all ${filter === "medium"
                                    ? "bg-yellow-500/10 border-yellow-500"
                                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-yellow-400"}`, children: [_jsx("div", { className: "text-2xl font-bold text-yellow-300", children: severityCount.medium }), _jsx("div", { className: "text-sm text-gray-500 dark:text-gray-400", children: "Medium" })] }), _jsxs("button", { onClick: () => setFilter("low"), className: `p-4 rounded-lg border-2 transition-all ${filter === "low"
                                    ? "bg-blue-500/10 border-blue-500"
                                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-400"}`, children: [_jsx("div", { className: "text-2xl font-bold text-blue-300", children: severityCount.low }), _jsx("div", { className: "text-sm text-gray-500 dark:text-gray-400", children: "Low" })] })] }), loading ? (_jsx("div", { className: "text-center py-20 text-gray-500 dark:text-gray-400", children: "Loading..." })) : scanning ? (_jsxs("div", { className: "text-center py-20 rounded-2xl border border-gray-200 bg-white dark:bg-gray-800/60 dark:border-gray-700", children: [_jsx(RefreshCw, { size: 48, className: "animate-spin text-emerald-500 mx-auto mb-4" }), _jsx("h2", { className: "text-2xl font-bold text-gray-900 dark:text-white mb-2", children: "Scanning Repository..." }), _jsx("p", { className: "text-gray-500 dark:text-gray-400", children: scanStatus })] })) : filteredSmells.length === 0 ? (_jsx("div", { className: "text-center py-20 rounded-2xl border border-gray-200 bg-white dark:bg-gray-800/60 dark:border-gray-700", children: smells.length === 0 ? (_jsxs(_Fragment, { children: [_jsx(ScanSearch, { size: 56, className: "mx-auto mb-4 text-gray-400" }), _jsx("h2", { className: "text-2xl font-bold text-gray-900 dark:text-white mb-2", children: "No Scan Results Yet" }), _jsx("p", { className: "text-gray-500 dark:text-gray-400 mb-6", children: "Run a scan to detect code smells in your repository." }), _jsxs("button", { ref: scanNowButtonRef, onClick: handleRunScan, disabled: scanning, className: "inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/40 focus-visible:scale-[1.03]", children: [_jsx(ScanSearch, { size: 20 }), "Scan Now"] })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "text-6xl mb-4", children: "\u2728" }), _jsx("h2", { className: "text-2xl font-bold text-gray-900 dark:text-white mb-2", children: "No smells in this category" }), _jsx("p", { className: "text-gray-500 dark:text-gray-400", children: "Try selecting a different severity level" })] })) })) : (_jsx("div", { className: "space-y-4", children: filteredSmells.map((smell) => (_jsxs("div", { className: "rounded-xl p-6 border border-gray-200 bg-white shadow-sm hover:border-purple-400 dark:bg-gray-800/70 dark:border-gray-700 transition-all", children: [_jsx("div", { className: "flex items-start justify-between mb-4", children: _jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "flex items-center gap-3 mb-2", children: _jsx("span", { className: `px-3 py-1 rounded-full text-xs font-semibold border ${getSeverityColor(smell.severity)}`, children: smell.severity.toUpperCase() }) }), _jsx("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white mb-2", children: smell.explanation }), _jsxs("div", { className: "flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400", children: [_jsx("span", { className: "font-mono", children: smell.fileName }), _jsxs("span", { children: ["Line ", smell.line] })] }), _jsxs("div", { className: "mt-3 bg-green-500/10 border-l-4 border-green-500 p-3 rounded", children: [_jsx("div", { className: "text-sm font-semibold text-green-300 mb-1", children: "Suggested fix" }), _jsx("div", { className: "text-sm text-gray-700 dark:text-gray-200", children: smell.suggestedFix })] })] }) }), _jsxs("div", { className: "flex gap-3", children: [_jsxs("a", { href: buildGitHubFileUrl(smell.fileName, smell.line), target: "_blank", rel: "noopener noreferrer", className: "flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white px-4 py-2 rounded-lg transition-all text-sm", children: [_jsx(ExternalLink, { size: 16 }), "Open in GitHub"] }), _jsxs("button", { onClick: () => handleGeneratePR(smell), disabled: generatingPR, className: "flex items-center gap-2 bg-linear-to-r from-green-500 to-teal-500 hover:shadow-lg text-white px-4 py-2 rounded-lg transition-all text-sm disabled:opacity-50", children: [_jsx(GitPullRequest, { size: 16 }), "Generate Fix PR"] })] })] }, smell.id))) }))] }), _jsx(UpgradeModal, { isOpen: showUpgrade, onClose: () => setShowUpgrade(false), feature: "PR Generation" })] }));
}
