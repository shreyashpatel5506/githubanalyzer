"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Layout from "../components/Layout";
import PaymentModal from "../components/PaymentModal";
import { Card, CardContent } from "../components/Card";
import { CheckCircle2, Crown, ShieldCheck, Sparkles, Zap } from "lucide-react";

const plans = [
    {
        key: "free",
        name: "Free",
        price: 0,
        subtitle: "Start exploring repository intelligence",
        features: ["5 repo scans", "1 profile scan", "3 README generations", "Basic dashboard insights"],
    },
    {
        key: "pro",
        name: "Pro",
        price: 15,
        subtitle: "Best for active solo builders",
        features: ["Unlimited repo scans", "20 profile scans", "Bug + security detection", "Advanced AI recommendations"],
    },
    {
        key: "pro_plus",
        name: "Pro Plus",
        price: 85,
        subtitle: "For teams and power users",
        features: ["Everything unlimited", "Deep analysis priority", "Auto PR publishing", "Premium support"],
    },
] as const;

function planIcon(planKey: string) {
    if (planKey === "pro_plus") return <Crown className="w-5 h-5" />;
    if (planKey === "pro") return <Zap className="w-5 h-5" />;
    return <ShieldCheck className="w-5 h-5" />;
}

function PricingPageContent() {
    const [selectedPlan, setSelectedPlan] = useState<(typeof plans)[number] | null>(null);
    const [currentPlan, setCurrentPlan] = useState<string | null>(null);
    const searchParams = useSearchParams();

    useEffect(() => {
        let mounted = true;
        fetch("/api/profile", { cache: "no-store" })
            .then(async (res) => {
                if (!res.ok) return null;
                return res.json();
            })
            .then((data) => {
                if (!mounted || !data) return;
                setCurrentPlan(typeof data?.plan === "string" ? data.plan : null);
            })
            .catch(() => {
                // Guests can still view pricing.
            });

        return () => {
            mounted = false;
        };
    }, []);

    const paymentBanner = useMemo(() => {
        const payment = searchParams.get("payment");
        const plan = searchParams.get("plan");

        if (payment === "success") {
            return {
                kind: "success" as const,
                text: `Payment successful${plan ? ` — ${plan.replace("_", " ")} plan is now active.` : "."}`,
            };
        }
        if (payment === "cancelled") {
            return { kind: "warning" as const, text: "Payment was cancelled. No changes were made." };
        }
        if (payment === "failed" || payment === "error") {
            return { kind: "error" as const, text: "Payment failed. Please try again." };
        }
        return null;
    }, [searchParams]);

    return (
        <div className="max-w-7xl mx-auto px-4 py-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center max-w-3xl mx-auto">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mb-4">
                    <Sparkles className="w-4 h-4" />
                    Pricing
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
                    Pick the plan that matches your coding velocity
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-4 text-lg">
                    Same clean workflow. More depth, automation, and insights as you scale.
                </p>

                {paymentBanner && (
                    <div
                        className={`mt-6 inline-flex rounded-lg px-4 py-2 text-sm font-medium ${paymentBanner.kind === "success"
                                ? "bg-green-500/10 text-green-600 dark:text-green-300"
                                : paymentBanner.kind === "warning"
                                    ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-300"
                                    : "bg-red-500/10 text-red-600 dark:text-red-300"
                            }`}
                    >
                        {paymentBanner.text}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan) => {
                    const isPopular = plan.key === "pro";
                    const isCurrentPlan = currentPlan === plan.key;

                    return (
                        <Card
                            key={plan.key}
                            className={`relative overflow-hidden border-none shadow-lg dark:bg-gray-800/50 backdrop-blur-sm ${isPopular ? "ring-2 ring-emerald-500/40" : ""
                                }`}
                        >
                            {isPopular && (
                                <div className="absolute top-0 right-0 m-4 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white">
                                    Most Popular
                                </div>
                            )}
                            <CardContent className="pt-8 pb-6 space-y-5">
                                <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                                    {planIcon(plan.key)}
                                    <h2 className="text-2xl font-black">{plan.name}</h2>
                                </div>

                                <p className="text-sm text-gray-500 dark:text-gray-400">{plan.subtitle}</p>

                                <div className="flex items-end gap-1">
                                    <span className="text-4xl font-black text-gray-900 dark:text-white">₹{plan.price}</span>
                                    <span className="text-gray-500 dark:text-gray-400 mb-1">{plan.price > 0 ? "/month" : "forever"}</span>
                                </div>

                                <div className="space-y-2">
                                    {plan.features.map((feature) => (
                                        <div key={feature} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                            <span>{feature}</span>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => setSelectedPlan(plan)}
                                    disabled={isCurrentPlan}
                                    className={`w-full rounded-lg px-4 py-2.5 text-sm font-bold transition ${isCurrentPlan
                                            ? "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-300 cursor-not-allowed"
                                            : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
                                        }`}
                                >
                                    {isCurrentPlan ? "Current Plan" : plan.key === "free" ? "Switch to Free" : `Choose ${plan.name}`}
                                </button>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {selectedPlan && (
                <PaymentModal
                    isOpen={!!selectedPlan}
                    onClose={() => setSelectedPlan(null)}
                    planKey={selectedPlan.key}
                    planName={selectedPlan.name}
                    price={selectedPlan.price}
                />
            )}
        </div>
    );
}

export default function PricingPage() {
    return (
        <Layout>
            <Suspense fallback={<div className="min-h-screen" />}>
                <PricingPageContent />
            </Suspense>
        </Layout>
    );
}
