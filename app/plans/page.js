import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { PLAN_LIMITS, PLAN_PRICES } from '@/app/lib/billing';
import { Check, X, Infinity, Shield, Zap, Github } from 'lucide-react';
const FEATURE_LABELS = {
    repo_scan: 'Repository Scans',
    pr_publish: 'PR Publishing',
    bug_history: 'Bug History',
    repo_rescan: 'Repo Rescan',
    pr_auto_diff: 'Automatic PR Diffs',
    profile_scan: 'Profile Scans',
    scan_history: 'Scan History',
    bug_detection: 'Bug Detection',
    pr_suggestion: 'PR Suggestions',
    security_scan: 'Security Scans',
    eslint_history: 'ESLint History',
    github_connect: 'GitHub Connection',
    readme_history: 'README History',
    usage_tracking: 'Usage Tracking',
    database_access: 'Database Access',
    eslint_analysis: 'ESLint Analysis',
    usage_dashboard: 'Usage Dashboard',
    security_history: 'Security History',
    readme_generation: 'README Generation',
    private_repo_access: 'Private Repo Access',
    deep_code_smell_scan: 'Deep Code Smell Scans',
    bug_confidence_scores: 'Bug Confidence Scores',
    security_severity_view: 'Security Severity View',
};
const formatValue = (value) => {
    if (typeof value === 'boolean') {
        return value ? _jsx(Check, { className: "mx-auto h-5 w-5 text-green-500" }) : _jsx(X, { className: "mx-auto h-5 w-5 text-zinc-300" });
    }
    if (value === -1) {
        return _jsx(Infinity, { className: "mx-auto h-5 w-5 text-blue-500" });
    }
    return _jsx("span", { className: "font-medium text-zinc-900 dark:text-zinc-100", children: value });
};
export default function PlansPage() {
    const plans = Object.keys(PLAN_LIMITS)
        .map((key) => ({
        id: key,
        key,
        limits: PLAN_LIMITS[key],
        price_monthly: PLAN_PRICES[key],
    }))
        .sort((a, b) => Number(a.price_monthly) - Number(b.price_monthly));
    return (_jsx("div", { className: "min-h-screen bg-zinc-50 py-16 px-4 dark:bg-black sm:px-6 lg:px-8", children: _jsxs("div", { className: "mx-auto max-w-7xl", children: [_jsxs("div", { className: "text-center", children: [_jsx("h1", { className: "text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl", children: "Simple, transparent pricing" }), _jsx("p", { className: "mt-4 text-lg text-zinc-600 dark:text-zinc-400", children: "Choose the plan that fits your needs. Upgrade at any time." })] }), _jsx("div", { className: "mt-16 grid grid-cols-1 gap-8 md:grid-cols-3 md:items-center", children: plans.map((plan) => {
                        const isProPlus = plan.key === 'pro_plus';
                        return (_jsxs("div", { className: `relative flex flex-col rounded-2xl border bg-white p-8 shadow-sm dark:bg-zinc-900 ${isProPlus
                                ? 'border-indigo-600 ring-2 ring-indigo-600 md:scale-110 z-10 shadow-2xl'
                                : 'border-zinc-200 dark:border-zinc-800'}`, children: [isProPlus && (_jsx("div", { className: "absolute -top-5 left-0 right-0 mx-auto w-32 rounded-full bg-indigo-600 px-3 py-1 text-center text-sm font-medium text-white shadow-md", children: "Most Popular" })), _jsx("h3", { className: "text-xl font-semibold capitalize text-zinc-900 dark:text-zinc-100", children: plan.key.replace('_', ' ') }), _jsxs("div", { className: "my-4 flex items-baseline", children: [_jsxs("span", { className: "text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100", children: ["\u20B9", Number(plan.price_monthly).toFixed(0)] }), Number(plan.price_monthly) > 0 && (_jsx("span", { className: "ml-1 text-lg font-normal text-zinc-500", children: "/month" }))] }), _jsxs("ul", { className: "mb-8 space-y-4 flex-1", children: [_jsxs("li", { className: "flex items-center gap-3", children: [_jsx(Github, { className: "h-5 w-5 shrink-0 text-zinc-500" }), _jsxs("span", { className: "text-sm text-zinc-600 dark:text-zinc-300", children: [plan.limits.repo_scan === -1 ? 'Unlimited' : plan.limits.repo_scan, " Repo Scans"] })] }), _jsxs("li", { className: "flex items-center gap-3", children: [_jsx(Shield, { className: "h-5 w-5 shrink-0 text-zinc-500" }), _jsx("span", { className: "text-sm text-zinc-600 dark:text-zinc-300", children: plan.limits.security_scan ? 'Security Scanning' : 'No Security Scanning' })] }), _jsxs("li", { className: "flex items-center gap-3", children: [_jsx(Zap, { className: "h-5 w-5 shrink-0 text-zinc-500" }), _jsxs("span", { className: "text-sm text-zinc-600 dark:text-zinc-300", children: [plan.limits.eslint_analysis === -1 ? 'Unlimited' : plan.limits.eslint_analysis, " ESLint Analysis"] })] })] }), _jsx("button", { className: `w-full rounded-lg px-4 py-2.5 text-center text-sm font-semibold shadow-sm transition-colors ${isProPlus
                                        ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                                        : 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200'}`, children: "Get Started" })] }, plan.id));
                    }) }), _jsxs("div", { className: "mt-24", children: [_jsx("h2", { className: "mb-10 text-2xl font-bold text-center text-zinc-900 dark:text-zinc-100", children: "Compare Features" }), _jsx("div", { className: "overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900", children: _jsxs("table", { className: "w-full min-w-200 border-collapse text-left text-sm", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { className: "p-4 font-medium text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50", children: "Feature" }), plans.map((plan) => (_jsx("th", { className: "p-4 font-medium text-center text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 capitalize", children: plan.key.replace('_', ' ') }, plan.id)))] }) }), _jsx("tbody", { className: "divide-y divide-zinc-200 dark:divide-zinc-800", children: Object.keys(FEATURE_LABELS).map((featureKey) => (_jsxs("tr", { className: "hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors", children: [_jsx("td", { className: "p-4 font-medium text-zinc-700 dark:text-zinc-300", children: FEATURE_LABELS[featureKey] }), plans.map((plan) => (_jsx("td", { className: "p-4 text-center", children: formatValue(plan.limits[featureKey]) }, `${plan.id}-${featureKey}`)))] }, featureKey))) })] }) })] })] }) }));
}
