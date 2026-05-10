"use client";

import { useEffect, useState } from "react";
import { X, Crown, Zap, Shield, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ProfileModalProps {
    open: boolean;
    onClose: () => void;
}

interface ProfileData {
    user: {
        username: string;
        email: string;
        avatar: string;
    };
    plan: string;
    limits: {
        repo_scan: { used: number; limit: number };
        profile_scan: { used: number; limit: number };
        readme_generation: { used: number; limit: number };
        eslint_analysis: { used: number; limit: number };
        code_smell_scan: { used: number; limit: number };
        bug_detection_usage: { used: number; limit: number };
        security_scan_usage: { used: number; limit: number };
        bug_detection: boolean;
        security_scan: boolean;
        pr_publish: boolean;
    };
    resetInHours: number;
}

export default function ProfileModal({ open, onClose }: ProfileModalProps) {
    const [data, setData] = useState<ProfileData | null>(null);
    const router = useRouter();

    const handleLogout = async () => {
        await fetch('/api/auth/session', { method: 'DELETE' });
        onClose();
        router.push('/');
        window.location.href = '/';
    };

    useEffect(() => {
        if (open) {
            fetch("/api/profile")
                .then((res) => res.json())
                .then(setData)
                .catch((err) => console.error("Failed to load profile", err));
        }
    }, [open]);

    if (!open) return null;

    const getPlanColor = (plan: string) => {
        switch (plan.toLowerCase()) {
            case "pro_plus":
                return "bg-gradient-to-r from-yellow-500 to-orange-500";
            case "pro":
                return "bg-gradient-to-r from-purple-500 to-pink-500";
            default:
                return "bg-gradient-to-r from-gray-500 to-gray-600";
        }
    };

    const getPlanName = (plan: string) => {
        switch (plan.toLowerCase()) {
            case "pro_plus":
                return "PRO+";
            case "pro":
                return "PRO";
            default:
                return "FREE";
        }
    };

    const getPlanIcon = (plan: string) => {
        switch (plan.toLowerCase()) {
            case "pro_plus":
                return <Crown className="w-5 h-5" />;
            case "pro":
                return <Zap className="w-5 h-5" />;
            default:
                return <Shield className="w-5 h-5" />;
        }
    };

    const formatLimit = (limit: number) => {
        return limit === -1 ? "Unlimited" : limit;
    };

    const getUsagePercentage = (used: number, limit: number) => {
        if (limit === -1) return 0;
        return Math.min((used / limit) * 100, 100);
    };

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Modal */}
            <div className="relative w-full max-w-md rounded-2xl border border-white/20 bg-linear-to-br from-gray-900 to-purple-900 shadow-2xl text-white max-h-[90vh] overflow-y-auto">
                {!data ? (
                    <div className="py-20 text-center text-gray-400">Loading profile…</div>
                ) : (
                    <>
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Profile Header */}
                        <div className="p-6 border-b border-white/10">
                            <div className="flex flex-col items-center gap-3">
                                <img
                                    src={data.user.avatar}
                                    className="w-20 h-20 rounded-full ring-4 ring-purple-500/50 object-cover"
                                    alt="avatar"
                                />
                                <h2 className="text-xl font-bold">{data.user.username}</h2>
                                <p className="text-sm text-gray-400">{data.user.email}</p>
                            </div>
                        </div>

                        {/* Current Plan */}
                        <div className="p-6 border-b border-white/10">
                            <div className="mb-4">
                                <span className="text-sm text-gray-400">Current Plan</span>
                            </div>
                            <div
                                className={`${getPlanColor(
                                    data.plan
                                )} rounded-xl p-4 flex items-center justify-between`}
                            >
                                <div className="flex items-center gap-3">
                                    {getPlanIcon(data.plan)}
                                    <span className="text-xl font-bold">{getPlanName(data.plan)}</span>
                                </div>
                                {data.plan === "free" && (
                                    <Link
                                        href="/pricing"
                                        className="bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors"
                                    >
                                        Upgrade
                                    </Link>
                                )}
                            </div>
                        </div>

                        {/* Usage Limits */}
                        <div className="p-6">
                            <h3 className="text-lg font-semibold mb-4">Usage & Limits</h3>

                            <div className="space-y-4">
                                {/* Repo Scans */}
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-gray-300">Repository Scans</span>
                                        <span className="text-white font-semibold">
                                            {data.limits.repo_scan.used} / {formatLimit(data.limits.repo_scan.limit)}
                                        </span>
                                    </div>
                                    {data.limits.repo_scan.limit !== -1 && (
                                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                            <div
                                                className="h-full bg-purple-500 transition-all"
                                                style={{
                                                    width: `${getUsagePercentage(
                                                        data.limits.repo_scan.used,
                                                        data.limits.repo_scan.limit
                                                    )}%`,
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Profile Scans */}
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-gray-300">Profile Scans</span>
                                        <span className="text-white font-semibold">
                                            {data.limits.profile_scan.used} / {formatLimit(data.limits.profile_scan.limit)}
                                        </span>
                                    </div>
                                    {data.limits.profile_scan.limit !== -1 && (
                                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                            <div
                                                className="h-full bg-purple-500 transition-all"
                                                style={{
                                                    width: `${getUsagePercentage(
                                                        data.limits.profile_scan.used,
                                                        data.limits.profile_scan.limit
                                                    )}%`,
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* README Generations */}
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-gray-300">README Generations</span>
                                        <span className="text-white font-semibold">
                                            {data.limits.readme_generation.used} /{" "}
                                            {formatLimit(data.limits.readme_generation.limit)}
                                        </span>
                                    </div>
                                    {data.limits.readme_generation.limit !== -1 && (
                                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                            <div
                                                className="h-full bg-purple-500 transition-all"
                                                style={{
                                                    width: `${getUsagePercentage(
                                                        data.limits.readme_generation.used,
                                                        data.limits.readme_generation.limit
                                                    )}%`,
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* ESLint Analysis */}
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-gray-300">ESLint Analyses</span>
                                        <span className="text-white font-semibold">
                                            {data.limits.eslint_analysis.used} /{" "}
                                            {formatLimit(data.limits.eslint_analysis.limit)}
                                        </span>
                                    </div>
                                    {data.limits.eslint_analysis.limit !== -1 && (
                                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                            <div
                                                className="h-full bg-purple-500 transition-all"
                                                style={{
                                                    width: `${getUsagePercentage(
                                                        data.limits.eslint_analysis.used,
                                                        data.limits.eslint_analysis.limit
                                                    )}%`,
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Code Smell Analysis */}
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-gray-300">Code Smell Scans</span>
                                        <span className="text-white font-semibold">
                                            {data.limits.code_smell_scan.used} / {formatLimit(data.limits.code_smell_scan.limit)}
                                        </span>
                                    </div>
                                    {data.limits.code_smell_scan.limit !== -1 && (
                                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                            <div
                                                className="h-full bg-purple-500 transition-all"
                                                style={{
                                                    width: `${getUsagePercentage(
                                                        data.limits.code_smell_scan.used,
                                                        data.limits.code_smell_scan.limit
                                                    )}%`,
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Bug Detection */}
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-gray-300">Bug Detection Runs</span>
                                        <span className="text-white font-semibold">
                                            {data.limits.bug_detection_usage.used} / {formatLimit(data.limits.bug_detection_usage.limit)}
                                        </span>
                                    </div>
                                    {data.limits.bug_detection_usage.limit !== -1 && (
                                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                            <div
                                                className="h-full bg-purple-500 transition-all"
                                                style={{
                                                    width: `${getUsagePercentage(
                                                        data.limits.bug_detection_usage.used,
                                                        data.limits.bug_detection_usage.limit
                                                    )}%`,
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Security Scans */}
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-gray-300">Security Scans</span>
                                        <span className="text-white font-semibold">
                                            {data.limits.security_scan_usage.used} / {formatLimit(data.limits.security_scan_usage.limit)}
                                        </span>
                                    </div>
                                    {data.limits.security_scan_usage.limit !== -1 && (
                                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                            <div
                                                className="h-full bg-purple-500 transition-all"
                                                style={{
                                                    width: `${getUsagePercentage(
                                                        data.limits.security_scan_usage.used,
                                                        data.limits.security_scan_usage.limit
                                                    )}%`,
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Feature Availability */}
                            <div className="mt-6 pt-4 border-t border-white/20">
                                <h4 className="text-sm font-semibold mb-3 text-gray-300">Features</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-300">Bug Detection</span>
                                        <span className={data.limits.bug_detection ? "text-green-400" : "text-red-400"}>
                                            {data.limits.bug_detection ? "✓ Enabled" : "✗ Locked"}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-300">Security Scanning</span>
                                        <span className={data.limits.security_scan ? "text-green-400" : "text-red-400"}>
                                            {data.limits.security_scan ? "✓ Enabled" : "✗ Locked"}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-300">Auto-Publish PRs</span>
                                        <span className={data.limits.pr_publish ? "text-green-400" : "text-red-400"}>
                                            {data.limits.pr_publish ? "✓ Enabled" : "✗ Locked"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Reset Info */}
                            {data.resetInHours > 0 && (
                                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                    <p className="text-xs text-blue-300">
                                        Usage resets in {data.resetInHours} hours
                                    </p>
                                </div>
                            )}

                            {/* Logout */}
                            <button
                                onClick={handleLogout}
                                className="mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 font-semibold transition-all"
                            >
                                <LogOut className="w-4 h-4" />
                                Sign Out
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
