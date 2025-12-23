"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
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

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

const RepoDetailPage = () => {
  const params = useParams();
  const router = useRouter();

  const [repoData, setRepoData] = useState(null);
  const [analysis, setAnalysis] = useState("");
  const [scores, setScores] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("githubData");
    if (!saved) {
      router.push("/");
      return;
    }

    const parsed = JSON.parse(saved);
    const repo = parsed.repos.find((r) => r.name === params.repo);

    if (!repo) {
      router.push("/projects");
      return;
    }

    setRepoData(repo);

    const cacheKey = `analysis-${repo.name}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      const parsedCache = JSON.parse(cached);
      setAnalysis(parsedCache.analysis);
      setScores(parsedCache.scores);
      setLoading(false);
    } else {
      fetchAIAnalysis(repo, parsed.profile.username);
    }
  }, [params.repo]);

  const fetchAIAnalysis = async (repo, username) => {
    try {
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoDetails: repo, username }),
      });

      const result = await res.json();
      setAnalysis(result.analysis);
      setScores(result.scores);

      localStorage.setItem(
        `analysis-${repo.name}`,
        JSON.stringify(result)
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950">
        <p className="text-indigo-400 text-lg font-bold animate-pulse">
          AI is auditing {params.repo}...
        </p>
      </div>
    );
  }

  const scoreEntries = Object.entries(scores);
  const weakest = scoreEntries.reduce((a, b) => (a[1] < b[1] ? a : b));

  const resumeScore =
    Math.round(
      (scores.maintainability +
        scores.security +
        scores.documentation +
        scores.scalability +
        scores.codeQuality) *
        2
    ) || 0;

  const resumeVerdict =
    resumeScore >= 70 ? "YES" : resumeScore >= 50 ? "MAYBE" : "NO";

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10">
      <div className="max-w-6xl mx-auto space-y-10">

        {/* HEADER */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
          <button
            onClick={() => router.back()}
            className="text-indigo-400 text-sm font-semibold mb-4"
          >
            ← Back
          </button>

          <h1 className="text-4xl font-black text-white mb-2">
            {repoData.name}
          </h1>

          <p className="text-slate-400 mb-4">
            {repoData.description || "No description provided"}
          </p>

          <div className="flex flex-wrap gap-3">
            <Badge>{repoData.language}</Badge>
            <Badge>⭐ {repoData.stars}</Badge>
            <Badge>🍴 {repoData.forks}</Badge>

            <span
              className={`px-4 py-1.5 rounded-full text-sm font-black ${
                resumeVerdict === "YES"
                  ? "bg-green-600 text-white"
                  : resumeVerdict === "MAYBE"
                  ? "bg-yellow-500 text-black"
                  : "bg-red-600 text-white"
              }`}
            >
              Resume: {resumeVerdict}
            </span>
          </div>
        </div>

        {/* SCORE CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {scoreEntries.map(([key, value]) => (
            <div
              key={key}
              className={`p-5 rounded-2xl border text-center font-bold ${
                key === weakest[0]
                  ? "bg-red-900/40 border-red-500 text-red-300"
                  : "bg-slate-900 border-slate-800 text-slate-200"
              }`}
            >
              <div className="uppercase text-xs tracking-widest mb-2">
                {key}
              </div>
              <div className="text-3xl">{value}/10</div>
              {key === weakest[0] && (
                <div className="text-xs mt-2 font-black">
                  ⚠ Weakest Area
                </div>
              )}
            </div>
          ))}
        </div>

        {/* RADAR CHART */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
          <h2 className="text-xl font-bold text-white mb-6">
            Project Health Radar
          </h2>

          <Radar
            data={{
              labels: scoreEntries.map(([k]) => k),
              datasets: [
                {
                  label: "Score",
                  data: scoreEntries.map(([_, v]) => v),
                  fill: true,
                  backgroundColor: "rgba(99,102,241,0.25)",
                  borderColor: "#818cf8",
                  borderWidth: 3,
                  pointBackgroundColor: "#ffffff",
                  pointBorderColor: "#6366f1",
                  pointRadius: 5,
                },
              ],
            }}
            options={{
              scales: {
                r: {
                  min: 0,
                  max: 10,
                  ticks: { color: "#c7d2fe" },
                  grid: { color: "rgba(255,255,255,0.12)" },
                  angleLines: { color: "rgba(255,255,255,0.18)" },
                  pointLabels: {
                    color: "#e0e7ff",
                    font: { weight: "bold" },
                  },
                },
              },
              plugins: {
                legend: {
                  labels: { color: "#e0e7ff" },
                },
              },
            }}
          />
        </div>

        {/* AI REPORT */}
        <div className="bg-white rounded-3xl p-10 text-black">
          <div className="mb-6 text-xs font-black tracking-widest text-indigo-600">
            AI AUDIT REPORT
          </div>

          <article className="prose prose-indigo max-w-none prose-headings:font-black prose-strong:text-indigo-600">
            <ReactMarkdown>{analysis}</ReactMarkdown>
          </article>
        </div>

        {/* RESUME SCORE */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-3xl p-8 text-center">
          <h3 className="text-sm uppercase tracking-widest font-black mb-2">
            Resume Readiness Score
          </h3>
          <div className="text-6xl font-black">{resumeScore}/100</div>
          <p className="mt-3 font-semibold">
            {resumeVerdict === "YES"
              ? "Safe to add on resume"
              : resumeVerdict === "MAYBE"
              ? "Improve weak areas first"
              : "Do NOT add this yet"}
          </p>
        </div>
      </div>
    </div>
  );
};

const Badge = ({ children }) => (
  <span className="px-4 py-1.5 bg-slate-800 text-slate-200 rounded-full text-sm font-semibold">
    {children}
  </span>
);

export default RepoDetailPage;
