"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from "react";
import { Zap, Shield, Bug, FileText, Layout as LayoutIcon, AlertCircle, CheckCircle2 } from "lucide-react";
export default function RepoScanTrigger({ onScanStart }) {
    const [repoUrl, setRepoUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
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
                }
                else {
                    setError(data.error || "Failed to start scan");
                }
                return;
            }
            setSuccess(data.message || "Deep analysis queued successfully!");
            if (onScanStart) {
                onScanStart(data.scanId);
            }
            setRepoUrl("");
        }
        catch (err) {
            setError(err.message || "Something went wrong. Please try again.");
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "bg-gray-900/60 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl relative overflow-hidden group", children: [_jsx("div", { className: "absolute -right-20 -top-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-700" }), _jsxs("div", { className: "relative space-y-6", children: [_jsxs("div", { className: "space-y-2", children: [_jsxs("h2", { className: "text-3xl font-black text-white tracking-tight flex items-center gap-3", children: [_jsx(Zap, { className: "text-emerald-400 fill-emerald-400/20", size: 28 }), "Deep Analysis"] }), _jsx("p", { className: "text-gray-400 text-sm font-medium", children: "Enter a GitHub repository URL for an AI-powered security and architecture audit." })] }), _jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "relative", children: _jsx("input", { type: "text", value: repoUrl, onChange: (e) => setRepoUrl(e.target.value), placeholder: "https://github.com/owner/repo", className: "w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-medium text-sm" }) }), error && (_jsxs("div", { className: "flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 px-5 py-3 rounded-2xl text-sm animate-in fade-in slide-in-from-top-2", children: [_jsx(AlertCircle, { size: 18 }), _jsx("span", { className: "font-semibold", children: error })] })), success && (_jsxs("div", { className: "flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-5 py-3 rounded-2xl text-sm animate-in fade-in slide-in-from-top-2", children: [_jsx(CheckCircle2, { size: 18 }), _jsx("span", { className: "font-semibold", children: success })] })), _jsx("button", { onClick: handleScan, disabled: loading || !repoUrl, className: "w-full bg-emerald-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20 active:scale-95", children: loading ? "Initializing Scan..." : "Start Analysis" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4 pt-4 border-t border-white/5", children: [_jsxs("div", { className: "flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-gray-500", children: [_jsx(Shield, { size: 12, className: "text-emerald-500" }), "Security Audit"] }), _jsxs("div", { className: "flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-gray-500", children: [_jsx(Bug, { size: 12, className: "text-amber-500" }), "Bug Detection"] }), _jsxs("div", { className: "flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-gray-500", children: [_jsx(LayoutIcon, { size: 12, className: "text-blue-500" }), "Architecture Review"] }), _jsxs("div", { className: "flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-gray-500", children: [_jsx(FileText, { size: 12, className: "text-indigo-500" }), "Code Quality"] })] })] })] }));
}
