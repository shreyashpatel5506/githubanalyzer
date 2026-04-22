"use client";

import React, { useEffect, useRef, useState } from "react";
import Layout from "@/app/components/Layout";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
    Star,
    GitFork,
    GitPullRequest,
    AlertTriangle,
    Bug,
    Shield,
    ExternalLink,
    Tag,
    Globe,
    Clock,
    ArrowLeft,
    ChevronRight,
    ShieldCheck,
    BookOpen,
    ScanSearch,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/Card";

interface RepoDetails {
    id: string;
    name: string;
    full_name: string;
    description: string;
    owner_username: string;
    language: string;
    is_private: boolean;
    stars: number;
    forks: number;
    watchers: number;
    open_issues: number;
    homepage: string;
    topics: string[];
    created_at: string;
    last_pushed_at: string;
    default_branch: string;
    size: number;
    additional_metadata?: {
        archived?: boolean;
        disabled?: boolean;
        has_wiki?: boolean;
        has_discussions?: boolean;
        license?: string | null;
    };
    stats: {
        code_smells: number;
        bugs: number;
        security_issues: number;
        maintainability_concerns?: number;
        overall_score?: number;
        has_readme: boolean;
    };
    issues?: Array<{
        id: string;
        number: number;
        title: string;
        state: string;
        url: string;
        user: string;
        created_at: string;
    }>;
    recent_commits?: Array<{
        date: string;
        count: number;
    }>;
    commit_analytics?: {
        monthly?: Array<{ period: string; count: number }>;
        yearly?: Array<{ period: string; count: number }>;
        contributors?: Array<{ author: string; commits: number }>;
        total_last_year?: number;
    };
    pull_requests?: {
        open: number;
        closed: number;
        merged: number;
    };
    pull_request_list?: Array<{
        id: string;
        number: number;
        title: string;
        state: string;
        merged_at?: string | null;
        url: string;
        user: string;
        created_at: string;
    }>;
    aiAnalysis?: {
        summary?: string;
        healthScore?: number;
        scores?: {
            maintainability?: number;
            security?: number;
            performance?: number;
            documentation?: number;
            testing?: number;
        };
        sections?: {
            strengths?: Array<{ title?: string; description?: string }>;
            criticalGaps?: Array<{ title?: string; description?: string }>;
            areasForImprovement?: Array<{ title?: string; description?: string }>;
            fixPlan48h?: Array<{ phase?: string; goal?: string; deliverables?: string[] }>;
            careerImpact?: string;
        };
    };
    scan?: {
        has_completed_scan?: boolean;
        latest_status?: string | null;
        latest_scan_id?: string | null;
    };
}

