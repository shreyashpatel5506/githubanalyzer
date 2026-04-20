"use client";

import React from "react";
import Layout from "../components/Layout";
import RepoScanTrigger from "../components/RepoScanTrigger";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/Card";
import { Activity, Bug, Shield, LayoutDashboard, FileText, Zap, ArrowRight, GitBranch } from "lucide-react";
import Link from "next/link";
import { useSessionAuth } from "@/app/lib/use-session-auth";

export default function DashboardPage() {
    const { isSignedIn, isLoaded, user } = useSessionAuth();
    const [stats, setStats] = React.useState({
        repoScans: 0,
        readmeGens: 0,
        eslintAnalyses: 0,
        codeSmellScans: 0,
        bugsFound: 0,
        securityIssues: 0,
    });

    React.useEffect(() => {
        // Fetch user stats
        fetch("/api/dashboard/stats")
            .then((res) => res.json())
            .then((data) => setStats(data))
            .catch((err) => console.error(err));
    }, []);

    const statCards = [
        { title: "Repo Scans", value: stats.repoScans, icon: Activity, color: "text-blue-500", bg: "bg-blue-500/10" },
        { title: "READMEs", value: stats.readmeGens, icon: FileText, color: "text-emerald-500", bg: "bg-emerald-500/10" },
        { title: "ESLint", value: stats.eslintAnalyses, icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10" },
        { title: "Smell Scans", value: stats.codeSmellScans, icon: Activity, color: "text-orange-500", bg: "bg-orange-500/10" },
        { title: "Bugs Found", value: stats.bugsFound, icon: Bug, color: "text-red-500", bg: "bg-red-500/10" },
        { title: "Security", value: stats.securityIssues, icon: Shield, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    ];

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {!isLoaded || !isSignedIn ? (
                    <Card className="max-w-4xl mx-auto border-dashed py-20 bg-gray-50/50 dark:bg-gray-800/20 mt-20">
                        <CardContent className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-6">
                                <LayoutDashboard className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                                Sign in to access your dashboard
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 max-w-md">
                                Securely analyze your repositories and track your code quality journey.
                            </p>
                        </CardContent>
                    </Card>
                ) : null}

                {isLoaded && isSignedIn ? (
                    <div className="space-y-8">
                        {/* Welcome Header */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                    Welcome back, {user?.fullName || user?.email?.split('@')[0] || 'Developer'}
                                </h1>
                                <p className="text-gray-500 dark:text-gray-400">
                                    Here's what's happening with your repositories today.
                                </p>
                            </div>

                            <Link
                                href="/repos"
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition shadow-lg shadow-emerald-500/20"
                            >
                                <GitBranch size={18} />
                                View All Repos
                            </Link>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {statCards.map((stat) => (
                                <Card key={stat.title} className="border-none shadow-sm dark:bg-gray-800/40 backdrop-blur-sm">
                                    <CardContent className="p-4 flex flex-col items-center text-center">
                                        <div className={`p-2 ${stat.bg} rounded-lg mb-3`}>
                                            <stat.icon className={stat.color} size={20} />
                                        </div>
                                        <div className="text-2xl font-black text-gray-900 dark:text-white">
                                            {stat.value}
                                        </div>
                                        <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mt-1">
                                            {stat.title}
                                        </p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Main Content Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <Card className="border-none shadow-md overflow-hidden bg-white dark:bg-gray-800/50 backdrop-blur-sm">
                                <div className="h-1.5 w-full bg-emerald-600" />
                                <CardHeader>
                                    <CardTitle>Quick Scan</CardTitle>
                                    <CardDescription>Analyze a specific repository instantly</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <RepoScanTrigger
                                        onScanStart={(id) => console.log(`Scan started: ${id}`)}
                                    />
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-md overflow-hidden bg-white dark:bg-gray-800/50 backdrop-blur-sm">
                                <div className="h-1.5 w-full bg-blue-600" />
                                <CardHeader>
                                    <CardTitle>Recent Activity</CardTitle>
                                    <CardDescription>Your latest analysis reports and generations</CardDescription>
                                </CardHeader>
                                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-full mb-4">
                                        <Activity className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                                    </div>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm max-w-50">
                                        No recent activity yet. Start your first scan to see results here!
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                ) : null}
            </div>
        </Layout>
    );
}
