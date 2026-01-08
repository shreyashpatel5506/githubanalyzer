"use client";

import { useEffect, useState } from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { normalizeTechStack } from "../lib/normalizeTechStack";
import { Download } from "lucide-react"

ChartJS.register(ArcElement, Tooltip, Legend);

export default function TechStackPage() {
  const [stack, setStack] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("githubData");
    if (!stored) {
      setLoading(false);
      return;
    }
    const { profile } = JSON.parse(stored);
    fetchStack(profile.username);
  }, []);

  const fetchStack = async (username) => {
    const res = await fetch("/api/tech-stack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });

    const data = await res.json();
    setStack(data.techStack);
    setLoading(false);
  };

  if (loading) return <p className="text-center mt-10">Loading tech stack...</p>;
  if (!stack) return <p className="text-center mt-10">No data found</p>;

  const normalized = normalizeTechStack(stack, 1);

  const entries = Object.entries(normalized).sort(
    (a, b) => b[1] - a[1]
  );

  const topTech = entries[0];

  const brandColors = [
    "#6366f1", // Indigo-500 
    "#8b5cf6", // Violet-500
    "#3b82f6", // Blue-500
    "#06b6d4", // Cyan-500
    "#a855f7", // Purple-500
    "#60a5fa", // Blue-400
  ];

  const chartData = {
    labels: entries.map(([k]) => k),
    datasets: [
      {
        data: entries.map(([, v]) => v),
        backgroundColor: entries.map(
          (_, i) => brandColors[i % brandColors.length]
        ),
        borderColor: "#0f172a", 
        borderWidth: 2,
        hoverOffset: 20,
        hoverBorderWidth: 4,
        hoverBackgroundColor: entries.map(
          (_, i) => brandColors[i % brandColors.length] + "ee"
        ),
      },
    ],
  };
  const exportPDF = async () => {
    try {
      const stored = localStorage.getItem("githubData");
      if (!stored) return;

      const { profile } = JSON.parse(stored);
      const username = profile.username; 

      const res = await fetch("/api/tech-stack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          format: "pdf",
        }),
      });

      if (!res.ok) {
        throw new Error("PDF export failed");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${username}-tech-stack.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error("PDF export error:", err);
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "62%",
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "#e5e7eb",
          boxWidth: 14,
          padding: 14,
          font: { size: 13, weight: "600" },
        },
      },
      tooltip: {
        backgroundColor: "#020617",
        borderColor: "#6366f1",
        borderWidth: 1,
        titleColor: "#fff",
        bodyColor: "#c7d2fe",
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (ctx) => ` ${ctx.label}: ${ctx.parsed}%`,
        },
      },
    },
    animation: {
      animateRotate: true,
      duration: 1200,
    },
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-14">
      <h1 className="text-4xl font-black mb-14 text-center text-white">
        Tech Stack Distribution
      </h1>

      <div className="grid lg:grid-cols-2 gap-16 items-center">

        {/* 🥧 PIE */}
        <div className="relative w-full max-w-[760px] mx-auto 
                        h-[360px] sm:h-[420px] md:h-[520px] lg:h-[600px]">

          <Pie data={chartData} options={chartOptions} />
          {/* 🧠 CENTER TEXT */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <p className="text-sm uppercase tracking-widest text-gray-400">
              Primary Stack
            </p>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white">
              {topTech[0]}
            </h2>

            <p className="text-xl sm:text-2xl font-bold text-indigo-400 mt-1">
              {topTech[1]}%
            </p>
          </div>
        </div>

        {/* 📊 TECH LIST */}
        <div className="flex gap-4 flex-col max-h-[520px] overflow-y-auto space-y-3 pr-2">
          <div className="flex flex-col gap-2">
            {entries.map(([tech, value]) => (
              <div
                key={tech}
                className="flex justify-between rounded-xl border 
                         border-slate-800 px-5 py-3 bg-slate-900/60"
              >
                <span className="font-semibold text-white">{tech}</span>
                <span className="text-sm text-gray-400">
                  {value}%
                </span>
              </div>
            ))}
          </div>
          <div>
            <div
              onClick={exportPDF}
              key="exportPDF"
              className="flex justify-between rounded-xl border 
                         border-slate-800 px-5 py-3 bg-indigo-600 cursor-pointer"
            >
              <span className="font-semibold text-white">Export as PDF</span>
              <span className="text-sm text-gray-400">
                <Download></Download>
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
