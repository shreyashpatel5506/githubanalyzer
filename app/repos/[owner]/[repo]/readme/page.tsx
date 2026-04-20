"use client";

import React, { useEffect, useState } from "react";
import Layout from "@/app/components/Layout";
import { useParams } from "next/navigation";
import { FileText, Copy, GitPullRequest, Check } from "lucide-react";
import Link from "next/link";
import UpgradeModal from "@/app/components/UpgradeModal";

export default function ReadmePage() {
    const params = useParams();
    const owner = params.owner as string;
    const repo = params.repo as string;

    const [readme, setReadme] = useState<string>("");
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
        } catch (err) {
            console.error(err);
        } finally {
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
            } else if (res.ok) {
                setReadme(data.content);
            } else {
                alert(data.error || "Failed to generate README");
            }
        } catch (err: any) {
            alert(err.message);
        } finally {
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
            } else if (res.ok) {
                alert(`README PR created successfully! ${data.pr_url || ""}`);
            } else {
                alert(data.error || "Failed to create PR");
            }
        } catch (err: any) {
            alert(err.message);
        } finally {
            setCreatingPR(false);
        }
    };

    return (
        <Layout>
            <div className="min-h-screen bg-linear-to-br from-gray-900 via-purple-900 to-gray-900 py-8 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-4">
                        <Link href="/repos" className="hover:text-white">Repositories</Link>
                        <span>/</span>
                        <Link href={`/repos/${owner}/${repo}`} className="hover:text-white">{owner}/{repo}</Link>
                        <span>/</span>
                        <span className="text-white">README</span>
                    </div>

                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-4xl font-bold text-white mb-2">README Generator</h1>
                            <p className="text-gray-300">AI-powered README documentation</p>
                        </div>
                        <button
                            onClick={handleGenerate}
                            disabled={generating}
                            className="bg-linear-to-r from-green-500 to-teal-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-green-500/50 disabled:opacity-50 transition-all"
                        >
                            {generating ? "Generating..." : readme ? "Regenerate README" : "Generate README"}
                        </button>
                    </div>

                    {loading ? (
                        <div className="text-center py-20 text-white">Loading...</div>
                    ) : !readme ? (
                        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 text-center">
                            <FileText className="mx-auto mb-4 text-gray-400" size={64} />
                            <h2 className="text-2xl font-bold text-white mb-2">No README Generated Yet</h2>
                            <p className="text-gray-300 mb-6">
                                Click the button above to generate a comprehensive README for this repository
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Preview */}
                            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-2xl font-bold text-white">Generated README</h2>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleCopy}
                                            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-all text-sm"
                                        >
                                            {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                                            {copied ? "Copied!" : "Copy"}
                                        </button>
                                        <button
                                            onClick={handleCreatePR}
                                            disabled={creatingPR}
                                            className="flex items-center gap-2 bg-linear-to-r from-purple-500 to-pink-500 hover:shadow-lg text-white px-4 py-2 rounded-lg transition-all text-sm disabled:opacity-50"
                                        >
                                            <GitPullRequest size={16} />
                                            {creatingPR ? "Creating PR..." : "Create PR"}
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-gray-900/50 rounded-lg p-6 overflow-x-auto">
                                    <pre className="text-gray-200 whitespace-pre-wrap font-mono text-sm">
                                        {readme}
                                    </pre>
                                </div>
                            </div>

                            {/* Instructions */}
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
                                <h3 className="text-lg font-semibold text-blue-300 mb-3">📝 How to use</h3>
                                <div className="space-y-2 text-sm text-gray-200">
                                    <p>1. <strong>Copy</strong> - Copy the README content to your clipboard</p>
                                    <p>2. <strong>Create PR</strong> - Automatically create a pull request to add this README to your repository</p>
                                    <p>3. <strong>Regenerate</strong> - Generate a new version if you want different content</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <UpgradeModal
                isOpen={showUpgrade}
                onClose={() => setShowUpgrade(false)}
                feature="README Generation"
            />
        </Layout>
    );
}
