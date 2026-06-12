"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Sparkles, Menu, X, Github, ShieldCheck, Crown } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useSessionAuth } from "@/app/lib/use-session-auth";
function PlanBadge({ tier }) {
    if (tier === "pro_plus") {
        return (_jsxs("span", { className: "flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold border border-indigo-500/20", children: [_jsx(Crown, { className: "w-3 h-3" }), "PRO+"] }));
    }
    if (tier === "pro") {
        return (_jsxs("span", { className: "flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20", children: [_jsx(ShieldCheck, { className: "w-3 h-3" }), "PRO"] }));
    }
    return null;
}
export default function Layout({ children }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { isSignedIn, user } = useSessionAuth();
    const [plan, setPlan] = useState("free");
    const githubLoginHref = "/api/auth/github/start?next=/repos";
    // Fetch user profile and plan on mount
    useEffect(() => {
        if (isSignedIn && (user === null || user === void 0 ? void 0 : user.userId)) {
            fetch('/api/profile')
                .then(res => res.json())
                .then(data => {
                if (data.plan)
                    setPlan(data.plan);
            })
                .catch(err => console.error("Profile fetch failed", err));
        }
    }, [isSignedIn, user === null || user === void 0 ? void 0 : user.userId]);
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape')
                setMobileMenuOpen(false);
        };
        if (mobileMenuOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [mobileMenuOpen]);
    return (_jsxs("div", { className: "min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors duration-300", children: [_jsx("header", { className: "sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700", children: _jsx("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: _jsxs("div", { className: "flex justify-between items-center h-16", children: [_jsxs(Link, { href: "/", className: "flex items-center space-x-3 group", children: [_jsx("div", { className: "flex items-center justify-center w-8 h-8 bg-emerald-600 rounded-lg group-hover:scale-110 transition-transform", children: _jsx(Sparkles, { className: "w-5 h-5 text-white" }) }), _jsx("span", { className: "text-xl font-bold tracking-tight text-gray-900 dark:text-white", children: "ClarityCode" })] }), _jsxs("nav", { className: "hidden md:flex items-center space-x-6", children: [_jsx(Link, { href: "/", className: "text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors", children: "Home" }), _jsx(Link, { href: "/repos", className: "text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors", children: "Repositories" }), _jsx(Link, { href: "/dashboard", className: "text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors", children: "Dashboard" }), _jsx(Link, { href: "/pricing", className: "text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors", children: "Pricing" }), _jsx("div", { className: "h-6 w-px bg-gray-200 dark:bg-gray-800 mx-1" }), isSignedIn && user ? (_jsxs("div", { className: "flex items-center gap-4", children: [_jsx(PlanBadge, { tier: plan }), _jsx(Link, { href: "/profile", className: "flex items-center gap-3 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition", children: _jsx("img", { src: user.avatarUrl || '/default-avatar.png', className: "w-8 h-8 rounded-full ring-2 ring-emerald-500/20 object-cover", alt: "profile" }) })] })) : (_jsxs("a", { href: githubLoginHref, className: "flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition shadow-md hover:shadow-emerald-500/20", children: [_jsx(Github, { className: "w-4 h-4" }), _jsx("span", { children: "Continue with GitHub" })] }))] }), _jsx("button", { onClick: () => setMobileMenuOpen(!mobileMenuOpen), className: "md:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800 transition-colors z-60", children: mobileMenuOpen ? _jsx(X, { className: "w-5 h-5" }) : _jsx(Menu, { className: "w-5 h-5" }) })] }) }) }), _jsx("div", { className: `fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`, onClick: () => setMobileMenuOpen(false) }), _jsxs("div", { className: `fixed top-0 left-0 h-full w-80 bg-white dark:bg-gray-900 shadow-2xl z-50 md:hidden transform transition-transform duration-300 ease-out border-r border-gray-200 dark:border-gray-800 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`, children: [_jsxs("div", { className: "flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800", children: [_jsxs(Link, { href: "/", className: "flex items-center space-x-3", onClick: () => setMobileMenuOpen(false), children: [_jsx("div", { className: "flex items-center justify-center w-8 h-8 bg-emerald-600 rounded-lg", children: _jsx(Sparkles, { className: "w-5 h-5 text-white" }) }), _jsx("span", { className: "text-xl font-bold text-gray-900 dark:text-white", children: "ClarityCode" })] }), _jsx("button", { onClick: () => setMobileMenuOpen(false), className: "p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("nav", { className: "p-4 space-y-1", children: [[
                                { label: 'Home', path: '/' },
                                { label: 'Repositories', path: '/repos' },
                                { label: 'Dashboard', path: '/dashboard' },
                                { label: 'Pricing', path: '/pricing' },
                                { label: 'History', path: '/history' },
                            ].map(({ label, path }) => (_jsx(Link, { href: path, className: "flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors py-3 px-4 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 font-medium", onClick: () => setMobileMenuOpen(false), children: label }, label))), _jsx("div", { className: "my-6 border-t border-gray-200 dark:border-gray-800" }), isSignedIn && user ? (_jsxs("div", { className: "px-4", children: [_jsx(PlanBadge, { tier: plan }), _jsxs(Link, { href: "/profile", onClick: () => setMobileMenuOpen(false), className: "mt-4 flex items-center w-full gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition border border-gray-200 dark:border-gray-700", children: [_jsx("img", { src: user.avatarUrl || '/default-avatar.png', className: "w-10 h-10 rounded-full object-cover", alt: "profile" }), _jsxs("div", { className: "text-left overflow-hidden", children: [_jsx("p", { className: "font-bold text-sm text-gray-900 dark:text-white truncate", children: user.fullName || user.email || "User" }), _jsx("p", { className: "text-xs text-gray-500 truncate", children: "Open full profile" })] })] })] })) : (_jsx("div", { className: "px-4", children: _jsx("a", { href: githubLoginHref, className: "w-full flex justify-center py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20", children: "Continue with GitHub" }) }))] })] }), _jsx("main", { className: "flex-1", children: children }), _jsx("footer", { className: "bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800", children: _jsx("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12", children: _jsxs("div", { className: "flex flex-col md:flex-row justify-between items-center gap-8", children: [_jsxs("div", { className: "flex flex-col items-center md:items-start gap-3", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("div", { className: "flex items-center justify-center w-8 h-8 bg-emerald-600 rounded-lg", children: _jsx(Sparkles, { className: "w-5 h-5 text-white" }) }), _jsx("span", { className: "text-xl font-bold text-gray-900 dark:text-white tracking-tight", children: "ClarityCode" })] }), _jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: "AI-Powered Repository Insights & Quality Analysis" })] }), _jsx("div", { className: "flex items-center gap-6", children: _jsxs("span", { className: "text-sm text-gray-500 dark:text-gray-400", children: ["Crafted by", " ", _jsx("a", { href: "https://www.linkedin.com/in/shreyash-patel-ba27b02a6/", target: "_blank", rel: "noopener noreferrer", className: "font-bold text-gray-900 dark:text-white hover:text-emerald-500 transition-colors", children: "Shreyash Patel" })] }) })] }) }) })] }));
}
