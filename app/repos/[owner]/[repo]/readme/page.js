"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from "react";
import Layout from "@/app/components/Layout";
import { useParams } from "next/navigation";
import { FileText, Copy, GitPullRequest, Check } from "lucide-react";
import Link from "next/link";
import UpgradeModal from "@/app/components/UpgradeModal";
export default function ReadmePage() {
    const params = useParams();
    const owner = params.owner;
    const repo = params.repo;
    const [readme, setReadme] = useState("");
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [copied, setCopied] = useState(false);
    const [creatingPR, setCreatingPR] = useState(false);
    const [showUpgrade, setShowUpgrade] = useState(false);
    useEffect(() => {
        fetchReadme();
    }, [owner, repo]);
    const fetchReadme = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/repos/${owner}/${repo}/readme`);
            const data = await res.json();
            if (data.readme) {
                setReadme(data.readme);
            }
        }
        catch (err) {
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    };
    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const res = await fetch(`/api/readme/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ repoOwner: owner, repoName: repo }),
            });
            const data = await res.json();
            if (res.status === 403) {
                setShowUpgrade(true);
            }
            else if (res.ok) {
                setReadme(data.content);
            }
            else {
                alert(data.error || "Failed to generate README");
            }
        }
        catch (err) {
            alert(err.message);
        }
        finally {
            setGenerating(false);
        }
    };
    const handleCopy = () => {
        navigator.clipboard.writeText(readme);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    const handleCreatePR = async () => {
        setCreatingPR(true);
        try {
            const res = await fetch(`/api/repos/${owner}/${repo}/pr/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "readme", content: readme }),
            });
            const data = await res.json();
            if (res.status === 403) {
                setShowUpgrade(true);
            }
            else if (res.ok) {
                alert(`README PR created successfully! ${data.pr_url || ""}`);
            }
            else {
                alert(data.error || "Failed to create PR");
            }
        }
        catch (err) {
            alert(err.message);
        }
        finally {
            setCreatingPR(false);
        }
    };
    return (_jsxs(Layout, { children: [_jsx("div", { className: "min-h-screen bg-linear-to-br from-gray-900 via-purple-900 to-gray-900 py-8 px-4", children: _jsxs("div", { className: "max-w-6xl mx-auto", children: [_jsxs("div", { className: "flex items-center gap-2 text-gray-400 text-sm mb-4", children: [_jsx(Link, { href: "/repos", className: "hover:text-white", children: "Repositories" }), _jsx("span", { children: "/" }), _jsxs(Link, { href: `/repos/${owner}/${repo}`, className: "hover:text-white", children: [owner, "/", repo] }), _jsx("span", { children: "/" }), _jsx("span", { className: "text-white", children: "README" })] }), _jsxs("div", { className: "flex items-center justify-between mb-8", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-4xl font-bold text-white mb-2", children: "README Generator" }), _jsx("p", { className: "text-gray-300", children: "AI-powered README documentation" })] }), _jsx("button", { onClick: handleGenerate, disabled: generating, className: "bg-linear-to-r from-green-500 to-teal-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-green-500/50 disabled:opacity-50 transition-all", children: generating ? "Generating..." : readme ? "Regenerate README" : "Generate README" })] }), loading ? (_jsx("div", { className: "text-center py-20 text-white", children: "Loading..." })) : !readme ? (_jsxs("div", { className: "bg-white/10 backdrop-blur-lg rounded-2xl p-12 text-center", children: [_jsx(FileText, { className: "mx-auto mb-4 text-gray-400", size: 64 }), _jsx("h2", { className: "text-2xl font-bold text-white mb-2", children: "No README Generated Yet" }), _jsx("p", { className: "text-gray-300 mb-6", children: "Click the button above to generate a comprehensive README for this repository" })] })) : (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsx("h2", { className: "text-2xl font-bold text-white", children: "Generated README" }), _jsxs("div", { className: "flex gap-3", children: [_jsxs("button", { onClick: handleCopy, className: "flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-all text-sm", children: [copied ? _jsx(Check, { size: 16, className: "text-green-400" }) : _jsx(Copy, { size: 16 }), copied ? "Copied!" : "Copy"] }), _jsxs("button", { onClick: handleCreatePR, disabled: creatingPR, className: "flex items-center gap-2 bg-linear-to-r from-purple-500 to-pink-500 hover:shadow-lg text-white px-4 py-2 rounded-lg transition-all text-sm disabled:opacity-50", children: [_jsx(GitPullRequest, { size: 16 }), creatingPR ? "Creating PR..." : "Create PR"] })] })] }), _jsx("div", { className: "bg-gray-900/50 rounded-lg p-6 overflow-x-auto", children: _jsx("pre", { className: "text-gray-200 whitespace-pre-wrap font-mono text-sm", children: readme }) })] }), _jsxs("div", { className: "bg-blue-500/10 border border-blue-500/30 rounded-lg p-6", children: [_jsx("h3", { className: "text-lg font-semibold text-blue-300 mb-3", children: "\uD83D\uDCDD How to use" }), _jsxs("div", { className: "space-y-2 text-sm text-gray-200", children: [_jsxs("p", { children: ["1. ", _jsx("strong", { children: "Copy" }), " - Copy the README content to your clipboard"] }), _jsxs("p", { children: ["2. ", _jsx("strong", { children: "Create PR" }), " - Automatically create a pull request to add this README to your repository"] }), _jsxs("p", { children: ["3. ", _jsx("strong", { children: "Regenerate" }), " - Generate a new version if you want different content"] })] })] })] }))] }) }), _jsx(UpgradeModal, { isOpen: showUpgrade, onClose: () => setShowUpgrade(false), feature: "README Generation" })] }));
}
