"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from "react";
import Layout from "@/app/components/Layout";
import { Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
export default function HistoryPage() {
    const [history, setHistory] = useState([]);
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
    const getStatusIcon = (status) => {
        switch (status) {
            case "completed":
                return _jsx(CheckCircle, { className: "text-green-400", size: 20 });
            case "failed":
                return _jsx(XCircle, { className: "text-red-400", size: 20 });
            case "pending":
            case "running":
                return _jsx(AlertCircle, { className: "text-yellow-400 animate-pulse", size: 20 });
            default:
                return _jsx(Clock, { className: "text-gray-400", size: 20 });
        }
    };
    const getStatusColor = (status) => {
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
    return (_jsx(Layout, { children: _jsx("div", { className: "min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-8 px-4", children: _jsxs("div", { className: "max-w-6xl mx-auto", children: [_jsxs("div", { className: "mb-8", children: [_jsx("h1", { className: "text-4xl font-bold text-white mb-2", children: "Scan History" }), _jsx("p", { className: "text-gray-300", children: "View all your repository analysis scans" })] }), loading ? (_jsx("div", { className: "text-center py-20 text-white text-xl", children: "Loading history..." })) : history.length === 0 ? (_jsxs("div", { className: "text-center py-20 bg-white/10 rounded-2xl", children: [_jsx("div", { className: "text-6xl mb-4", children: "\uD83D\uDCDC" }), _jsx("h2", { className: "text-2xl font-bold text-white mb-2", children: "No Scan History" }), _jsx("p", { className: "text-gray-300", children: "Start analyzing repositories to see history here" })] })) : (_jsx("div", { className: "space-y-4", children: history.map((scan) => (_jsx("div", { className: "bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:border-purple-500/50 transition-all", children: _jsx("div", { className: "flex items-start justify-between", children: _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-3 mb-3", children: [getStatusIcon(scan.status), _jsx(Link, { href: `/repos/${scan.repo_full_name}`, className: "text-xl font-bold text-white hover:text-purple-400 transition-colors", children: scan.repo_name }), _jsx("span", { className: `px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(scan.status)}`, children: scan.status.toUpperCase() })] }), scan.status === "completed" && scan.stats && (_jsxs("div", { className: "grid grid-cols-3 gap-4 mb-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-yellow-400 font-semibold", children: scan.stats.code_smells }), _jsx("span", { className: "text-sm text-gray-400", children: "Code Smells" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-red-400 font-semibold", children: scan.stats.bugs }), _jsx("span", { className: "text-sm text-gray-400", children: "Bugs" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-purple-400 font-semibold", children: scan.stats.security_issues }), _jsx("span", { className: "text-sm text-gray-400", children: "Security" })] })] })), _jsxs("div", { className: "flex items-center gap-4 text-sm text-gray-400", children: [_jsxs("div", { className: "flex items-center gap-1", children: [_jsx(Clock, { size: 14 }), _jsxs("span", { children: ["Started ", new Date(scan.created_at).toLocaleString()] })] }), scan.completed_at && (_jsxs("span", { children: ["\u2022 Completed ", new Date(scan.completed_at).toLocaleString()] }))] })] }) }) }, scan.id))) }))] }) }) }));
}
