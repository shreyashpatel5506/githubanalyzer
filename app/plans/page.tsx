import React from 'react';
import { PLAN_LIMITS, PLAN_PRICES } from '@/app/lib/billing';
import { Check, X, Infinity, Shield, Zap, Github } from 'lucide-react';

type PlanLimits = {
    repo_scan: number;
    pr_publish: boolean;
    bug_history: boolean;
    repo_rescan: boolean;
    pr_auto_diff: boolean;
    profile_scan: number;
    scan_history: boolean;
    bug_detection: boolean;
    pr_suggestion: number;
    security_scan: boolean;
    eslint_history: boolean;
    github_connect: boolean;
    readme_history: boolean;
    usage_tracking: boolean;
    database_access: boolean;
    eslint_analysis: number;
    usage_dashboard: boolean;
    security_history: boolean;
    readme_generation: number;
    private_repo_access: boolean;
    deep_code_smell_scan: number;
    bug_confidence_scores: boolean;
    security_severity_view: boolean;
};

const FEATURE_LABELS: Record<keyof PlanLimits, string> = {
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

const formatValue = (value: number | boolean) => {
    if (typeof value === 'boolean') {
        return value ? <Check className="mx-auto h-5 w-5 text-green-500" /> : <X className="mx-auto h-5 w-5 text-zinc-300" />;
    }
    if (value === -1) {
        return <Infinity className="mx-auto h-5 w-5 text-blue-500" />;
    }
    return <span className="font-medium text-zinc-900 dark:text-zinc-100">{value}</span>;
};

export default function PlansPage() {
    const plans: Array<{
        id: string;
        key: keyof typeof PLAN_LIMITS;
        limits: PlanLimits;
        price_monthly: number;
    }> = (Object.keys(PLAN_LIMITS) as Array<keyof typeof PLAN_LIMITS>)
        .map((key) => ({
            id: key,
            key,
            limits: PLAN_LIMITS[key] as PlanLimits,
            price_monthly: PLAN_PRICES[key],
        }))
        .sort((a, b) => Number(a.price_monthly) - Number(b.price_monthly));

    return (
        <div className="min-h-screen bg-zinc-50 py-16 px-4 dark:bg-black sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
                <div className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
                        Simple, transparent pricing
                    </h1>
                    <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
                        Choose the plan that fits your needs. Upgrade at any time.
                    </p>
                </div>

                {/* Plans Grid */}
                <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3 md:items-center">
                    {plans.map((plan) => {
                        const isProPlus = plan.key === 'pro_plus';
                        return (
                            <div
                                key={plan.id}
                                className={`relative flex flex-col rounded-2xl border bg-white p-8 shadow-sm dark:bg-zinc-900 ${isProPlus
                                        ? 'border-indigo-600 ring-2 ring-indigo-600 md:scale-110 z-10 shadow-2xl'
                                        : 'border-zinc-200 dark:border-zinc-800'
                                    }`}
                            >
                                {isProPlus && (
                                    <div className="absolute -top-5 left-0 right-0 mx-auto w-32 rounded-full bg-indigo-600 px-3 py-1 text-center text-sm font-medium text-white shadow-md">
                                        Most Popular
                                    </div>
                                )}
                                <h3 className="text-xl font-semibold capitalize text-zinc-900 dark:text-zinc-100">
                                    {plan.key.replace('_', ' ')}
                                </h3>
                                <div className="my-4 flex items-baseline">
                                    <span className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                                        ₹{Number(plan.price_monthly).toFixed(0)}
                                    </span>
                                    {Number(plan.price_monthly) > 0 && (
                                        <span className="ml-1 text-lg font-normal text-zinc-500">/month</span>
                                    )}
                                </div>
                                <ul className="mb-8 space-y-4 flex-1">
                                    {/* Highlight Top Features */}
                                    <li className="flex items-center gap-3">
                                        <Github className="h-5 w-5 shrink-0 text-zinc-500" />
                                        <span className="text-sm text-zinc-600 dark:text-zinc-300">
                                            {plan.limits.repo_scan === -1 ? 'Unlimited' : plan.limits.repo_scan} Repo Scans
                                        </span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <Shield className="h-5 w-5 shrink-0 text-zinc-500" />
                                        <span className="text-sm text-zinc-600 dark:text-zinc-300">
                                            {plan.limits.security_scan ? 'Security Scanning' : 'No Security Scanning'}
                                        </span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <Zap className="h-5 w-5 shrink-0 text-zinc-500" />
                                        <span className="text-sm text-zinc-600 dark:text-zinc-300">
                                            {plan.limits.eslint_analysis === -1 ? 'Unlimited' : plan.limits.eslint_analysis} ESLint Analysis
                                        </span>
                                    </li>
                                </ul>
                                <button
                                    className={`w-full rounded-lg px-4 py-2.5 text-center text-sm font-semibold shadow-sm transition-colors ${isProPlus
                                            ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                                            : 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200'
                                        }`}
                                >
                                    Get Started
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Comparison Table */}
                <div className="mt-24">
                    <h2 className="mb-10 text-2xl font-bold text-center text-zinc-900 dark:text-zinc-100">
                        Compare Features
                    </h2>
                    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                        <table className="w-full min-w-200 border-collapse text-left text-sm">
                            <thead>
                                <tr>
                                    <th className="p-4 font-medium text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">Feature</th>
                                    {plans.map((plan) => (
                                        <th key={plan.id} className="p-4 font-medium text-center text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 capitalize">
                                            {plan.key.replace('_', ' ')}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                {(Object.keys(FEATURE_LABELS) as Array<keyof PlanLimits>).map((featureKey) => (
                                    <tr key={featureKey} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                        <td className="p-4 font-medium text-zinc-700 dark:text-zinc-300">
                                            {FEATURE_LABELS[featureKey]}
                                        </td>
                                        {plans.map((plan) => (
                                            <td key={`${plan.id}-${featureKey}`} className="p-4 text-center">
                                                {formatValue(plan.limits[featureKey])}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}