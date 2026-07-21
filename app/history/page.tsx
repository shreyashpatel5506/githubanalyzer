"use client";

import React, { useEffect, useState } from "react";
import Layout from "@/app/components/Layout";
import { Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

interface ScanHistory {
    id: string;
    repo_name: string;
    repo_full_name: string;
    status: string;
    created_at: string;
    completed_at: string | null;
    stats?: {
        code_smells: number;
        bugs: number;
        security_issues: number;
    };
}

export default function HistoryPage() {
    const [history, setHistory] = useState<ScanHistory[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/scan/history")
            .then((res) => res.json())
            .then((data) => {
                setHistory(data.scans || []);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "completed":
                return <CheckCircle className="text-green-400" size={20} />;
            case "failed":
                return <XCircle className="text-red-400" size={20} />;
            case "pending":
            case "running":
                return <AlertCircle className="text-yellow-400 animate-pulse" size={20} />;
            default:
                return <Clock className="text-gray-400" size={20} />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed":
                return "bg-green-500/20 text-green-300 border-green-500/30";
            case "failed":
                return "bg-red-500/20 text-red-300 border-red-500/30";
            case "pending":
            case "running":
                return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
            default:
                return "bg-gray-500/20 text-gray-300 border-gray-500/30";
        }
    };

    return (
        <Layout>
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-8 px-4">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold text-white mb-2">Scan History</h1>
                        <p className="text-gray-300">View all your repository analysis scans</p>
                    </div>

                    {/* History List */}
                    {loading ? (
                        <div className="text-center py-20 text-white text-xl">Loading history...</div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-20 bg-white/10 rounded-2xl">
                            <div className="text-6xl mb-4">📜</div>
                            <h2 className="text-2xl font-bold text-white mb-2">No Scan History</h2>
                            <p className="text-gray-300">Start analyzing repositories to see history here</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {history.map((scan) => (
                                <div
                                    key={scan.id}
                                    className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:border-purple-500/50 transition-all"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            {/* Repo Name */}
                                            <div className="flex items-center gap-3 mb-3">
                                                {getStatusIcon(scan.status)}
                                                <Link
                                                    href={`/repos/${scan.repo_full_name}`}
                                                    className="text-xl font-bold text-white hover:text-purple-400 transition-colors"
                                                >
                                                    {scan.repo_name}
                                                </Link>
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(scan.status)}`}>
                                                    {scan.status.toUpperCase()}
                                                </span>
                                            </div>

                                            {/* Stats (if completed) */}
                                            {scan.status === "completed" && scan.stats && (
                                                <div className="grid grid-cols-3 gap-4 mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-yellow-400 font-semibold">{scan.stats.code_smells}</span>
                                                        <span className="text-sm text-gray-400">Code Smells</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-red-400 font-semibold">{scan.stats.bugs}</span>
                                                        <span className="text-sm text-gray-400">Bugs</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-purple-400 font-semibold">{scan.stats.security_issues}</span>
                                                        <span className="text-sm text-gray-400">Security</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Timestamps */}
                                            <div className="flex items-center gap-4 text-sm text-gray-400">
                                                <div className="flex items-center gap-1">
                                                    <Clock size={14} />
                                                    <span>Started {new Date(scan.created_at).toLocaleString()}</span>
                                                </div>
                                                {scan.completed_at && (
                                                    <span>• Completed {new Date(scan.completed_at).toLocaleString()}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
