"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import Layout from "../components/Layout";
import RepoScanTrigger from "../components/RepoScanTrigger";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/Card";
import { Activity, Bug, Shield, LayoutDashboard, FileText, Zap, GitBranch } from "lucide-react";
import Link from "next/link";
import { useSessionAuth } from "@/app/lib/use-session-auth";
export default function DashboardPage() {
    var _a;
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
    return (_jsx(Layout, { children: _jsxs("div", { className: "max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500", children: [!isLoaded || !isSignedIn ? (_jsx(Card, { className: "max-w-4xl mx-auto border-dashed py-20 bg-gray-50/50 dark:bg-gray-800/20 mt-20", children: _jsxs(CardContent, { className: "flex flex-col items-center text-center", children: [_jsx("div", { className: "w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-6", children: _jsx(LayoutDashboard, { className: "w-8 h-8 text-blue-600 dark:text-blue-400" }) }), _jsx("h1", { className: "text-3xl font-bold text-gray-900 dark:text-white mb-4", children: "Sign in to access your dashboard" }), _jsx("p", { className: "text-gray-500 dark:text-gray-400 max-w-md", children: "Securely analyze your repositories and track your code quality journey." })] }) })) : null, isLoaded && isSignedIn ? (_jsxs("div", { className: "space-y-8", children: [_jsxs("div", { className: "flex flex-col md:flex-row justify-between items-start md:items-center gap-4", children: [_jsxs("div", { children: [_jsxs("h1", { className: "text-3xl font-bold text-gray-900 dark:text-white", children: ["Welcome back, ", (user === null || user === void 0 ? void 0 : user.fullName) || ((_a = user === null || user === void 0 ? void 0 : user.email) === null || _a === void 0 ? void 0 : _a.split('@')[0]) || 'Developer'] }), _jsx("p", { className: "text-gray-500 dark:text-gray-400", children: "Here's what's happening with your repositories today." })] }), _jsxs(Link, { href: "/repos", className: "flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition shadow-lg shadow-emerald-500/20", children: [_jsx(GitBranch, { size: 18 }), "View All Repos"] })] }), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4", children: statCards.map((stat) => (_jsx(Card, { className: "border-none shadow-sm dark:bg-gray-800/40 backdrop-blur-sm", children: _jsxs(CardContent, { className: "p-4 flex flex-col items-center text-center", children: [_jsx("div", { className: `p-2 ${stat.bg} rounded-lg mb-3`, children: _jsx(stat.icon, { className: stat.color, size: 20 }) }), _jsx("div", { className: "text-2xl font-black text-gray-900 dark:text-white", children: stat.value }), _jsx("p", { className: "text-[10px] uppercase tracking-wider font-bold text-gray-500 mt-1", children: stat.title })] }) }, stat.title))) }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-8", children: [_jsxs(Card, { className: "border-none shadow-md overflow-hidden bg-white dark:bg-gray-800/50 backdrop-blur-sm", children: [_jsx("div", { className: "h-1.5 w-full bg-emerald-600" }), _jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Quick Scan" }), _jsx(CardDescription, { children: "Analyze a specific repository instantly" })] }), _jsx(CardContent, { children: _jsx(RepoScanTrigger, { onScanStart: (id) => console.log(`Scan started: ${id}`) }) })] }), _jsxs(Card, { className: "border-none shadow-md overflow-hidden bg-white dark:bg-gray-800/50 backdrop-blur-sm", children: [_jsx("div", { className: "h-1.5 w-full bg-blue-600" }), _jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Recent Activity" }), _jsx(CardDescription, { children: "Your latest analysis reports and generations" })] }), _jsxs(CardContent, { className: "flex flex-col items-center justify-center py-12 text-center", children: [_jsx("div", { className: "p-4 bg-gray-50 dark:bg-gray-900/50 rounded-full mb-4", children: _jsx(Activity, { className: "w-8 h-8 text-gray-300 dark:text-gray-600" }) }), _jsx("p", { className: "text-gray-500 dark:text-gray-400 text-sm max-w-50", children: "No recent activity yet. Start your first scan to see results here!" })] })] })] })] })) : null] }) }));
}
