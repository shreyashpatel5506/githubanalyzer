"use client";

import React, { useState } from "react";
import {
    Zap,
    Shield,
    Bug,
    FileText,
    Layout as LayoutIcon,
    AlertCircle,
    CheckCircle2
} from "lucide-react";

interface RepoScanTriggerProps {
    onScanStart?: (scanId: string) => void;
}

export default function RepoScanTrigger({ onScanStart }: RepoScanTriggerProps) {
    const [repoUrl, setRepoUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleScan = async () => {
        setError(null);
        setSuccess(null);

        // Parse GitHub URL
        const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (!match) {
            setError("Please enter a valid GitHub repository URL");
            return;
        }

        const [, owner, repo] = match;
        const repoName = repo.replace(".git", "");
        const repoFullName = `${owner}/${repoName}`;

        setLoading(true);

        try {
            const res = await fetch("/api/scan/enqueue", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ repoFullName }),
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.isGuestLimit) {
                    setError("Guest limit reached. Please sign in to analyze more repositories.");
                } else {
                    setError(data.error || "Failed to start scan");
                }
                return;
            }

            setSuccess(data.message || "Deep analysis queued successfully!");

            if (onScanStart) {
                onScanStart(data.scanId);
            }

            setRepoUrl("");
        } catch (err: any) {
            setError(err.message || "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gray-900/60 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl relative overflow-hidden group">
            {/* Background Glow */}
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-700" />

            <div className="relative space-y-6">
                <div className="space-y-2">
                    <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <Zap className="text-emerald-400 fill-emerald-400/20" size={28} />
                        Deep Analysis
                    </h2>
                    <p className="text-gray-400 text-sm font-medium">
                        Enter a GitHub repository URL for an AI-powered security and architecture audit.
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="relative">
                        <input
                            type="text"
                            value={repoUrl}
                            onChange={(e) => setRepoUrl(e.target.value)}
                            placeholder="https://github.com/owner/repo"
                            className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-medium text-sm"
                        />
                    </div>

                    {error && (
                        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 px-5 py-3 rounded-2xl text-sm animate-in fade-in slide-in-from-top-2">
                            <AlertCircle size={18} />
                            <span className="font-semibold">{error}</span>
                        </div>
                    )}

                    {success && (
                        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-5 py-3 rounded-2xl text-sm animate-in fade-in slide-in-from-top-2">
                            <CheckCircle2 size={18} />
                            <span className="font-semibold">{success}</span>
                        </div>
                    )}

                    <button
                        onClick={handleScan}
                        disabled={loading || !repoUrl}
                        className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                    >
                        {loading ? "Initializing Scan..." : "Start Analysis"}
                    </button>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-gray-500">
                        <Shield size={12} className="text-emerald-500" />
                        Security Audit
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-gray-500">
                        <Bug size={12} className="text-amber-500" />
                        Bug Detection
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-gray-500">
                        <LayoutIcon size={12} className="text-blue-500" />
                        Architecture Review
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-gray-500">
                        <FileText size={12} className="text-indigo-500" />
                        Code Quality
                    </div>
                </div>
            </div>
        </div>
    );
}
