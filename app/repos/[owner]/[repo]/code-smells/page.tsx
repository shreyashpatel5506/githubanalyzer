"use client";

import React, { useCallback, useEffect, useState } from "react";
import Layout from "@/app/components/Layout";
import { useParams } from "next/navigation";
import { ExternalLink, GitPullRequest, RefreshCw, ScanSearch } from "lucide-react";
import Link from "next/link";
import UpgradeModal from "@/app/components/UpgradeModal";

interface CodeSmell {
    id: string;
    fileName: string;
    line: number;
    severity: string;
    explanation: string;
    suggestedFix: string;
}

export default function CodeSmellsPage() {
    const params = useParams();
    const owner = params.owner as string;
    const repo = params.repo as string;

    const [smells, setSmells] = useState<CodeSmell[]>([]);
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [filter, setFilter] = useState("all");
    const [generatingPR, setGeneratingPR] = useState(false);
    const [showUpgrade, setShowUpgrade] = useState(false);
    const [scanStatus, setScanStatus] = useState<string | null>(null);
    const [scannedBranch, setScannedBranch] = useState<string>('main');

    const buildGitHubFileUrl = (fileName: string, line: number) => {
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
                attempts++;
                const statusRes = await fetch(`/api/scan/history?scanId=${scanId}`);
                const statusData = await statusRes.json();
                const scan = statusData.scans?.[0];

                if (scan?.status === "completed") {
                    setScanStatus("Scan complete! Loading results...");
                    await loadSmells();
                    setScanning(false);
                    setScanStatus(null);
                } else if (scan?.status === "failed") {
                    setScanStatus("Scan failed. Showing any previous results.");
                    setScanning(false);
                } else if (attempts < 30) {
                    setScanStatus(`Analyzing code... (${attempts * 5}s)`);
                    setTimeout(poll, 5000);
                } else {
                    setScanStatus("Scan is taking too long. Please refresh to check results.");
                    setScanning(false);
                }
            };

            setTimeout(poll, 5000);
        } catch (err: unknown) {
            setScanStatus(err instanceof Error ? err.message : "Failed to run scan");
            setScanning(false);
        }
    };

    const handleGeneratePR = async (smell: CodeSmell) => {
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
            } else if (res.ok) {
                alert(`PR created successfully! ${data.pr_url || ""}`);
            } else {
                alert(data.error || "Failed to create PR");
            }
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : "Failed to create PR");
        } finally {
            setGeneratingPR(false);
        }
    };

    const filteredSmells = smells.filter((s) =>
        filter === "all" ? true : s.severity === filter
    );

    const severityCount = {
        critical: smells.filter((s) => s.severity === "critical").length,
        high: smells.filter((s) => s.severity === "high").length,
        medium: smells.filter((s) => s.severity === "medium" || s.severity === "warning").length,
        low: smells.filter((s) => s.severity === "low" || s.severity === "info").length,
    };

    const getSeverityColor = (severity: string) => {
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

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-4">
                        <Link href="/repos" className="hover:text-white">Repositories</Link>
                        <span>/</span>
                        <Link href={`/repos/${owner}/${repo}`} className="hover:text-white">{owner}/{repo}</Link>
                        <span>/</span>
                        <span className="text-white">Code Smells</span>
                    </div>

                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Code Smells Analysis</h1>
                            <p className="text-gray-500 dark:text-gray-400">
                                {scanning ? scanStatus : `Detected ${smells.length} code smell(s)`}
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleRunScan}
                                disabled={scanning}
                                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-4 py-2.5 rounded-lg font-semibold transition-all"
                            >
                                {scanning ? <RefreshCw size={18} className="animate-spin" /> : <ScanSearch size={18} />}
                                {scanning ? "Scanning..." : "Run Scan"}
                            </button>
                            <button
                                onClick={() => handleGeneratePR(smells[0])}
                                disabled={generatingPR || smells.length === 0}
                                className="bg-linear-to-r from-purple-500 to-pink-500 text-white px-6 py-2.5 rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 disabled:opacity-50 transition-all flex items-center gap-2"
                            >
                                <GitPullRequest size={18} />
                                {generatingPR ? "Generating..." : "Fix PR"}
                            </button>
                        </div>
                    </div>

                    {/* Severity Filter */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                        <button
                            onClick={() => setFilter("all")}
                                className={`p-4 rounded-lg border-2 transition-all ${filter === "all"
                                    ? "bg-purple-500/10 border-purple-500"
                                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-purple-400"
                                }`}
                        >
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">{smells.length}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">All Issues</div>
                        </button>
                        <button
                            onClick={() => setFilter("critical")}
                                className={`p-4 rounded-lg border-2 transition-all ${filter === "critical"
                                    ? "bg-red-500/10 border-red-500"
                                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-red-400"
                                }`}
                        >
                            <div className="text-2xl font-bold text-red-300">{severityCount.critical}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">Critical</div>
                        </button>
                        <button
                            onClick={() => setFilter("high")}
                                className={`p-4 rounded-lg border-2 transition-all ${filter === "high"
                                    ? "bg-orange-500/10 border-orange-500"
                                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-orange-400"
                                }`}
                        >
                            <div className="text-2xl font-bold text-orange-300">{severityCount.high}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">High</div>
                        </button>
                        <button
                            onClick={() => setFilter("medium")}
                                className={`p-4 rounded-lg border-2 transition-all ${filter === "medium"
                                    ? "bg-yellow-500/10 border-yellow-500"
                                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-yellow-400"
                                }`}
                        >
                            <div className="text-2xl font-bold text-yellow-300">{severityCount.medium}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">Medium</div>
                        </button>
                        <button
                            onClick={() => setFilter("low")}
                            className={`p-4 rounded-lg border-2 transition-all ${filter === "low"
                                    ? "bg-blue-500/10 border-blue-500"
                                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-400"
                                }`}
                        >
                            <div className="text-2xl font-bold text-blue-300">{severityCount.low}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Low</div>
                        </button>
                    </div>

                    {/* Code Smells List */}
                    {loading ? (
                        <div className="text-center py-20 text-gray-500 dark:text-gray-400">Loading...</div>
                    ) : scanning ? (
                        <div className="text-center py-20 rounded-2xl border border-gray-200 bg-white dark:bg-gray-800/60 dark:border-gray-700">
                            <RefreshCw size={48} className="animate-spin text-emerald-500 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Scanning Repository...</h2>
                            <p className="text-gray-500 dark:text-gray-400">{scanStatus}</p>
                        </div>
                    ) : filteredSmells.length === 0 ? (
                        <div className="text-center py-20 rounded-2xl border border-gray-200 bg-white dark:bg-gray-800/60 dark:border-gray-700">
                            {smells.length === 0 ? (
                                <>
                                    <ScanSearch size={56} className="mx-auto mb-4 text-gray-400" />
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Scan Results Yet</h2>
                                    <p className="text-gray-500 dark:text-gray-400 mb-6">Run a scan to detect code smells in your repository.</p>
                                    <button
                                        onClick={handleRunScan}
                                        disabled={scanning}
                                        className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20"
                                    >
                                        <ScanSearch size={20} />
                                        Scan Now
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="text-6xl mb-4">✨</div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No smells in this category</h2>
                                    <p className="text-gray-500 dark:text-gray-400">Try selecting a different severity level</p>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredSmells.map((smell) => (
                                <div
                                    key={smell.id}
                                    className="rounded-xl p-6 border border-gray-200 bg-white shadow-sm hover:border-purple-400 dark:bg-gray-800/70 dark:border-gray-700 transition-all"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span
                                                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${getSeverityColor(
                                                        smell.severity
                                                    )}`}
                                                >
                                                    {smell.severity.toUpperCase()}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{smell.explanation}</h3>
                                            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                                <span className="font-mono">{smell.fileName}</span>
                                                <span>
                                                    Line {smell.line}
                                                </span>
                                            </div>
                                            <div className="mt-3 bg-green-500/10 border-l-4 border-green-500 p-3 rounded">
                                                <div className="text-sm font-semibold text-green-300 mb-1">Suggested fix</div>
                                                <div className="text-sm text-gray-700 dark:text-gray-200">{smell.suggestedFix}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <a
                                            href={buildGitHubFileUrl(smell.fileName, smell.line)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white px-4 py-2 rounded-lg transition-all text-sm"
                                        >
                                            <ExternalLink size={16} />
                                            Open in GitHub
                                        </a>
                                        <button
                                            onClick={() => handleGeneratePR(smell)}
                                            disabled={generatingPR}
                                            className="flex items-center gap-2 bg-linear-to-r from-green-500 to-teal-500 hover:shadow-lg text-white px-4 py-2 rounded-lg transition-all text-sm disabled:opacity-50"
                                        >
                                            <GitPullRequest size={16} />
                                            Generate Fix PR
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
            </div>

            <UpgradeModal
                isOpen={showUpgrade}
                onClose={() => setShowUpgrade(false)}
                feature="PR Generation"
            />
        </Layout>
    );
}
