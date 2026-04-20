"use client";

import React, { useState } from "react";
import { X, CreditCard, Check } from "lucide-react";

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    planKey: string;
    planName: string;
    price: number;
}

export default function PaymentModal({ isOpen, onClose, planKey, planName, price }: PaymentModalProps) {
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    if (!isOpen) return null;

    const handlePayment = async () => {
        setProcessing(true);
        setMessage(null);
        try {
            if (planKey === "free") {
                const res = await fetch("/api/create-checkout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ planKey }),
                });

                const data = await res.json();
                if (!res.ok) {
                    alert(data.error || "Plan switch failed");
                    setProcessing(false);
                    return;
                }

                setMessage(data.message || "Plan updated successfully.");
                setTimeout(() => {
                    window.location.reload();
                }, 900);
                return;
            }

            const orderRes = await fetch("/api/payments/paypal/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planKey }),
            });

            const orderData = await orderRes.json();
            if (!orderRes.ok) {
                alert(orderData.error || "Failed to create payment order");
                setProcessing(false);
                return;
            }

            if (!orderData.approveUrl) {
                alert("PayPal approval URL not received.");
                setProcessing(false);
                return;
            }

            window.location.href = orderData.approveUrl;
            return;
        } catch (err) {
            console.error(err);
            alert("An error occurred");
            setProcessing(false);
            return;
        }

        setProcessing(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-linear-to-br from-gray-900 to-purple-900 rounded-2xl p-8 max-w-md w-full border border-white/20 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white">Upgrade to {planName}</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <>
                        {/* Pricing Summary */}
                        <div className="bg-white/10 rounded-lg p-6 mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-gray-300">Plan</span>
                                <span className="text-white font-semibold">{planName}</span>
                            </div>
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-gray-300">Billing Cycle</span>
                                <span className="text-white font-semibold">Monthly</span>
                            </div>
                            <div className="border-t border-white/20 pt-4 flex items-center justify-between">
                                <span className="text-xl font-bold text-white">Total</span>
                                <span className="text-3xl font-bold text-purple-400">${price}/mo</span>
                            </div>
                        </div>

                        {/* Features Included */}
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-white mb-3">What's Included:</h3>
                            <div className="space-y-2">
                                {planKey === "pro" && (
                                    <>
                                        <div className="flex items-center gap-2 text-gray-300">
                                            <Check size={16} className="text-green-400" />
                                            <span>100 repository scans/month</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-300">
                                            <Check size={16} className="text-green-400" />
                                            <span>Bug detection & security scanning</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-300">
                                            <Check size={16} className="text-green-400" />
                                            <span>10 README generations/month</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-300">
                                            <Check size={16} className="text-green-400" />
                                            <span>PR draft creation</span>
                                        </div>
                                    </>
                                )}
                                {planKey === "pro_plus" && (
                                    <>
                                        <div className="flex items-center gap-2 text-gray-300">
                                            <Check size={16} className="text-green-400" />
                                            <span>Unlimited repository scans</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-300">
                                            <Check size={16} className="text-green-400" />
                                            <span>Advanced bug & security scanning</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-300">
                                            <Check size={16} className="text-green-400" />
                                            <span>Unlimited README generations</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-300">
                                            <Check size={16} className="text-green-400" />
                                            <span>Auto-publish PRs to GitHub</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-300">
                                            <Check size={16} className="text-green-400" />
                                            <span>Priority support</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Payment Button */}
                        <button
                            onClick={handlePayment}
                            disabled={processing}
                            className="w-full bg-linear-to-r from-purple-500 to-pink-500 text-white py-4 rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                        >
                            <CreditCard size={20} />
                            {processing ? "Processing..." : planKey === "free" ? "Switch to Free" : `Pay $${price}/month`}
                        </button>

                        {message && (
                            <p className="text-xs text-green-300 text-center mt-3">{message}</p>
                        )}

                        <p className="text-xs text-gray-400 text-center mt-4">
                            {planKey === "free"
                                ? "Free plan activates instantly in Supabase."
                                : "Payment is processed by PayPal and your plan activates after successful capture."}
                        </p>
                </>
            </div>
        </div>
    );
}
