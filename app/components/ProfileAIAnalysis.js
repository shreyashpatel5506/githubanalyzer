"use client";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import React from "react";
import { Radar } from "react-chartjs-2";
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, } from "chart.js";
import ReactMarkdown from "react-markdown";
ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);
const LABELS = {
    consistency: "Consistency",
    projectQuality: "Project Quality",
    openSource: "Open Source",
    documentation: "Documentation",
    branding: "Personal Branding",
    hiringReadiness: "Hiring Readiness",
};
const ProfileAIAnalysis = ({ analysis }) => {
    if (!analysis)
        return null;
    const { verdict, scores, missing, plan } = analysis;
    if (!verdict || !scores)
        return null;
    const entries = Object.entries(scores);
    // unexpected empty scores handling
    if (entries.length === 0)
        return null;
    const weakest = entries.reduce((a, b) => (a[1] < b[1] ? a : b));
    return (_jsxs("div", { className: "space-y-12 animate-in fade-in duration-700", children: [_jsxs("section", { className: "bg-linear-to-br from-slate-900 to-black border border-slate-700 text-slate-100 rounded-3xl p-8 md:p-10 shadow-xl", children: [_jsxs("span", { className: "inline-block bg-indigo-500/20 text-indigo-300 px-4 py-1 rounded-full text-sm font-bold border border-indigo-500/30", children: ["Level: ", verdict.level] }), _jsx("p", { className: "mt-6 text-lg font-medium leading-relaxed max-w-3xl text-slate-300", children: verdict.summary })] }), _jsxs("section", { children: [_jsxs("h2", { className: "text-xl mb-6 font-bold text-indigo-400 flex items-center gap-2", children: [_jsx("span", { children: "\uD83D\uDCCA" }), " Profile Health Signals"] }), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4", children: entries.map(([k, v]) => {
                            const isWeakest = k === weakest[0];
                            return (_jsxs("div", { className: `p-5 rounded-2xl border text-center transition hover:scale-105 ${isWeakest
                                    ? "bg-red-950/20 border-red-900/50 text-red-200"
                                    : "bg-slate-900/50 border-slate-700/50 text-slate-200"}`, children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-slate-500 font-semibold", children: LABELS[k] }), _jsxs("p", { className: "text-3xl font-black mt-2", children: [v, "/10"] }), isWeakest && (_jsx("p", { className: "mt-2 text-[10px] uppercase font-bold text-red-400 tracking-wider", children: "Primary Weakness" }))] }, k));
                        }) })] }), _jsxs("section", { className: "p-8 rounded-3xl border bg-linear-to-b from-slate-900 to-black border-slate-700", children: [_jsx("h2", { className: "text-xl font-bold mb-8 text-indigo-400", children: "\uD83D\uDD78\uFE0F Skill Distribution Overview" }), _jsx("div", { className: "max-w-xl mx-auto", children: _jsx(Radar, { data: {
                                labels: entries.map(([k]) => LABELS[k]),
                                datasets: [
                                    {
                                        label: 'Skill Level',
                                        data: entries.map(([, v]) => v),
                                        fill: true,
                                        backgroundColor: "rgba(99, 102, 241, 0.2)",
                                        borderColor: "#6366f1",
                                        pointBackgroundColor: "#6366f1",
                                        pointBorderColor: "#fff",
                                        pointHoverBackgroundColor: "#fff",
                                        pointHoverBorderColor: "#6366f1",
                                        borderWidth: 2,
                                    },
                                ],
                            }, options: {
                                responsive: true,
                                scales: {
                                    r: {
                                        min: 0,
                                        max: 10,
                                        ticks: {
                                            stepSize: 2,
                                            display: false, // hide numbers on axis for cleaner look
                                            color: "#94a3b8",
                                            backdropColor: "transparent",
                                        },
                                        grid: {
                                            color: "rgba(148,163,184,0.1)",
                                            circular: true,
                                        },
                                        angleLines: {
                                            color: "rgba(148,163,184,0.1)",
                                        },
                                        pointLabels: {
                                            color: "#cbd5e1",
                                            font: { size: 11, weight: 600 },
                                        },
                                    },
                                },
                                plugins: {
                                    legend: { display: false },
                                    tooltip: {
                                        backgroundColor: "#0f172a",
                                        titleColor: "#e2e8f0",
                                        bodyColor: "#cbd5e1",
                                        borderColor: "#334155",
                                        borderWidth: 1,
                                        padding: 12,
                                        displayColors: false,
                                    },
                                },
                            } }) })] }), _jsx(Section, { title: "\u26A0\uFE0F Critical Gaps", children: _jsx(ReactMarkdown, { components: {
                        ul: (_a) => {
                            var { node } = _a, props = __rest(_a, ["node"]);
                            return _jsx("ul", Object.assign({ className: "list-disc pl-5 space-y-2" }, props));
                        },
                        li: (_a) => {
                            var { node } = _a, props = __rest(_a, ["node"]);
                            return _jsx("li", Object.assign({ className: "text-slate-300" }, props));
                        }
                    }, children: missing }) }), _jsx(Section, { title: "\uD83D\uDE80 30-Day Improvement Plan", children: _jsx(ReactMarkdown, { components: {
                        strong: (_a) => {
                            var { node } = _a, props = __rest(_a, ["node"]);
                            return _jsx("strong", Object.assign({ className: "text-indigo-300 font-bold" }, props));
                        },
                        ul: (_a) => {
                            var { node } = _a, props = __rest(_a, ["node"]);
                            return _jsx("ul", Object.assign({ className: "list-disc pl-5 space-y-2 mt-2" }, props));
                        },
                        li: (_a) => {
                            var { node } = _a, props = __rest(_a, ["node"]);
                            return _jsx("li", Object.assign({ className: "text-slate-300" }, props));
                        }
                    }, children: plan }) })] }));
};
const Section = ({ title, children }) => (_jsxs("section", { className: "rounded-3xl p-8 border bg-slate-900/50 border-slate-700 text-slate-100", children: [_jsx("h2", { className: "text-xl font-bold mb-6 text-indigo-400", children: title }), _jsx("div", { className: "prose prose-invert max-w-none text-slate-300 prose-headings:text-indigo-200 prose-strong:text-white", children: children })] }));
export default ProfileAIAnalysis;
