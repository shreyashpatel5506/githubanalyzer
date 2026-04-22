"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Layout from "@/app/components/Layout";
import { useParams } from "next/navigation";
import { Shield, ExternalLink, GitPullRequest, AlertOctagon, RefreshCw, ScanSearch } from "lucide-react";
import Link from "next/link";
import UpgradeModal from "@/app/components/UpgradeModal";

interface SecurityIssue {
    id: string;
    fileName: string;
    line: number;
    severity: string;
    explanation: string;
    suggestedFix: string;
}

export default function SecurityPage() {
    const params = useParams();
    const owner = params.owner as string;
    const repo = params.repo as string;

    const [issues, setIssues] = useState<SecurityIssue[]>([]);
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [filter, setFilter] = useState("all");
    const [generatingPR, setGeneratingPR] = useState(false);
    const [showUpgrade, setShowUpgrade] = useState(false);
    const [scanStatus, setScanStatus] = useState<string | null>(null);
    const [scannedBranch, setScannedBranch] = useState<string>('main');
    const scanNowButtonRef = useRef<HTMLButtonElement>(null);

    const buildGitHubFileUrl = (fileName: string, line: number) => {
        const safePath = fileName.split('/').map(encodeURIComponent).join('/');
        return `https://github.com/${owner}/${repo}/blob/${scannedBranch}/${safePath}#L${line}`;
    };

    const loadIssues = useCallback(async () => {
        const res = await fetch(`/api/repos/${owner}/${repo}/security`);
        const status = res.status;
        const data = await res.json();
        if (status === 403) {
            setShowUpgrade(true);
        }
        setIssues(data.issues || []);
        setScannedBranch(data.scannedBranch || 'main');
        return data.issues || [];
    }, [owner, repo]);

    useEffect(() => {
        loadIssues()
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    }, [loadIssues]);

    useEffect(() => {
        if (loading || scanning || issues.length !== 0) return;

        const button = scanNowButtonRef.current;
        if (!button) return;

        button.focus();
        button.scrollIntoView({ behavior: "smooth", block: "center" });
    }, [loading, scanning, issues.length]);

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
                    await loadIssues();
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

    const handleGeneratePR = async (issue: SecurityIssue) => {
        setGeneratingPR(true);
        try {
            const res = await fetch(`/api/repos/${owner}/${repo}/pr/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "security", issueId: issue.id, issue }),
            });

            const data = await res.json();

            if (res.status === 403) {
                setShowUpgrade(true);
            } else if (res.ok) {
                alert(`Security fix PR created! ${data.pr_url || ""}`);
            } else {
                alert(data.error || "Failed to create PR");
            }
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : "Failed to create PR");
        } finally {
            setGeneratingPR(false);
        }
    };

    const filteredIssues = issues.filter((i) =>
        filter === "all" ? true : i.severity === filter
    );

    const severityCount = {
        critical: issues.filter((i) => i.severity === "critical").length,
        high: issues.filter((i) => i.severity === "high").length,
        medium: issues.filter((i) => i.severity === "medium").length,
        low: issues.filter((i) => i.severity === "low").length,
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case "critical":
                return "bg-red-600/20 text-red-200 border-red-600";
            case "high":
                return "bg-orange-500/20 text-orange-200 border-orange-500";
            case "medium":
                return "bg-yellow-500/20 text-yellow-200 border-yellow-500";
            default:
                return "bg-blue-500/20 text-blue-200 border-blue-500";
        }
    };

    const getSeverityIcon = (severity: string) => {
        if (severity === "critical" || severity === "high") {
            return <AlertOctagon className="text-red-400" size={24} />;
        }
        return <Shield className="text-yellow-400" size={24} />;
    };

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-4">
                        <Link href="/repos" className="hover:text-white">Repositories</Link>
                        <span>/</span>
                        <Link href={`/repos/${owner}/${repo}`} className="hover:text-white">{owner}/{repo}</Link>
                        <span>/</span>
                        <span className="text-white">Security</span>
                    </div>

                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Security Scan Results</h1>
                                <span className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm font-semibold">PRO</span>
                            </div>
                            <p className="text-gray-500 dark:text-gray-400">
                                {scanning ? scanStatus : `Found ${issues.length} security issue(s)`}
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
                                onClick={() => handleGeneratePR(issues[0])}
                                disabled={generatingPR || issues.length === 0}
                                className="bg-linear-to-r from-purple-500 to-indigo-500 text-white px-6 py-2.5 rounded-lg font-semibold hover:shadow-lg disabled:opacity-50 transition-all flex items-center gap-2"
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
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{issues.length}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">All Issues</div>
                        </button>
                        <button
                            onClick={() => setFilter("critical")}
                            className={`p-4 rounded-lg border-2 transition-all ${filter === "critical"
                                ? "bg-red-600/10 border-red-600"
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

                    {/* Security Issues List */}
                    {loading ? (
                        <div className="text-center py-20 text-gray-500 dark:text-gray-400">Loading...</div>
                    ) : scanning ? (
                        <div className="text-center py-20 rounded-2xl border border-gray-200 bg-white dark:bg-gray-800/60 dark:border-gray-700">
                            <RefreshCw size={48} className="animate-spin text-emerald-500 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Scanning Repository...</h2>
                            <p className="text-gray-500 dark:text-gray-400">{scanStatus}</p>
                        </div>
                    ) : filteredIssues.length === 0 ? (
                        <div className="text-center py-20 rounded-2xl border border-gray-200 bg-white dark:bg-gray-800/60 dark:border-gray-700">
                            {issues.length === 0 ? (
                                <>
                                    <ScanSearch size={56} className="mx-auto mb-4 text-gray-400" />
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Scan Results Yet</h2>
                                    <p className="text-gray-500 dark:text-gray-400 mb-6">Run a scan to check your repository for security issues.</p>
                                    <button
                                        ref={scanNowButtonRef}
                                        onClick={handleRunScan}
                                        disabled={scanning}
                                        className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/40 focus-visible:scale-[1.03]"
                                    >
                                        <ScanSearch size={20} />
                                        Scan Now
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="text-6xl mb-4">🛡️</div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No issues in this category</h2>
                                    <p className="text-gray-500 dark:text-gray-400">Try selecting a different severity</p>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredIssues.map((issue) => (
                                <div
                                    key={issue.id}
                                    className="rounded-xl p-6 border border-gray-200 bg-white shadow-sm hover:border-purple-400 dark:bg-gray-800/70 dark:border-gray-700 transition-all"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-3">
                                                {getSeverityIcon(issue.severity)}
                                                <span
                                                    className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${getSeverityColor(
                                                        issue.severity
                                                    )}`}
                                                >
                                                    {issue.severity.toUpperCase()}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{issue.explanation}</h3>
                                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                                                <span className="font-mono">{issue.fileName || 'unknown'}</span>
                                                <span className="ml-3">Line {issue.line}</span>
                                            </div>
                                            {issue.suggestedFix && (
                                                <div className="bg-green-500/10 border-l-4 border-green-500 p-3 rounded mt-3">
                                                    <div className="text-sm font-semibold text-green-300 mb-1">💡 Remediation</div>
                                                    <div className="text-sm text-gray-700 dark:text-gray-200">{issue.suggestedFix}</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        {issue.fileName && (
                                            <a
                                                href={buildGitHubFileUrl(issue.fileName, issue.line)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white px-4 py-2 rounded-lg transition-all text-sm"
                                            >
                                                <ExternalLink size={16} />
                                                Open in GitHub
                                            </a>
                                        )}
                                        <button
                                            onClick={() => handleGeneratePR(issue)}
                                            disabled={generatingPR}
                                            className="flex items-center gap-2 bg-linear-to-r from-green-500 to-teal-500 hover:shadow-lg text-white px-4 py-2 rounded-lg transition-all text-sm disabled:opacity-50"
                                        >
                                            <GitPullRequest size={16} />
                                            Generate Security Fix PR
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
                feature="Security Scanning"
            />
        </Layout>
    );
}
