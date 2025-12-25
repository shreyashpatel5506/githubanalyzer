"use client";

import { useEffect, useState } from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
 import { normalizeTechStack } from "../lib/normalizeTechStack"; 
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

 

const normalized = normalizeTechStack(stack, 1); // <1% → Others

const entries = Object.entries(normalized).sort(
  (a, b) => b[1] - a[1]
);

  const chartData = {
    labels: entries.map(([k]) => k),
    datasets: [
      {
        data: entries.map(([, v]) => v),
        backgroundColor: entries.map(
          (_, i) => `hsl(${i * 35}, 70%, 60%)`
        ),
        borderColor: "#fff",
        borderWidth: 2,
      },
    ],
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-black mb-10 text-center">
        Tech Stack Distribution
      </h1>

      <div className="grid md:grid-cols-1 gap-12 items-center">
        {/* 🥧 PIE */}
     <div className="w-full max-w-[760px] mx-auto
                h-[360px] sm:h-[420px] md:h-[520px] lg:h-[600px]">
  <Pie
    data={chartData}
    options={{
      responsive: true,
      maintainAspectRatio: false,
      cutout: "60%", // 👈 DONUT STYLE
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#e5e7eb",
            boxWidth: 15,
            padding: 14,
            font: {
              size: 13,
              weight: "600",
            },
          },
        },
        tooltip: {
          backgroundColor: "#020617",
          borderColor: "#6366f1",
          borderWidth: 1,
          titleColor: "#fff",
          bodyColor: "#c7d2fe",
          padding: 12,
          callbacks: {
            label: function (context) {
              const label = context.label || "";
              const value = context.parsed;
              return ` ${label}: ${value}%`;
            },
          },
        },
      },
      animation: {
        animateRotate: true,
        duration: 1200,
      },
    }}
  />
</div>


        {/* 📊 TECH LIST */}
        <div className="max-h-[420px] overflow-y-auto space-y-3 pr-2">
          {entries.map(([tech, value]) => (
            <div
              key={tech}
              className="flex justify-between rounded-xl border px-4 py-3 bg-white"
            >
              <span className="font-semibold text-black">{tech}</span>
              <span className="text-sm text-gray-500">
                {value}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
