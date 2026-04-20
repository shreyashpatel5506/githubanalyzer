"use client";

import React, { useEffect, useState } from "react";
import Layout from "@/app/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/Card";
import { Crown, ShieldCheck, Zap, LogOut, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type LimitUsage = {
    used: number;
    limit: number;
};

type ProfileData = {
    user: {
        username: string;
        email: string;
        avatar: string;
    };
    plan: string;
    limits: {
        repo_scan: LimitUsage;
        profile_scan: LimitUsage;
        readme_generation: LimitUsage;
        eslint_analysis: LimitUsage;
        code_smell_scan: LimitUsage;
        bug_detection_usage: LimitUsage;
        security_scan_usage: LimitUsage;
        bug_detection: boolean;
        security_scan: boolean;
        pr_publish: boolean;
    };
    resetInHours: number;
};

function planLabel(plan: string) {
    if (plan === "pro_plus") return "PRO+";
    if (plan === "pro") return "PRO";
    return "FREE";
}

function PlanIcon({ plan }: { plan: string }) {
    if (plan === "pro_plus") return <Crown className="w-5 h-5" />;
    if (plan === "pro") return <Zap className="w-5 h-5" />;
    return <ShieldCheck className="w-5 h-5" />;
}

function usagePercent(used: number, limit: number) {
    if (limit <= 0 || limit === -1) return 0;
    return Math.min(100, (used / limit) * 100);
}

function formatLimit(limit: number) {
    return limit === -1 ? "Unlimited" : String(limit);
}

export default function ProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<ProfileData | null>(null);

    useEffect(() => {
        let mounted = true;
        fetch("/api/profile", { cache: "no-store" })
            .then(async (res) => {
                if (!res.ok) {
                    if (res.status === 401) {
                        router.push("/");
                        return null;
                    }
                }
                return res.json();
            })
            .then((payload) => {
                if (!mounted || !payload) return;
                setData(payload);
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, [router]);

    const handleLogout = async () => {
        await fetch("/api/auth/session", { method: "DELETE" });
        router.push("/");
        window.location.href = "/";
    };

    return (
        <Layout>
            <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white">My Profile</h1>
                        <p className="text-gray-500 dark:text-gray-400">Account plan, usage limits, and feature access.</p>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/pricing" className="px-4 py-2 rounded-lg text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition">
                            Manage Plan
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 rounded-lg text-sm font-bold bg-red-500/10 text-red-600 dark:text-red-300 hover:bg-red-500/20 transition inline-flex items-center gap-2"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                    </div>
                </div>

                {loading ? (
                    <Card>
                        <CardContent className="py-16 flex items-center justify-center">
                            <RefreshCw className="w-7 h-7 animate-spin text-emerald-600" />
                        </CardContent>
                    </Card>
                ) : !data ? (
                    <Card>
                        <CardContent className="py-12 text-center text-gray-500">Unable to load profile.</CardContent>
                    </Card>
                ) : (
                    <>
                        <Card className="overflow-hidden border-none shadow-md dark:bg-gray-800/50 backdrop-blur-sm">
                            <div className="h-1.5 w-full bg-linear-to-r from-emerald-500 via-blue-500 to-purple-500" />
                            <CardContent className="pt-6 flex items-center gap-4">
                                <img src={data.user.avatar} alt="avatar" className="w-16 h-16 rounded-full ring-2 ring-emerald-500/30" />
                                <div>
                                    <p className="text-xl font-black text-gray-900 dark:text-white">{data.user.username}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{data.user.email}</p>
                                </div>
                                <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 text-xs font-black">
                                    <PlanIcon plan={data.plan} />
                                    {planLabel(data.plan)}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-md dark:bg-gray-800/50 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle>Usage & Limits</CardTitle>
                                <CardDescription>Monthly usage resets in {data.resetInHours} hours.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {[
                                    ["Repository Scans", data.limits.repo_scan],
                                    ["Profile Scans", data.limits.profile_scan],
                                    ["README Generations", data.limits.readme_generation],
                                    ["ESLint Analyses", data.limits.eslint_analysis],
                                    ["Code Smell Scans", data.limits.code_smell_scan],
                                    ["Bug Detection Runs", data.limits.bug_detection_usage],
                                    ["Security Scans", data.limits.security_scan_usage],
                                ].map(([label, usage]) => {
                                    const value = usage as LimitUsage;
                                    return (
                                        <div key={label as string}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-gray-600 dark:text-gray-300">{label as string}</span>
                                                <span className="font-bold text-gray-900 dark:text-white">
                                                    {value.used} / {formatLimit(value.limit)}
                                                </span>
                                            </div>
                                            {value.limit !== -1 && (
                                                <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                                                    <div
                                                        className="h-full bg-linear-to-r from-emerald-500 to-blue-500"
                                                        style={{ width: `${usagePercent(value.used, value.limit)}%` }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-md dark:bg-gray-800/50 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle>Feature Access</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                {[
                                    ["Bug Detection", data.limits.bug_detection],
                                    ["Security Scanning", data.limits.security_scan],
                                    ["Auto Publish PR", data.limits.pr_publish],
                                ].map(([name, enabled]) => (
                                    <div key={name as string} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 flex items-center justify-between">
                                        <span className="text-gray-600 dark:text-gray-300">{name as string}</span>
                                        <span className={enabled ? "text-emerald-500 font-bold" : "text-red-400 font-bold"}>
                                            {enabled ? "Enabled" : "Locked"}
                                        </span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </Layout>
    );
}
