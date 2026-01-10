"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card";
import { normalizeTechStack } from "../lib/normalizeTechStack";
import { Code, Download, Loader2, AlertCircle, TrendingUp } from "lucide-react";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function TechStackPage() {
  const [stack, setStack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("githubData");
    if (!stored) {
      router.push("/");
      return;
    }
    
    try {
      const { profile } = JSON.parse(stored);
      fetchStack(profile.username);
    } catch (err) {
      setError("Failed to load profile data");
      setLoading(false);
    }
  }, [router]);

  const fetchStack = async (username) => {
    try {
      const res = await fetch("/api/tech-stack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      if (!res.ok) {
        throw new Error("Failed to fetch tech stack data");
      }

      const data = await res.json();
      setStack(data.techStack);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = async () => {
    try {
      setExporting(true);
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
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              Analyzing tech stack distribution...
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !stack) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Unable to Load Tech Stack
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {error || "No tech stack data available"}
            </p>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 
                       transition-colors font-medium"
            >
              Analyze a Profile
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const normalized = normalizeTechStack(stack, 1);
  const entries = Object.entries(normalized).sort((a, b) => b[1] - a[1]);
  const topTech = entries[0];

  const brandColors = [
    "#10b981", // emerald-500
    "#3b82f6", // blue-500
    "#8b5cf6", // violet-500
    "#f59e0b", // amber-500
    "#ef4444", // red-500
    "#06b6d4", // cyan-500
    "#84cc16", // lime-500
    "#f97316", // orange-500
  ];

  const chartData = {
    labels: entries.map(([k]) => k),
    datasets: [
      {
        data: entries.map(([, v]) => v),
        backgroundColor: entries.map(
          (_, i) => brandColors[i % brandColors.length]
        ),
        borderColor: "#ffffff",
        borderWidth: 2,
        hoverOffset: 8,
        hoverBorderWidth: 3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "65%",
    plugins: {
      legend: {
        display: false, // We'll create a custom legend
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        borderColor: "#10b981",
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: (ctx) => ` ${ctx.label}: ${ctx.parsed}%`,
        },
      },
    },
    animation: {
      animateRotate: true,
      duration: 1000,
    },
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/20 rounded-2xl">
              <Code className="w-8 h-8 text-emerald-600" />
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Tech Stack Distribution
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Comprehensive analysis of programming languages and technologies used across all repositories
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Chart Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  Language Distribution
                </span>
                <button
                  onClick={exportPDF}
                  disabled={exporting}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white 
                           rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed
                           transition-colors text-sm font-medium"
                >
                  {exporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {exporting ? "Exporting..." : "Export PDF"}
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative h-80 mb-6">
                <Pie data={chartData} options={chartOptions} />
                
                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Primary Language
                  </p>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {topTech[0]}
                  </h3>
                  <p className="text-lg font-semibold text-emerald-600 mt-1">
                    {topTech[1]}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics Section */}
          <div className="space-y-6">
            {/* Top Language Card */}
            <Card>
              <CardHeader>
                <CardTitle>Dominant Technology</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6">
                  <div className="text-4xl font-bold text-emerald-600 mb-2">
                    {topTech[1]}%
                  </div>
                  <div className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {topTech[0]}
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    Most used programming language
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Language Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Complete Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {entries.map(([tech, percentage], index) => (
                    <div key={tech} className="flex items-center justify-between p-3 
                                              bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: brandColors[index % brandColors.length] }}
                        />
                        <span className="font-medium text-gray-900 dark:text-white">
                          {tech}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full transition-all duration-500"
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: brandColors[index % brandColors.length]
                            }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 min-w-[3rem] text-right">
                          {percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Summary Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {entries.length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Languages Used
                    </div>
                  </div>
                  
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {entries.filter(([, percentage]) => percentage >= 5).length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Primary Languages
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}