"use client";

import { Sparkles, Menu, X, Github, ShieldCheck, Crown } from "lucide-react";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSessionAuth } from "@/app/lib/use-session-auth";

function PlanBadge({ tier }: { tier: string }) {
    if (tier === "pro_plus") {
        return (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold border border-indigo-500/20">
                <Crown className="w-3 h-3" />
                PRO+
            </span>
        );
    }
    if (tier === "pro") {
        return (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                <ShieldCheck className="w-3 h-3" />
                PRO
            </span>
        );
    }
    return null;
}

export default function Layout({ children }: { children: React.ReactNode }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { isSignedIn, user } = useSessionAuth();
    const [plan, setPlan] = useState<string>("free");
    const githubLoginHref = "/api/auth/github/start?next=/repos";

    // Fetch user profile and plan on mount
    useEffect(() => {
        if (isSignedIn && user?.userId) {
            fetch('/api/profile')
                .then(res => res.json())
                .then(data => {
                    if (data.plan) setPlan(data.plan);
                })
                .catch(err => console.error("Profile fetch failed", err));
        }
    }, [isSignedIn, user?.userId]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMobileMenuOpen(false);
        };

        if (mobileMenuOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [mobileMenuOpen]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors duration-300">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Logo */}
                        <Link href="/" className="flex items-center space-x-3 group">
                            <div className="flex items-center justify-center w-8 h-8 bg-emerald-600 rounded-lg group-hover:scale-110 transition-transform">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                                ClarityCode
                            </span>
                        </Link>

                        <nav className="hidden md:flex items-center space-x-6">
                            <Link href="/" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
                                Home
                            </Link>
                            <Link href="/repos" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
                                Repositories
                            </Link>
                            <Link href="/dashboard" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
                                Dashboard
                            </Link>
                            <Link href="/pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
                                Pricing
                            </Link>

                            <div className="h-6 w-px bg-gray-200 dark:bg-gray-800 mx-1" />

                            {isSignedIn && user ? (
                                <div className="flex items-center gap-4">
                                    <PlanBadge tier={plan} />
                                    <Link
                                        href="/profile"
                                        className="flex items-center gap-3 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                                    >
                                        <Image
                                            src={user.avatarUrl || '/default-avatar.png'}
                                            width={32}
                                            height={32}
                                            className="w-8 h-8 rounded-full ring-2 ring-emerald-500/20 object-cover"
                                            alt="profile"
                                        />
                                    </Link>
                                </div>
                            ) : (
                                <a
                                    href={githubLoginHref}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition shadow-md hover:shadow-emerald-500/20"
                                >
                                    <Github className="w-4 h-4" />
                                    <span>Continue with GitHub</span>
                                </a>
                            )}
                        </nav>

                        {/* Mobile menu button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800 transition-colors z-60"
                        >
                            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Navigation Overlay */}
            <div
                className={`fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setMobileMenuOpen(false)}
            />
            <div className={`fixed top-0 left-0 h-full w-80 bg-white dark:bg-gray-900 shadow-2xl z-50 md:hidden transform transition-transform duration-300 ease-out border-r border-gray-200 dark:border-gray-800 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
                    <Link href="/" className="flex items-center space-x-3" onClick={() => setMobileMenuOpen(false)}>
                        <div className="flex items-center justify-center w-8 h-8 bg-emerald-600 rounded-lg">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-gray-900 dark:text-white">
                            ClarityCode
                        </span>
                    </Link>
                    <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <nav className="p-4 space-y-1">
                    {[
                        { label: 'Home', path: '/' },
                        { label: 'Repositories', path: '/repos' },
                        { label: 'Dashboard', path: '/dashboard' },
                        { label: 'Pricing', path: '/pricing' },
                        { label: 'History', path: '/history' },
                    ].map(({ label, path }) => (
                        <Link
                            key={label}
                            href={path}
                            className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors py-3 px-4 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 font-medium"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            {label}
                        </Link>
                    ))}

                    <div className="my-6 border-t border-gray-200 dark:border-gray-800" />

                    {isSignedIn && user ? (
                        <div className="px-4">
                            <PlanBadge tier={plan} />
                            <Link
                                href="/profile"
                                onClick={() => setMobileMenuOpen(false)}
                                className="mt-4 flex items-center w-full gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition border border-gray-200 dark:border-gray-700"
                            >
                                <Image
                                    src={user.avatarUrl || '/default-avatar.png'}
                                    width={40}
                                    height={40}
                                    className="w-10 h-10 rounded-full object-cover"
                                    alt="profile"
                                />
                                <div className="text-left overflow-hidden">
                                    <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                                        {user.fullName || user.email || "User"}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">Open full profile</p>
                                </div>
                            </Link>
                        </div>
                    ) : (
                        <div className="px-4">
                            <a
                                href={githubLoginHref}
                                className="w-full flex justify-center py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20"
                            >
                                Continue with GitHub
                            </a>
                        </div>
                    )}
                </nav>
            </div>

            {/* Main Content */}
            <main className="flex-1">
                {children}
            </main>

            {/* Footer */}
            <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="flex flex-col items-center md:items-start gap-3">
                            <div className="flex items-center space-x-3">
                                <div className="flex items-center justify-center w-8 h-8 bg-emerald-600 rounded-lg">
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">ClarityCode</span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">AI-Powered Repository Insights & Quality Analysis</p>
                        </div>

                        <div className="flex items-center gap-6">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                Crafted by{" "}
                                <a
                                    href="https://www.linkedin.com/in/shreyash-patel-ba27b02a6/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-bold text-gray-900 dark:text-white hover:text-emerald-500 transition-colors"
                                >
                                    Shreyash Patel
                                </a>
                            </span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
