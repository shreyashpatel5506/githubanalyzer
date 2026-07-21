"use client";

import React, { useEffect, useState, useCallback } from "react";
import Layout from "@/app/components/Layout";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    GitBranch,
    Star,
    GitFork,
    AlertTriangle,
    Bug,
    Shield,
    FileText,
    Zap,
    Clock,
    CheckCircle2,
    ArrowRight,
    Search
} from "lucide-react";

import { Repository } from "@/types/repo";
import { Card, CardContent } from "@/app/components/Card";
import { useSessionAuth } from "@/app/lib/use-session-auth";

export default function ReposPage() {
    const { isSignedIn, isLoaded } = useSessionAuth();
    const router = useRouter();
    const [repos, setRepos] = useState<Repository[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "scanned" | "unscanned">("all");
    const [scanning, setScanning] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [loadError, setLoadError] = useState<string | null>(null);

    const loadRepos = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const res = await fetch("/api/repos");
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to load repositories");
            }

            setRepos(data.repos || []);
            return data.repos || [];
        } catch (err: any) {
            setLoadError(err.message || "Failed to load repositories");
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    // 🛡️ Redirect if not signed in
    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            router.push("/");
        }
    }, [isLoaded, isSignedIn, router]);

    // 📦 Initial Load
    useEffect(() => {
        if (isSignedIn) {
            loadRepos();
        }
    }, [isSignedIn, loadRepos]);

    const handleDeepAnalysis = async (repoFullName: string, owner: string, repo: string) => {
        setScanning(repoFullName);
        try {
            const res = await fetch("/api/scan/enqueue", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ repoFullName }),
            });

            const data = await res.json();

            if (res.ok) {
                alert(`Deep analysis started for ${repoFullName}!`);
                loadRepos();
                router.push(`/repos/${owner}/${repo}/deep-analysis`);
            } else {
                alert(`Error: ${data.error || "Failed to start analysis"}`);
            }
        } catch (err: any) {
            alert(err.message || "An error occurred");
        } finally {
            setScanning(null);
        }
    };

    const filteredRepos = repos.filter((repo) => {
        const matchesFilter = filter === "all"
            || (filter === "scanned" && repo.scanned)
            || (filter === "unscanned" && !repo.scanned);

        const matchesSearch = repo.name.toLowerCase().includes(searchTerm.toLowerCase())
            || repo.owner_username.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesFilter && matchesSearch;
    });

    const getLanguageColor = (lang: string) => {
        const colors: Record<string, string> = {
            JavaScript: "bg-yellow-500",
            TypeScript: "bg-blue-500",
            Python: "bg-emerald-500",
            Java: "bg-red-500",
            Go: "bg-cyan-500",
            Rust: "bg-orange-500",
            Ruby: "bg-rose-600",
            PHP: "bg-indigo-500",
        };
        return colors[lang] || "bg-gray-500";
    };

    if (!isLoaded || (isSignedIn && loading && repos.length === 0)) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                </div>
            </Layout>
        );
    }

    if (!isSignedIn) return null; // Redirection handled by useEffect

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            Your Repositories
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400">
                            All repositories are synced automatically from your GitHub account
                        </p>
                    </div>
                </div>

                {loadError && (
                    <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
                        <CardContent className="py-4 text-sm text-red-700 dark:text-red-300">
                            {loadError}
                        </CardContent>
                    </Card>
                )}

                {/* Filters and Search */}
                <Card className="p-2 border-none bg-gray-100/50 dark:bg-gray-800/50 backdrop-blur-sm">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-center p-2">
                        <div className="flex p-1 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 w-full sm:w-auto shadow-sm">
                            {[
                                { id: "all", label: "All", count: repos.length },
                                { id: "scanned", label: "Scanned", count: repos.filter(r => r.scanned).length },
                                { id: "unscanned", label: "Unscanned", count: repos.filter(r => !r.scanned).length }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setFilter(tab.id as any)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2
                                        ${filter === tab.id
                                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                                            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                        }`}
                                >
                                    {tab.label}
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filter === tab.id ? "bg-white/20" : "bg-gray-200 dark:bg-gray-800"}`}>
                                        {tab.count}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search repositories..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>
                    </div>
                </Card>

                {/* Empty State */}
                {filteredRepos.length === 0 ? (
                    <Card className="border-dashed py-20 bg-gray-50/50 dark:bg-gray-800/20">
                        <CardContent className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-6">
                                <GitBranch className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                {searchTerm ? "No matches found" : "Your code vault is empty"}
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-8">
                                {searchTerm
                                    ? `No repositories found matching "${searchTerm}"`
                                    : "Connect your GitHub account to automatically analyze your repositories with AI insights."}
                            </p>
                            {!searchTerm && (
                                <p className="text-xs text-gray-400">No repositories were returned by the GitHub API yet.</p>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    /* Repo Grid */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredRepos.map((repo) => (
                            <Card
                                key={repo.id}
                                hover
                                onClick={() => router.push(`/repos/${repo.owner_username}/${repo.name}`)}
                                className="group flex flex-col h-full overflow-hidden border-none shadow-sm dark:bg-gray-800/40 backdrop-blur-sm cursor-pointer"
                            >
                                <div className={`h-1.5 w-full bg-linear-to-r ${repo.scanned ? "from-emerald-400 to-emerald-600" : "from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-800 opacity-30"}`} />

                                <CardContent className="p-6 flex flex-col flex-1">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="space-y-1 overflow-hidden">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                                                    {repo.name}
                                                </h3>
                                                {repo.is_private && (
                                                    <Shield size={12} className="text-amber-500" />
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 truncate">
                                                {repo.owner_username}
                                            </p>
                                        </div>

                                        {repo.scanned && (
                                            <div className="p-1 px-2 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                                                <CheckCircle2 size={12} className="text-emerald-500" />
                                            </div>
                                        )}
                                    </div>

                                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-6 min-h-10 flex-1">
                                        {repo.description || "No description provided."}
                                    </p>

                                    {/* Stats Hub */}
                                    {repo.scanned && repo.stats ? (
                                        <div className="grid grid-cols-2 gap-3 mb-6">
                                            <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                                <div className="flex items-center gap-2 text-red-500 mb-1">
                                                    <Bug size={14} />
                                                    <span className="text-sm font-bold">{repo.stats.bugs}</span>
                                                </div>
                                                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold text-center">Bugs</p>
                                            </div>
                                            <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                                <div className="flex items-center gap-2 text-amber-500 mb-1">
                                                    <AlertTriangle size={14} />
                                                    <span className="text-sm font-bold">{repo.stats.code_smells}</span>
                                                </div>
                                                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold text-center">Smells</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-4 mb-6 text-sm text-gray-500">
                                            <div className="flex items-center gap-1.5">
                                                <Star size={14} />
                                                {repo.stars || 0}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <GitFork size={14} />
                                                {repo.forks || 0}
                                            </div>
                                            {repo.language && (
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`w-2 h-2 rounded-full ${getLanguageColor(repo.language)}`} />
                                                    {repo.language}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="mt-auto space-y-3">
                                        <div className="flex gap-2">
                                            <Link
                                                href={`/repos/${repo.owner_username}/${repo.name}`}
                                                className="flex-1 flex items-center justify-between px-4 py-2.5 bg-gray-900 dark:bg-white dark:text-gray-900 text-white rounded-xl text-sm font-bold group-hover:bg-emerald-600 dark:group-hover:bg-emerald-400 group-hover:text-white transition-all shadow-sm"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                Open Repository
                                                <ArrowRight size={16} className="-translate-x-1 group-hover:translate-x-0 transition-transform" />
                                            </Link>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeepAnalysis(repo.full_name, repo.owner_username, repo.name);
                                                }}
                                                disabled={scanning === repo.full_name}
                                                className="flex-1 px-3 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-md shadow-emerald-500/20"
                                            >
                                                {scanning === repo.full_name ? "Starting..." : "Deep Analysis"}
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 px-1 pt-2">
                                            <span className="flex items-center gap-1">
                                                <Clock size={10} />
                                                Updated {new Date(repo.last_pushed_at).toLocaleDateString()}
                                            </span>
                                            {repo.scanned && repo.lastScanDate && (
                                                <span>
                                                    Scanned {new Date(repo.lastScanDate).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
}
