"use client";

import React, { useState } from "react";
import { X, CreditCard, Check } from "lucide-react";

type RazorpayResponse = {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
};

let razorpayScriptPromise: Promise<boolean> | null = null;

function loadRazorpayScript(): Promise<boolean> {
    if (typeof window === "undefined") return Promise.resolve(false);
    const checkoutWindow = window as Window & {
        Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
    };

    if (checkoutWindow.Razorpay) return Promise.resolve(true);
    if (razorpayScriptPromise) return razorpayScriptPromise;

    razorpayScriptPromise = new Promise((resolve) => {
        const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
        if (existingScript) {
            existingScript.addEventListener("load", () => resolve(true), { once: true });
            existingScript.addEventListener("error", () => resolve(false), { once: true });
            return;
        }

        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });

    return razorpayScriptPromise;
}

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
    const razorpayMode = (process.env.NEXT_PUBLIC_RAZORPAY_MODE || "test").toLowerCase();
    const isTestMode = razorpayMode !== "live";

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

            const scriptLoaded = await loadRazorpayScript();
            if (!scriptLoaded) {
                alert("Razorpay checkout could not be loaded.");
                setProcessing(false);
                return;
            }

            const orderRes = await fetch("/api/payments/razorpay/create-order", {
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

            if (orderData.mode === "test") {
                setMessage("Test mode active: no real money will be charged.");
            }

            const checkoutWindow = window as Window & {
                Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
            };

            const RazorpayCtor = checkoutWindow.Razorpay;
            if (!RazorpayCtor) {
                alert("Razorpay checkout is unavailable.");
                setProcessing(false);
                return;
            }

            const options = {
                key: orderData.keyId,
                amount: orderData.amount,
                currency: orderData.currency,
                name: orderData.name || "ClarityCode",
                description: orderData.description || `${planName} subscription`,
                order_id: orderData.orderId,
                prefill: orderData.prefill,
                theme: {
                    color: "#7c3aed",
                },
                modal: {
                    ondismiss: () => {
                        setProcessing(false);
                    },
                },
                handler: async (response: RazorpayResponse) => {
                    try {
                        const verifyRes = await fetch("/api/payments/razorpay/verify", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                planKey,
                            }),
                        });

                        const verifyData = await verifyRes.json();
                        if (!verifyRes.ok) {
                            alert(verifyData.error || "Payment verification failed");
                            setProcessing(false);
                            return;
                        }

                        setMessage(verifyData.message || "Payment verified successfully.");
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                    } catch (verifyError) {
                        console.error(verifyError);
                        alert("Payment verification failed");
                        setProcessing(false);
                    }
                },
            };

            const rzp = new RazorpayCtor(options);
            rzp.open();
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
                                <span className="text-3xl font-bold text-purple-400">₹{price}/mo</span>
                            </div>
                        </div>

                        {isTestMode && (
                            <div className="mb-6 rounded-lg border border-yellow-400/40 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-100">
                                Razorpay test mode is active. This will not collect real money.
                            </div>
                        )}

                        {/* Features Included */}
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-white mb-3">What's Included:</h3>
                            <div className="space-y-2">
                                {planKey === "pro" && (
                                    <>
                                        <div className="flex items-center gap-2 text-gray-300">
                                            <Check size={16} className="text-green-400" />
                                            <span>Unlimited repository scans</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-300">
                                            <Check size={16} className="text-green-400" />
                                            <span>20 profile scans/month</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-300">
                                            <Check size={16} className="text-green-400" />
                                            <span>20 README generations/month</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-300">
                                            <Check size={16} className="text-green-400" />
                                            <span>50 ESLint analyses/month</span>
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
                                            <span>Unlimited profile scans</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-300">
                                            <Check size={16} className="text-green-400" />
                                            <span>Unlimited README generations</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-300">
                                            <Check size={16} className="text-green-400" />
                                            <span>Unlimited ESLint analyses</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-300">
                                            <Check size={16} className="text-green-400" />
                                            <span>Auto-publish PRs to GitHub</span>
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
                            {processing ? "Processing..." : planKey === "free" ? "Switch to Free" : `Pay ₹${price}/month via Razorpay`}
                        </button>

                        {message && (
                            <p className="text-xs text-green-300 text-center mt-3">{message}</p>
                        )}

                        <p className="text-xs text-gray-400 text-center mt-4">
                            {planKey === "free"
                                ? "Free plan activates instantly in Supabase."
                                : "Payment is processed by Razorpay and your plan activates after successful verification."}
                        </p>
                </>
            </div>
        </div>
    );
}
