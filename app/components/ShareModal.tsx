"use client";

import { useState } from "react";
import { Card, CardContent } from "./Card";
import { Copy, Check, ExternalLink, Linkedin, Twitter } from "lucide-react";

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    profileUrl: string;
    username: string;
}

export default function ShareModal({ isOpen, onClose, profileUrl, username }: ShareModalProps) {
    const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

    const copyToClipboard = async (text: string, key: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedStates((prev) => ({ ...prev, [key]: true }));
            setTimeout(() => {
                setCopiedStates((prev) => ({ ...prev, [key]: false }));
            }, 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    const handleExternalShare = (url: string) => {
        window.open(url, "_blank", "noopener,noreferrer");
    };

    if (!isOpen) return null;

    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
        profileUrl
    )}`;

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        `Check out this GitHub profile analysis for @${username}`
    )}&url=${encodeURIComponent(profileUrl)}`;

    return (
        <>
            <div
                className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md z-50">
                <Card>
                    <CardContent className="p-6">
                        {/* Header */}
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Share Profile Analysis
                            </h3>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 
                         p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                aria-label="Close"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-3">
                            {/* Copy Profile Link */}
                            <button
                                onClick={() => copyToClipboard(profileUrl, "profile")}
                                className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 
                           dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600">
                                        <Copy className="w-4 h-4" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-medium text-gray-900 dark:text-white">
                                            Copy Profile Link
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            Share the direct link to this analysis
                                        </div>
                                    </div>
                                </div>

                                {copiedStates.profile ? (
                                    <div className="flex items-center space-x-1 text-emerald-600">
                                        <Check className="w-4 h-4" />
                                        <span className="text-sm font-medium">Copied!</span>
                                    </div>
                                ) : (
                                    <div className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300">
                                        <Copy className="w-4 h-4" />
                                    </div>
                                )}
                            </button>

                            {/* LinkedIn */}
                            <button
                                onClick={() => handleExternalShare(linkedinUrl)}
                                className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 
                           dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-blue-600">
                                        <Linkedin className="w-4 h-4" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-medium text-gray-900 dark:text-white">
                                            Share on LinkedIn
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            Post to your LinkedIn network
                                        </div>
                                    </div>
                                </div>

                                <div className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300">
                                    <ExternalLink className="w-4 h-4" />
                                </div>
                            </button>

                            {/* Twitter */}
                            <button
                                onClick={() => handleExternalShare(twitterUrl)}
                                className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 
                           dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900">
                                        <Twitter className="w-4 h-4" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-medium text-gray-900 dark:text-white">
                                            Share on X (Twitter)
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            Tweet about this profile analysis
                                        </div>
                                    </div>
                                </div>

                                <div className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300">
                                    <ExternalLink className="w-4 h-4" />
                                </div>
                            </button>
                        </div>

                        {/* URL Box */}
                        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                                Profile URL
                            </div>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="text"
                                    readOnly
                                    value={profileUrl}
                                    className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 
                           dark:border-gray-600 rounded-lg text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                                    onFocus={(e) => e.target.select()}
                                />
                                <button
                                    onClick={() => copyToClipboard(profileUrl, "url")}
                                    className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 
                           hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                                >
                                    {copiedStates.url ? (
                                        <Check className="w-4 h-4 text-emerald-600" />
                                    ) : (
                                        <Copy className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