export default function RepoDetailPage() {
    const params = useParams();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const owner = params.owner as string;
    const repo = params.repo as string;
    const isDeepView = searchParams.get("view") === "deep" || pathname.endsWith("/deep-analysis");

    const [details, setDetails] = useState<RepoDetails | null>(null);
    const [readme, setReadme] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [runningDeepAnalysis, setRunningDeepAnalysis] = useState(false);
    const [commitView, setCommitView] = useState<"monthly" | "yearly">("monthly");
    const deepAnalysisButtonRef = useRef<HTMLButtonElement>(null);

    const stats = details?.stats || {
        code_smells: 0,
        bugs: 0,
        security_issues: 0,
        has_readme: false,
    };

    const overallScore = stats.overall_score ?? Math.max(1, 100 - (stats.bugs + stats.security_issues) * 5);
    const aiScores = details?.aiAnalysis?.scores || {};
    const aiSections = details?.aiAnalysis?.sections || {};

    const scoreTiles = [
        { label: "Maintainability", value: aiScores.maintainability ?? 7 },
        { label: "Security", value: aiScores.security ?? 7 },
        { label: "Documentation", value: aiScores.documentation ?? 7 },
        { label: "Scalability", value: aiScores.performance ?? 7 },
        { label: "Code Quality", value: aiScores.testing ?? 7 },
    ];

    useEffect(() => {
        if (!isDeepView || loading) return;

        const totalFindings = (stats.bugs || 0) + (stats.code_smells || 0) + (stats.security_issues || 0);
        if (totalFindings !== 0) return;

        const button = deepAnalysisButtonRef.current;
        if (!button) return;

        button.focus();
        button.scrollIntoView({ behavior: "smooth", block: "center" });
    }, [isDeepView, loading, stats.bugs, stats.code_smells, stats.security_issues]);

    useEffect(() => {
        let mounted = true;

        Promise.all([
            fetch(`/api/repos/${owner}/${repo}/details`).then(async (res) => {
                const data = await res.json();
                return { ok: res.ok, data };
            }),
            fetch(`/api/repos/${owner}/${repo}/readme`).then(async (res) => {
                const data = await res.json().catch(() => ({}));
                return { ok: res.ok, data };
            }),
        ])
            .then(([detailsRes, readmeRes]) => {
                if (!mounted) return;

                if (!detailsRes.ok || detailsRes.data?.error) {
                    setDetails(null);
                    setLoading(false);
                    return;
                }

                setDetails(detailsRes.data);
                setReadme(readmeRes.data?.readme || null);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                if (!mounted) return;
                setLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, [owner, repo]);

    const handleRunDeepAnalysis = async () => {
        setRunningDeepAnalysis(true);
        try {
            const repoFullName = `${owner}/${repo}`;
            const res = await fetch("/api/scan/enqueue", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ repoFullName }),
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.error || "Failed to start deep analysis");
                return;
            }

            alert(data.message || "Deep analysis started successfully");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to start deep analysis";
            alert(message);
        } finally {
            setRunningDeepAnalysis(false);
        }
    };

    const getLanguageColor = (lang: string) => {
        const colors: Record<string, string> = {
            JavaScript: "bg-yellow-500",
            TypeScript: "bg-blue-500",
            Python: "bg-green-500",
            Java: "bg-red-500",
            Go: "bg-cyan-500",
            Rust: "bg-orange-500",
        };
        return colors[lang] || "bg-gray-500";
    };

    if (loading) {
        return (
            <Layout>
                <div className="max-w-7xl mx-auto px-4 py-12 flex flex-col items-center justify-center space-y-4">
                    <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                    <p className="text-gray-500 animate-pulse font-medium">Analyzing repository details...</p>
                </div>
            </Layout>
        );
    }

    if (!details) {
        return (
            <Layout>
                <div className="max-w-7xl mx-auto px-4 py-20 text-center">
                    <div className="inline-flex p-4 bg-red-50 dark:bg-red-900/10 rounded-full mb-6 text-red-600">
                        <AlertTriangle size={48} />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Repository Not Found</h1>
                    <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
                        The repository you&apos;re looking for doesn&apos;t exist or isn&apos;t available for analysis.
                    </p>
                    <Link href="/repos" className="text-emerald-500 font-bold hover:underline flex items-center justify-center gap-2">
                        <ArrowLeft size={16} /> Back to Repositories
                    </Link>
                </div>
            </Layout>
        );
    }

    const monthlyCommitData = details?.commit_analytics?.monthly || [];
    const yearlyCommitData = details?.commit_analytics?.yearly || [];

    const activeCommitData = commitView === "monthly" ? monthlyCommitData : yearlyCommitData;
    const hasCompletedScan = Boolean(details.scan?.has_completed_scan);
    const totalFindings = (stats.bugs || 0) + (stats.code_smells || 0) + (stats.security_issues || 0);
    const showAllClear = isDeepView && hasCompletedScan && totalFindings === 0;

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Hero Header */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                        <Link href="/repos" className="hover:text-emerald-500 transition">Repositories</Link>
                        <ChevronRight size={12} />
                        <span className="text-emerald-500">{details.owner_username}</span>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                                    {details.name}
                                </h1>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${details.is_private ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {details.is_private ? 'Private' : 'Public'}
                                </span>
                            </div>
                            <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed">
                                {details.description || "No description provided for this repository."}
                            </p>

                            <div className="flex flex-wrap gap-2 pt-2">
                                {details.topics?.map((topic) => (
                                    <span key={topic} className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full text-xs font-semibold hover:bg-emerald-500/10 hover:text-emerald-500 transition cursor-default border border-transparent hover:border-emerald-500/20">
                                        #{topic}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <Link
                                href={`/repos/${owner}/${repo}`}
                                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition ${!isDeepView ? "bg-emerald-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-emerald-500"}`}
                            >
                                Open Repository
                            </Link>
                            <Link
                                href={`/repos/${owner}/${repo}/deep-analysis`}
                                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition ${isDeepView ? "bg-indigo-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-indigo-500"}`}
                            >
                                Deep Analysis
                            </Link>
                            {details.homepage && (
                                <a href={details.homepage} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500 hover:text-emerald-500 transition border border-transparent hover:border-emerald-500/20">
                                    <Globe size={20} />
                                </a>
                            )}
                            <a href={`https://github.com/${details.full_name}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-bold hover:scale-105 transition active:scale-95 shadow-lg shadow-black/5">
                                <ExternalLink size={18} />
                                View on GitHub
                            </a>
                        </div>
                    </div>

                    {/* Meta Bar */}
                    <div className="flex flex-wrap items-center gap-6 py-4 border-y border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2">
                            <Star size={18} className="text-amber-500 fill-amber-500" />
                            <span className="text-sm font-black text-gray-900 dark:text-white">{details.stars} <span className="text-gray-500 font-medium">stars</span></span>
                        </div>
                        <div className="flex items-center gap-2">
                            <GitFork size={18} className="text-blue-500" />
                            <span className="text-sm font-black text-gray-900 dark:text-white">{details.forks} <span className="text-gray-500 font-medium">forks</span></span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-gray-900 dark:text-white">{details.watchers} <span className="text-gray-500 font-medium">watchers</span></span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-gray-900 dark:text-white">{details.open_issues} <span className="text-gray-500 font-medium">open issues</span></span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock size={18} className="text-emerald-500" />
                            <span className="text-sm font-black text-gray-900 dark:text-white italic">
                                {new Date(details.last_pushed_at).toLocaleDateString()} <span className="text-gray-500 font-medium not-italic">last push</span>
                            </span>
                        </div>
                        {details.language && (
                            <div className="flex items-center gap-2">
                                <span className={`w-3 h-3 rounded-full ${getLanguageColor(details.language)}`} />
                                <span className="text-sm font-black text-gray-900 dark:text-white">{details.language}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 ml-auto">
                            <span className="text-xs text-gray-500">Created on {new Date(details.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">Default branch: {details.default_branch}</span>
                        <span className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">Size: {details.size} KB</span>
                        {details.additional_metadata?.license && (
                            <span className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">License: {details.additional_metadata.license}</span>
                        )}
                        {details.additional_metadata?.archived && (
                            <span className="px-2 py-1 text-xs rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">Archived</span>
                        )}
                        {details.additional_metadata?.disabled && (
                            <span className="px-2 py-1 text-xs rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">Disabled</span>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Analysis Cards */}
                    <div className="lg:col-span-2 space-y-8">
                        {isDeepView ? (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <Card className="border-none shadow-sm dark:bg-gray-800/40 backdrop-blur-sm group hover:scale-[1.02] transition duration-300">
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="p-2 bg-emerald-500/10 rounded-lg">
                                                    <ShieldCheck size={20} className="text-emerald-500" />
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Health</span>
                                            </div>
                                            <div className="text-3xl font-black text-gray-900 dark:text-white mb-1">{overallScore}%</div>
                                            <p className="text-xs text-gray-500 font-medium italic">Codebase stability score</p>
                                        </CardContent>
                                    </Card>

                                    <Link href={`/repos/${owner}/${repo}/bugs`}>
                                        <Card className="border-none shadow-sm dark:bg-gray-800/40 backdrop-blur-sm group hover:scale-[1.02] transition duration-300 cursor-pointer">
                                            <CardContent className="p-6">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="p-2 bg-red-500/10 rounded-lg">
                                                        <Bug size={20} className="text-red-500" />
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Bugs</span>
                                                </div>
                                                {!isDeepView ? (
                                                    <div className="text-3xl font-black text-gray-900 dark:text-white mb-1">{stats.bugs}</div>
                                                ) : (
                                                    <div className="text-sm font-bold text-gray-500 dark:text-gray-300 mb-1">Open findings</div>
                                                )}
                                                <p className="text-xs text-gray-500 font-medium italic">Detected bugs</p>
                                            </CardContent>
                                        </Card>
                                    </Link>

                                    <Link href={`/repos/${owner}/${repo}/security`}>
                                        <Card className="border-none shadow-sm dark:bg-gray-800/40 backdrop-blur-sm group hover:scale-[1.02] transition duration-300 cursor-pointer">
                                            <CardContent className="p-6">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                                                        <AlertTriangle size={20} className="text-indigo-500" />
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Security</span>
                                                </div>
                                                {!isDeepView ? (
                                                    <div className="text-3xl font-black text-gray-900 dark:text-white mb-1">{stats.security_issues}</div>
                                                ) : (
                                                    <div className="text-sm font-bold text-gray-500 dark:text-gray-300 mb-1">Open findings</div>
                                                )}
                                                <p className="text-xs text-gray-500 font-medium italic">Potential vulnerabilities</p>
                                            </CardContent>
                                        </Card>
                                    </Link>

                                    <Link href={`/repos/${owner}/${repo}/code-smells`}>
                                        <Card className="border-none shadow-sm dark:bg-gray-800/40 backdrop-blur-sm group hover:scale-[1.02] transition duration-300 cursor-pointer">
                                            <CardContent className="p-6">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="p-2 bg-amber-500/10 rounded-lg">
                                                        <Tag size={20} className="text-amber-500" />
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Smells</span>
                                                </div>
                                                {!isDeepView ? (
                                                    <div className="text-3xl font-black text-gray-900 dark:text-white mb-1">{stats.code_smells}</div>
                                                ) : (
                                                    <div className="text-sm font-bold text-gray-500 dark:text-gray-300 mb-1">Open findings</div>
                                                )}
                                                <p className="text-xs text-gray-500 font-medium italic">Maintainability concerns</p>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                </div>

                                <Card className="border-none shadow-md bg-linear-to-br from-emerald-600 to-emerald-800 text-white overflow-hidden">
                                    <CardContent className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                        <div>
                                            <h3 className="text-lg font-black italic tracking-tight">DEEP ANALYSIS</h3>
                                            <p className="text-emerald-100 text-sm">Run a fresh scan for bugs, code smells, security and ESLint summary.</p>
                                        </div>
                                        <button
                                            ref={deepAnalysisButtonRef}
                                            onClick={handleRunDeepAnalysis}
                                            disabled={runningDeepAnalysis}
                                            className="px-5 py-2.5 bg-white text-emerald-700 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-50 transition shadow-xl disabled:opacity-70 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60 focus-visible:scale-[1.03]"
                                        >
                                            {runningDeepAnalysis ? "Starting..." : "Run Deep Analysis"}
                                        </button>
                                    </CardContent>
                                </Card>

                                {showAllClear && (
                                    <Card className="border border-emerald-300/40 shadow-sm bg-emerald-50/70 dark:bg-emerald-900/20">
                                        <CardContent className="p-5">
                                            <p className="text-sm md:text-base font-semibold text-emerald-700 dark:text-emerald-300">
                                                ✅ Latest completed scan shows no Bugs, no Code Smells, and no Security issues.
                                            </p>
                                            <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-300/80">
                                                Repo currently looks clean. You can run Deep Analysis again anytime to re-check new commits.
                                            </p>
                                        </CardContent>
                                    </Card>
                                )}

                                <Card className="border-none shadow-lg dark:bg-gray-900/40 backdrop-blur-md overflow-hidden">
                                    <CardHeader className="border-b border-gray-100 dark:border-gray-800/50">
                                        <CardTitle className="text-xl font-black">AI Analysis</CardTitle>
                                        <p className="text-sm text-gray-500 mt-1">Project Health, strengths, critical gaps, and improvement plan.</p>
                                    </CardHeader>
                                    <CardContent className="pt-6 space-y-6">
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                                                <div className="text-[10px] uppercase tracking-wider text-emerald-500 font-bold">Project Health</div>
                                                <div className="text-2xl font-black text-gray-900 dark:text-white">{(overallScore / 10).toFixed(1)}/10</div>
                                            </div>
                                            {scoreTiles.map((item) => (
                                                <div key={item.label} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 p-3">
                                                    <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{item.label}</div>
                                                    <div className="text-xl font-black text-gray-900 dark:text-white">{Number(item.value).toFixed(1)}/10</div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/60">
                                            <h4 className="font-black text-gray-900 dark:text-white mb-2">Project Health</h4>
                                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                                {details.aiAnalysis?.summary || "No AI summary available yet."}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                                                <h4 className="font-black text-gray-900 dark:text-white mb-3">Strengths</h4>
                                                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                                                    {(aiSections.strengths || []).length > 0 ? (aiSections.strengths || []).map((s, idx) => (
                                                        <li key={`${s.title || "strength"}-${idx}`}>• <strong>{s.title || "Strength"}</strong>: {s.description || ""}</li>
                                                    )) : <li>• No strengths generated yet.</li>}
                                                </ul>
                                            </div>
                                            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                                                <h4 className="font-black text-gray-900 dark:text-white mb-3">Critical Gaps Blocking Production</h4>
                                                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                                                    {(aiSections.criticalGaps || []).length > 0 ? (aiSections.criticalGaps || []).map((g, idx) => (
                                                        <li key={`${g.title || "gap"}-${idx}`}>• <strong>{g.title || "Gap"}</strong>: {g.description || ""}</li>
                                                    )) : <li>• No critical gaps generated yet.</li>}
                                                </ul>
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                                            <h4 className="font-black text-gray-900 dark:text-white mb-3">48-Hour Improvement Plan</h4>
                                            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                                                {(aiSections.fixPlan48h || []).length > 0 ? (aiSections.fixPlan48h || []).map((step, idx) => (
                                                    <li key={`${step.phase || "phase"}-${idx}`}>• <strong>{step.phase || `Step ${idx + 1}`}</strong>: {step.goal || ""}</li>
                                                )) : <li>• No fix plan generated yet.</li>}
                                            </ul>
                                        </div>

                                        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
                                            <h4 className="font-black text-gray-900 dark:text-white mb-2">Career Impact</h4>
                                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                                {aiSections.careerImpact || "No career impact note generated yet."}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </>
                        ) : (
                            <Card className="border-none shadow-lg dark:bg-gray-900/40 backdrop-blur-md overflow-hidden">
                                <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 dark:border-gray-800/50 pb-4">
                                    <CardTitle className="text-xl font-black flex items-center gap-2">
                                        <BookOpen size={18} className="text-emerald-500" /> README
                                    </CardTitle>
                                    <span className="text-xs text-gray-500">GitHub metadata + README overview</span>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    {readme ? (
                                        <pre className="whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/60 rounded-xl p-4 max-h-105 overflow-auto">
                                            {readme}
                                        </pre>
                                    ) : (
                                        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center text-gray-500">
                                            README not available for this repository.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Chart Area */}
                        <Card className="border-none shadow-lg dark:bg-gray-900/40 backdrop-blur-md overflow-hidden min-h-100">
                            <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 dark:border-gray-800/50 pb-6">
                                <div>
                                    <CardTitle className="text-xl font-black">Commit Activity</CardTitle>
                                    <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-bold">Past 12 months productivity trend</p>
                                </div>
                                <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                    <button
                                        type="button"
                                        onClick={() => setCommitView("monthly")}
                                        className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition ${commitView === "monthly"
                                            ? "bg-white dark:bg-gray-700 text-emerald-500 shadow-sm"
                                            : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                            }`}
                                    >
                                        Monthly
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCommitView("yearly")}
                                        className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition ${commitView === "yearly"
                                            ? "bg-white dark:bg-gray-700 text-emerald-500 shadow-sm"
                                            : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                            }`}
                                    >
                                        Yearly
                                    </button>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-8 h-75">
                                {activeCommitData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={activeCommitData}>
                                            <defs>
                                                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis
                                                dataKey="period"
                                                stroke="#94a3b8"
                                                fontSize={10}
                                                tickLine={false}
                                                axisLine={false}
                                                tickFormatter={(str) => {
                                                    if (commitView === "yearly") return str;
                                                    const [year, month] = String(str).split("-");
                                                    const dt = new Date(Number(year), Number(month) - 1, 1);
                                                    return dt.toLocaleDateString([], { month: "short" });
                                                }}
                                            />
                                            <YAxis
                                                stroke="#94a3b8"
                                                fontSize={10}
                                                tickLine={false}
                                                axisLine={false}
                                                width={30}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'rgba(0,0,0,0.8)',
                                                    border: 'none',
                                                    borderRadius: '12px',
                                                    fontSize: '12px'
                                                }}
                                            />
                                            <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} fill="url(#chartGradient)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-400 text-sm italic">
                                        Insufficient data for activity chart
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {details.pull_requests && (
                            <Card className="border-none shadow-sm dark:bg-gray-800/40 backdrop-blur-sm">
                                <CardHeader>
                                    <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest">
                                        <GitPullRequest size={16} className="text-indigo-500" />
                                        Pull Requests
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Merged</span>
                                        <span className="text-xs font-black text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full">{details.pull_requests.merged}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Open</span>
                                        <span className="text-xs font-black text-indigo-500 bg-indigo-500/10 px-3 py-1 rounded-full">{details.pull_requests.open}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <Card className="border-none shadow-sm dark:bg-gray-800/40 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest">
                                    <AlertTriangle size={16} className="text-amber-500" />
                                    Open Issues
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {details.issues?.length ? details.issues.slice(0, 5).map((issue) => (
                                    <a
                                        key={issue.id}
                                        href={issue.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block text-xs text-gray-600 dark:text-gray-300 hover:text-emerald-500 transition"
                                    >
                                        #{issue.number} {issue.title}
                                    </a>
                                )) : (
                                    <p className="text-xs text-gray-500">No open issues found.</p>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-sm dark:bg-gray-800/40 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest">
                                    <Star size={16} className="text-amber-500" />
                                    Top Contributors (Last Year)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {(details.commit_analytics?.contributors || []).length > 0 ? (
                                    (details.commit_analytics?.contributors || []).slice(0, 5).map((c) => (
                                        <div key={c.author} className="flex items-center justify-between text-xs">
                                            <span className="text-gray-600 dark:text-gray-300">{c.author}</span>
                                            <span className="font-black text-emerald-500">{c.commits}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-gray-500">No contributor analytics available yet.</p>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-sm dark:bg-gray-800/40 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest">
                                    <GitPullRequest size={16} className="text-indigo-500" />
                                    Pull Request Feed
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {details.pull_request_list?.length ? details.pull_request_list.slice(0, 5).map((pr) => (
                                    <a
                                        key={pr.id}
                                        href={pr.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block text-xs text-gray-600 dark:text-gray-300 hover:text-emerald-500 transition"
                                    >
                                        #{pr.number} {pr.title}
                                    </a>
                                )) : (
                                    <p className="text-xs text-gray-500">No pull requests found.</p>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-sm dark:bg-gray-800/40 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest">
                                    <Shield size={16} className="text-emerald-500" />
                                    Security Status
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-4 bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10">
                                    <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center">
                                        <ShieldCheck size={20} className="text-emerald-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{stats.security_issues > 0 ? "Needs Review" : "Code Safe"}</p>
                                        <p className="text-[10px] text-gray-500 font-bold">{stats.security_issues} security issue(s) detected</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {!isDeepView && (
                            <Link href={`/repos/${owner}/${repo}/deep-analysis`}>
                                <Card className="border-none shadow-md bg-linear-to-br from-indigo-600 to-indigo-800 text-white overflow-hidden">
                                    <CardContent className="p-6 flex items-center justify-between gap-4">
                                        <div>
                                            <h3 className="text-lg font-black tracking-tight">Need findings too?</h3>
                                            <p className="text-indigo-100 text-sm">Switch to Deep Analysis for bugs, smells and security details.</p>
                                        </div>
                                        <ScanSearch size={28} />
                                    </CardContent>
                                </Card>
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
