"use client";

import React from "react";
import { X } from "lucide-react";
import Link from "next/link";

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    feature?: string;
    currentPlan?: string;
}

export default function UpgradeModal({
    isOpen,
    onClose,
    feature = "this feature",
    currentPlan = "current",
}: UpgradeModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-linear-to-br from-gray-900 to-purple-900 border-2 border-purple-500 rounded-2xl p-8 max-w-md w-full mx-4 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>

                <div className="text-center">
                    <div className="text-6xl mb-4">🚀</div>
                    <h2 className="text-3xl font-bold text-white mb-4">
                        Upgrade Required
                    </h2>
                    <p className="text-gray-300 mb-6">
                        You've reached the limit for <span className="text-purple-400 font-semibold">{feature}</span> on the{" "}
                        <span className="font-semibold">{currentPlan}</span> plan.
                    </p>

                    <div className="bg-white/10 rounded-lg p-4 mb-6">
                        <p className="text-sm text-gray-200 mb-2">Upgrade to unlock:</p>
                        <ul className="text-left text-sm space-y-2 text-gray-300">
                            <li>✓ Unlimited scans</li>
                            <li>✓ Bug detection & security scanning</li>
                            <li>✓ Full history access</li>
                            <li>✓ PR auto-generation</li>
                        </ul>
                    </div>

                    <Link href="/pricing">
                        <button className="w-full bg-linear-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300 mb-3">
                            View Pricing Plans
                        </button>
                    </Link>

                    <button
                        onClick={onClose}
                        className="w-full bg-white/10 text-white py-2 rounded-lg hover:bg-white/20 transition-colors"
                    >
                        Maybe Later
                    </button>
                </div>
            </div>
        </div>
    );
}
