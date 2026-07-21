"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, CreditCard, Check } from "lucide-react";

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    planKey: string;
    planName: string;
    price: number;
}

let paypalScriptPromise: Promise<boolean> | null = null;
function loadPayPalScript(clientId: string) {
    if (typeof window === "undefined") return Promise.resolve(false);
    const checkoutWindow = window as any;
    if (checkoutWindow.paypal) return Promise.resolve(true);
    if (paypalScriptPromise) return paypalScriptPromise;

    paypalScriptPromise = new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&intent=capture`;
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
    return paypalScriptPromise;
}

export default function PaymentModal({ isOpen, onClose, planKey, planName, price }: PaymentModalProps) {
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [sdkReady, setSdkReady] = useState(false);
    const buttonContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen || planKey === "free") return;

        let active = true;

        const initPayPal = async () => {
            try {
                const configRes = await fetch("/api/payments/paypal/config");
                if (!configRes.ok) throw new Error("Failed to fetch PayPal configuration");
                const configData = await configRes.json();
                if (!active) return;

                const loaded = await loadPayPalScript(configData.clientId);
                if (!loaded || !active) return;

                setSdkReady(true);

                const checkoutWindow = window as any;
                if (checkoutWindow.paypal && buttonContainerRef.current) {
                    buttonContainerRef.current.innerHTML = "";
                    checkoutWindow.paypal.Buttons({
                        style: {
                            layout: "vertical",
                            color: "gold",
                            shape: "rect",
                            label: "paypal",
                        },
                        createOrder: async () => {
                            setMessage(null);
                            setProcessing(true);
                            try {
                                const orderRes = await fetch("/api/payments/paypal/create-order", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ planKey }),
                                });
                                const orderData = await orderRes.json();
                                if (!orderRes.ok) {
                                    throw new Error(orderData.error || "Failed to create order");
                                }
                                return orderData.orderId;
                            } catch (err: any) {
                                alert(err.message || "Failed to create order");
                                setProcessing(false);
                                throw err;
                            }
                        },
                        onApprove: async (data: any) => {
                            window.location.href = `/api/payments/paypal/capture?token=${data.orderID}`;
                        },
                        onCancel: () => {
                            setProcessing(false);
                        },
                        onError: (err: any) => {
                            console.error("PayPal Error:", err);
                            alert("An error occurred during payment processing");
                            setProcessing(false);
                        }
                    }).render(buttonContainerRef.current);
                }
            } catch (err) {
                console.error("Failed to initialize PayPal:", err);
            }
        };

        initPayPal();

        return () => {
            active = false;
        };
    }, [isOpen, planKey]);

    if (!isOpen) return null;

    const handleFreePlanSwitch = async () => {
        setProcessing(true);
        setMessage(null);
        try {
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
        } catch (err) {
            console.error(err);
            alert("An error occurred");
            setProcessing(false);
        }
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

                    {/* Payment Area */}
                    {planKey === "free" ? (
                        <button
                            onClick={handleFreePlanSwitch}
                            disabled={processing}
                            className="w-full bg-linear-to-r from-purple-500 to-pink-500 text-white py-4 rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                        >
                            <CreditCard size={20} />
                            {processing ? "Processing..." : "Switch to Free"}
                        </button>
                    ) : (
                        <div className="w-full min-h-[150px] relative">
                            {(!sdkReady || processing) && (
                                <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center text-sm text-gray-300 font-semibold rounded-lg z-10 p-4 text-center">
                                    {processing ? "Processing transaction..." : "Loading payment methods..."}
                                </div>
                            )}
                            <div ref={buttonContainerRef} id="paypal-button-container" className="w-full" />
                        </div>
                    )}

                    {message && (
                        <p className="text-xs text-green-300 text-center mt-3">{message}</p>
                    )}

                    <p className="text-xs text-gray-400 text-center mt-4">
                        {planKey === "free"
                            ? "Free plan activates instantly in Supabase."
                            : "Payment is secure and processed inline. You can pay directly using a Debit/Credit Card or PayPal."}
                    </p>
                </>
            </div>
        </div>
    );
}
