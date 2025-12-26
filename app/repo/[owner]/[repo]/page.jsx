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
import RepoTechCard from "@/app/components/RepoTechCard";
import RepoCommitAnalytics from "@/app/components/RepoCommitAnalytics";
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
  const [scores, setScores] = useState(null);
  const [sections, setSections] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commitWeeks, setCommitWeeks] = useState([]);

  const fetchCommits = async (repoName, username) => {
    try {
      const res = await fetch(`/api/repo-commits/${repoName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      const json = await res.json();
      if (json.pending) {
        // ⏳ retry after 3 seconds
        setTimeout(() => fetchCommits(repoName, username), 3000);
        return;
      }

      setCommitWeeks(
        Array.isArray(json.weeks) ? json.weeks : []
      );
    } catch (err) {
      console.error("Commit fetch error:", err);
      setCommitWeeks([]);
    }
  };


  useEffect(() => {
    const loadRepoData = async () => {
      try {
        const saved = localStorage.getItem("githubData");
        if (!saved) {
          router.push("/");
          return;
        }

        const parsed = JSON.parse(saved);

        // ✅ SAFE REPOS ARRAY
        const allRepos = Array.isArray(parsed?.repos)
          ? parsed.repos
          : [];

        const repo = allRepos.find(
          (r) => r.name === params.repo
        );

        if (!repo) {
          router.push("/projects");
          return;
        }
        fetchCommits(repo.name, parsed.profile.username);
        // ✅ CALL API
        const res = await fetch(`/api/repo-tech/${repo.name}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: parsed.profile.username,
          }),
        });

        const json = await res.json();

        // ✅ DIRECTLY USE tech (NEW API RESPONSE)
        setRepoData({
          ...repo,
          tech: Array.isArray(json?.tech) ? json.tech : [],
        });

        // ---------- AI CACHE ----------
        const cacheKey = `analysis-${repo.name}`;
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
          const data = JSON.parse(cached);
          if (data?.scores && data?.sections?.verdict) {
            setScores(data.scores);
            setSections(data.sections);
            setLoading(false);
            return;
          }
        }

        fetchAI(repo);
      } catch (err) {
        console.error("Repo detail error:", err);
        setLoading(false);
      }
    };



    loadRepoData();
  }, [params.repo]);



  const fetchAI = async (repo) => {
    try {
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoDetails: repo }),
      });

      const data = await res.json();
      setScores(data.scores);
      setSections(data.sections);

      localStorage.setItem(
        `analysis-${repo.name}`,
        JSON.stringify(data)
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !scores || !sections) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950">
        <p className="text-indigo-400 font-black animate-pulse">
          AI is auditing {params.repo}...
        </p>
      </div>
    );
  }

  const scoreEntries = Object.entries(scores);
  const weakest = scoreEntries.reduce((a, b) =>
    a[1] < b[1] ? a : b
  );

  const resumeScore = Math.round(
    (scores.maintainability +
      scores.security +
      scores.documentation +
      scores.scalability +
      scores.codeQuality) * 2
  );

  const resumeVerdict =
    resumeScore >= 70 ? "YES" :
      resumeScore >= 50 ? "MAYBE" :
        "NO";

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10">
      <div className="max-w-6xl mx-auto space-y-10">

        {/* HEADER */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
          <button
            onClick={() => router.back()}
            className="text-indigo-400 font-semibold mb-4"
          >
            ← Back
          </button>

          <h1 className="text-4xl font-black text-white">
            {repoData.name}
          </h1>

          <p className="text-slate-400 mt-2">
            {repoData.description || "No description provided"}
          </p>

          <div className="flex gap-3 mt-4 mb-3 flex-wrap">
            <Badge>{repoData.language}</Badge>
            <Badge>⭐ {repoData.stars}</Badge>
            <Badge>🍴 {repoData.forks}</Badge>
            <Badge>{repoData.liveDemo && (
              <a
                href={repoData.liveDemo}
                target="_blank"
                rel="noopener noreferrer"
              >
                🚀 Live Demo
              </a>
            )}</Badge>
          </div>
          {repoData.topics?.slice(0, 10).map((topic) => (
            <span
              key={topic}
              className="px-2.5 py-1 mt-3 bg-indigo-500/10
                                 text-indigo-300 rounded-lg
                                 text-xs font-medium"
            >
              #{topic}
            </span>
          ))}
        </div>

        <RepoTechCard
          repo={{
            ...repoData,
            tech: repoData.tech || [],
          }}
        />
        <RepoCommitAnalytics weeks={commitWeeks} />
        {/* SCORE CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {scoreEntries.map(([key, value]) => (
            <div
              key={key}
              className={`p-5 rounded-2xl border text-center font-black ${key === weakest[0]
                ? "bg-red-900/40 border-red-500 text-red-300"
                : "bg-slate-900 border-slate-800 text-slate-200"
                }`}
            >
              <div className="uppercase text-xs tracking-widest mb-2">
                {key}
              </div>
              <div className="text-3xl">{value}/10</div>
              {key === weakest[0] && (
                <div className="text-xs mt-2">⚠ Weakest</div>
              )}
            </div>
          ))}
        </div>

        {/* RADAR */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
          <h2 className="text-xl font-black text-white mb-6">
            Project Health Radar
          </h2>

          <Radar
            data={{
              labels: scoreEntries.map(([k]) => k),
              datasets: [
                {
                  data: scoreEntries.map(([_, v]) => v),
                  fill: true,
                  backgroundColor: "rgba(99,102,241,0.25)",
                  borderColor: "#818cf8",
                  borderWidth: 3,
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
                  pointLabels: { color: "#e0e7ff" },
                },
              },
              plugins: { legend: { display: false } },
            }}
          />
        </div>

        {/* VERDICT */}
        <Section title="Overall Verdict">
          {sections.verdict || "No verdict generated"}
        </Section>

        {/* MISSING */}
        <Section title="What Is Missing">
          <ReactMarkdown>
            {sections.missing || ""}
          </ReactMarkdown>
        </Section>

        {/* FIX PLAN */}
        <Section title="48-Hour Fix Plan">
          <ReactMarkdown>
            {sections.fixPlan || ""}
          </ReactMarkdown>
        </Section>



      </div>
    </div>
  );
};

const Section = ({ title, children }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
    <h2 className="text-xl font-black text-white mb-4">
      {title}
    </h2>
    <div className="text-slate-300 prose prose-invert max-w-none">
      {children}
    </div>
  </div>
);

const Badge = ({ children }) => (
  <span className="px-4 py-1.5 bg-slate-800 text-slate-200 rounded-full text-sm font-semibold">
    {children}
  </span>
);

export default RepoDetailPage;
