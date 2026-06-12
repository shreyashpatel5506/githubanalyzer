"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, CardContent } from "./Card";
import { MapPin, Link as LinkIcon, Calendar, Share2, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSessionAuth } from "@/app/lib/use-session-auth";
export default function ProfileCard({ profile, onShare }) {
    var _a, _b, _c;
    const router = useRouter();
    const { isSignedIn } = useSessionAuth();
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
        });
    };
    const handleLogout = async () => {
        await fetch("/api/auth/session", { method: "DELETE" });
        router.push("/");
        window.location.href = "/";
    };
    return (_jsxs(Card, { className: "overflow-hidden border-none bg-linear-to-br from-slate-900 via-slate-950 to-indigo-950 text-white shadow-2xl shadow-indigo-950/20", children: [_jsx("div", { className: "relative h-28 bg-linear-to-r from-emerald-500 via-cyan-500 to-blue-600" }), _jsxs(CardContent, { className: "relative pt-0", children: [_jsxs("div", { className: "flex justify-between items-start -mt-12 mb-4", children: [_jsx("img", { src: profile.avatarUrl, alt: profile.name || profile.username, className: "w-24 h-24 rounded-2xl border-4 border-slate-950 shadow-xl object-cover" }), _jsxs("div", { className: "mt-12 flex items-center gap-2", children: [onShare && (_jsx("button", { onClick: onShare, className: "p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors", children: _jsx(Share2, { className: "w-5 h-5" }) })), isSignedIn && (_jsxs("button", { onClick: handleLogout, className: "inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 hover:text-red-200 border border-red-500/20 transition-colors", children: [_jsx(LogOut, { className: "w-4 h-4" }), _jsx("span", { className: "text-sm font-semibold", children: "Logout" })] }))] })] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-white", children: profile.name || profile.username || "Anonymous" }), _jsxs("p", { className: "text-slate-300", children: ["@", profile.username] })] }), profile.bio && (_jsx("p", { className: "text-slate-200 leading-relaxed", children: profile.bio })), _jsxs("div", { className: "flex flex-wrap gap-4 text-sm text-slate-300", children: [_jsxs("div", { className: "flex items-center gap-1", children: [_jsx(Calendar, { className: "w-4 h-4" }), _jsxs("span", { children: ["Joined ", formatDate(profile.createdAt)] })] }), profile.location && (_jsxs("div", { className: "flex items-center gap-1", children: [_jsx(MapPin, { className: "w-4 h-4" }), _jsx("span", { children: profile.location })] })), profile.blog && (_jsxs("div", { className: "flex items-center gap-1", children: [_jsx(LinkIcon, { className: "w-4 h-4" }), _jsx("a", { href: profile.blog.startsWith("http") ? profile.blog : `https://${profile.blog}`, target: "_blank", rel: "noopener noreferrer", className: "text-emerald-300 hover:text-emerald-200", children: "Website" })] }))] }), _jsxs("div", { className: "flex gap-6 pt-4 border-t border-white/10", children: [_jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-xl font-bold text-white", children: ((_a = profile.followers) === null || _a === void 0 ? void 0 : _a.toLocaleString()) || 0 }), _jsx("div", { className: "text-sm text-slate-300", children: "Followers" })] }), _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-xl font-bold text-white", children: ((_b = profile.following) === null || _b === void 0 ? void 0 : _b.toLocaleString()) || 0 }), _jsx("div", { className: "text-sm text-slate-300", children: "Following" })] }), _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-xl font-bold text-white", children: ((_c = profile.publicRepos) === null || _c === void 0 ? void 0 : _c.toLocaleString()) || 0 }), _jsx("div", { className: "text-sm text-slate-300", children: "Repos" })] })] })] })] })] }));
}
