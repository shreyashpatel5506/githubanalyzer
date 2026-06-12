"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
];
function planIcon(planKey) {
    if (planKey === "pro_plus")
        return _jsx(Crown, { className: "w-5 h-5" });
    if (planKey === "pro")
        return _jsx(Zap, { className: "w-5 h-5" });
    return _jsx(ShieldCheck, { className: "w-5 h-5" });
}
function PricingPageContent() {
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [currentPlan, setCurrentPlan] = useState(null);
    const searchParams = useSearchParams();
    useEffect(() => {
        let mounted = true;
        fetch("/api/profile", { cache: "no-store" })
            .then(async (res) => {
            if (!res.ok)
                return null;
            return res.json();
        })
            .then((data) => {
            if (!mounted || !data)
                return;
            setCurrentPlan(typeof (data === null || data === void 0 ? void 0 : data.plan) === "string" ? data.plan : null);
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
                kind: "success",
                text: `Payment successful${plan ? ` — ${plan.replace("_", " ")} plan is now active.` : "."}`,
            };
        }
        if (payment === "cancelled") {
            return { kind: "warning", text: "Payment was cancelled. No changes were made." };
        }
        if (payment === "failed" || payment === "error") {
            return { kind: "error", text: "Payment failed. Please try again." };
        }
        return null;
    }, [searchParams]);
    return (_jsxs("div", { className: "max-w-7xl mx-auto px-4 py-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500", children: [_jsxs("div", { className: "text-center max-w-3xl mx-auto", children: [_jsxs("div", { className: "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mb-4", children: [_jsx(Sparkles, { className: "w-4 h-4" }), "Pricing"] }), _jsx("h1", { className: "text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight", children: "Pick the plan that matches your coding velocity" }), _jsx("p", { className: "text-gray-500 dark:text-gray-400 mt-4 text-lg", children: "Same clean workflow. More depth, automation, and insights as you scale." }), paymentBanner && (_jsx("div", { className: `mt-6 inline-flex rounded-lg px-4 py-2 text-sm font-medium ${paymentBanner.kind === "success"
                            ? "bg-green-500/10 text-green-600 dark:text-green-300"
                            : paymentBanner.kind === "warning"
                                ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-300"
                                : "bg-red-500/10 text-red-600 dark:text-red-300"}`, children: paymentBanner.text }))] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6", children: plans.map((plan) => {
                    const isPopular = plan.key === "pro";
                    const isCurrentPlan = currentPlan === plan.key;
                    return (_jsxs(Card, { className: `relative overflow-hidden border-none shadow-lg dark:bg-gray-800/50 backdrop-blur-sm ${isPopular ? "ring-2 ring-emerald-500/40" : ""}`, children: [isPopular && (_jsx("div", { className: "absolute top-0 right-0 m-4 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white", children: "Most Popular" })), _jsxs(CardContent, { className: "pt-8 pb-6 space-y-5", children: [_jsxs("div", { className: "flex items-center gap-2 text-gray-900 dark:text-white", children: [planIcon(plan.key), _jsx("h2", { className: "text-2xl font-black", children: plan.name })] }), _jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: plan.subtitle }), _jsxs("div", { className: "flex items-end gap-1", children: [_jsxs("span", { className: "text-4xl font-black text-gray-900 dark:text-white", children: ["\u20B9", plan.price] }), _jsx("span", { className: "text-gray-500 dark:text-gray-400 mb-1", children: plan.price > 0 ? "/month" : "forever" })] }), _jsx("div", { className: "space-y-2", children: plan.features.map((feature) => (_jsxs("div", { className: "flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300", children: [_jsx(CheckCircle2, { className: "w-4 h-4 text-emerald-500 mt-0.5 shrink-0" }), _jsx("span", { children: feature })] }, feature))) }), _jsx("button", { onClick: () => setSelectedPlan(plan), disabled: isCurrentPlan, className: `w-full rounded-lg px-4 py-2.5 text-sm font-bold transition ${isCurrentPlan
                                            ? "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-300 cursor-not-allowed"
                                            : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"}`, children: isCurrentPlan ? "Current Plan" : plan.key === "free" ? "Switch to Free" : `Choose ${plan.name}` })] })] }, plan.key));
                }) }), selectedPlan && (_jsx(PaymentModal, { isOpen: !!selectedPlan, onClose: () => setSelectedPlan(null), planKey: selectedPlan.key, planName: selectedPlan.name, price: selectedPlan.price }))] }));
}
export default function PricingPage() {
    return (_jsx(Layout, { children: _jsx(Suspense, { fallback: _jsx("div", { className: "min-h-screen" }), children: _jsx(PricingPageContent, {}) }) }));
}
