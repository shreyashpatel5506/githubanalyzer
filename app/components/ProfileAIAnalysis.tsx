"use client";

import React from "react";
import { Radar } from "react-chartjs-2";
import {
    Chart as ChartJS,
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend,
} from "chart.js";
import ReactMarkdown from "react-markdown";

ChartJS.register(
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend
);

const LABELS: Record<string, string> = {
    consistency: "Consistency",
    projectQuality: "Project Quality",
    openSource: "Open Source",
    documentation: "Documentation",
    branding: "Personal Branding",
    hiringReadiness: "Hiring Readiness",
};

interface Analysis {
    verdict: {
        level: string;
        summary: string;
    };
    scores: Record<string, number>;
    missing: string;
    plan: string;
}

const ProfileAIAnalysis = ({ analysis }: { analysis: Analysis | null }) => {
    if (!analysis) return null;

    const { verdict, scores, missing, plan } = analysis;
    if (!verdict || !scores) return null;

    const entries = Object.entries(scores);
    // unexpected empty scores handling
    if (entries.length === 0) return null;

    const weakest = entries.reduce((a, b) => (a[1] < b[1] ? a : b));

    return (
        <div className="space-y-12 animate-in fade-in duration-700">

            {/* ================= HERO VERDICT ================= */}
            <section className="bg-gradient-to-br from-slate-900 to-black border border-slate-700 text-slate-100 rounded-3xl p-8 md:p-10 shadow-xl">
                <span className="inline-block bg-indigo-500/20 text-indigo-300 px-4 py-1 rounded-full text-sm font-bold border border-indigo-500/30">
                    Level: {verdict.level}
                </span>

                <p className="mt-6 text-lg font-medium leading-relaxed max-w-3xl text-slate-300">
                    {verdict.summary}
                </p>
            </section>

            {/* ================= SIGNAL SCORES ================= */}
            <section>
                <h2 className="text-xl mb-6 font-bold text-indigo-400 flex items-center gap-2">
                    <span>📊</span> Profile Health Signals
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {entries.map(([k, v]) => {
                        const isWeakest = k === weakest[0];

                        return (
                            <div
                                key={k}
                                className={`p-5 rounded-2xl border text-center transition hover:scale-105 ${isWeakest
                                    ? "bg-red-950/20 border-red-900/50 text-red-200"
                                    : "bg-slate-900/50 border-slate-700/50 text-slate-200"
                                    }`}
                            >
                                <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
                                    {LABELS[k]}
                                </p>

                                <p className="text-3xl font-black mt-2">{v}/10</p>

                                {isWeakest && (
                                    <p className="mt-2 text-[10px] uppercase font-bold text-red-400 tracking-wider">
                                        Primary Weakness
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* ================= RADAR ================= */}
            <section className="p-8 rounded-3xl border bg-gradient-to-b from-slate-900 to-black border-slate-700">
                <h2 className="text-xl font-bold mb-8 text-indigo-400">
                    🕸️ Skill Distribution Overview
                </h2>

                <div className="max-w-xl mx-auto">
                    <Radar
                        data={{
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
                        }}
                        options={{
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
                        }}
                    />
                </div>
            </section>

            {/* ================= GAPS ================= */}
            <Section title="⚠️ Critical Gaps">
                <ReactMarkdown
                    components={{
                        ul: ({ node, ...props }) => <ul className="list-disc pl-5 space-y-2" {...props} />,
                        li: ({ node, ...props }) => <li className="text-slate-300" {...props} />
                    }}
                >
                    {missing}
                </ReactMarkdown>
            </Section>

            {/* ================= PLAN ================= */}
            <Section title="🚀 30-Day Improvement Plan">
                <ReactMarkdown
                    components={{
                        strong: ({ node, ...props }) => <strong className="text-indigo-300 font-bold" {...props} />,
                        ul: ({ node, ...props }) => <ul className="list-disc pl-5 space-y-2 mt-2" {...props} />,
                        li: ({ node, ...props }) => <li className="text-slate-300" {...props} />
                    }}
                >
                    {plan}
                </ReactMarkdown>
            </Section>
        </div>
    );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="rounded-3xl p-8 border bg-slate-900/50 border-slate-700 text-slate-100">
        <h2 className="text-xl font-bold mb-6 text-indigo-400">
            {title}
        </h2>

        <div className="prose prose-invert max-w-none text-slate-300 prose-headings:text-indigo-200 prose-strong:text-white">
            {children}
        </div>
    </section>
);

export default ProfileAIAnalysis;
