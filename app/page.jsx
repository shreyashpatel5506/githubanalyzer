"use client";

import React, { useEffect, useState, useCallback } from "react";
import SearchBar from "./components/SearchBar";
import ProfileAIAnalysis from "./components/ProfileAIAnalysis.jsx";
import { exportToPDF } from "./utils/exportToPdf";
import { useRouter } from "next/navigation";
import { Share } from "lucide-react";

const HomePage = () => {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sharing, setSharing] = useState(false);

  /* 🔁 Load cached data */
  useEffect(() => {
    const stored = localStorage.getItem("githubData");
    if (stored) {
      const parsed = JSON.parse(stored);
      setData(parsed);
      if (parsed.analysis) setAnalysis(parsed.analysis);
    }
  }, []);

  /* 🔍 Check URL for username param */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userParam = params.get('user');
    if (userParam) {
      fetchGithubData(userParam);
    } else {
      let storedUser = localStorage.getItem("githubData");
      storedUser = JSON.parse(storedUser);
      if (localStorage.getItem("githubData") == undefined || !storedUser) {
        return;
      } else {
        router.push(`?user=${storedUser.profile.username}`, { scroll: false });
      }
    }
  }, []);

  const handleSearch = useCallback((username) => {
    fetchGithubData(username);
    router.push(`?user=${username}`, { scroll: false });
  }, [router]);

  /* 🧠 AI PROFILE ANALYSIS */
  const fetchProfileAnalysis = async (githubData) => {
    setAiLoading(true);
    try {
      const res = await fetch("/api/profile-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: githubData.profile,
          repos: githubData.repos,
          pullRequests: githubData.pullRequests,
          recentActivity: githubData.recentActivity,
        }),
      });

      const result = await res.json();

      setAnalysis(result.analysis);

      const updated = { ...githubData, analysis: result.analysis };
      setData(updated);
      localStorage.setItem("githubData", JSON.stringify(updated));
    } catch (err) {
      console.error(err);
      setAnalysis({ error: "AI analysis failed. Try again later." });
    } finally {
      setAiLoading(false);
    }
  };

  /* 🔎 FETCH GITHUB PROFILE */
  const fetchGithubData = async (username) => {
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const res = await fetch("/api/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      setData(result);
      localStorage.setItem("githubData", JSON.stringify(result));

      fetchProfileAnalysis(result);
    } catch (err) {
      setError("User not found or GitHub API error");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  /* ⏳ GLOBAL LOADING */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 bg-slate-950">
        <div className="animate-spin rounded-full h-14 w-14 border-b-4 border-indigo-500"></div>
        <p className="text-slate-400 font-medium">
          Fetching GitHub profile data…
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      <div className="max-w-6xl mx-auto px-4 pt-12">

        {/* ================= LANDING ================= */}
        {!data && (
          <div className="flex flex-col items-center justify-center h-[65vh] text-center">
            <h1 className="text-5xl md:text-6xl font-extrabold text-indigo-300 mb-4">
              GitProfile AI
            </h1>

            <p className="text-slate-400 mb-10 max-w-xl text-lg">
              Recruiter-style AI analysis of your GitHub profile.
              Find out if your profile is actually hire-ready.
            </p>

            <div className="w-full max-w-md">
              <SearchBar onSearch={handleSearch} />
            </div>

            {error && (
              <p className="mt-6 text-red-300 bg-red-500/10 px-4 py-2 rounded-xl border border-red-500/30">
                {error}
              </p>
            )}
          </div>
        )}

        {/* ================= RESULT ================= */}
        {data && (
          <div className="space-y-12 animate-in fade-in duration-700">

            {/* 👤 PROFILE CARD */}
            <section className="bg-slate-900/80 border border-slate-700 rounded-3xl p-8 flex flex-col md:flex-row gap-8 items-center">
              <img
                src={data.profile.avatarUrl}
                alt="avatar"
                className="w-36 h-36 rounded-3xl shadow border border-slate-700"
              />

              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-black text-slate-100">
                  {data.profile.name || data.profile.username}
                </h1>

                <p className="text-slate-400 mb-3">
                  @{data.profile.username}
                </p>

                <p className="text-slate-300 max-w-2xl mb-6">
                  {data.profile.bio || "No bio provided"}
                </p>

                <div className="flex gap-4 justify-center md:justify-start">
                  <MiniStat label="Followers" value={data.profile.followers} />
                  <MiniStat label="Following" value={data.profile.following} />
                  <MiniStat label="Repos" value={data.profile.publicRepos} />
                </div>
              </div>
              <button aria-label="Share profile" onClick={() => setSharing(!sharing)} className="self-start bg-indigo-600 p-2 rounded-xl"><Share /></button>
              {sharing && (
                <>
                  <div
                    className="fixed inset-0 bg-black/50 z-40"
                    onClick={() => setSharing(false)}
                  />

                  <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-slate-800 border border-slate-600 rounded-xl p-6 shadow-2xl z-50">
                    <div className="flex justify-between items-center mb-4">
                      <p className="font-semibold text-indigo-300">Share Profile</p>
                      <button onClick={() => setSharing(false)} className="text-slate-400 hover:text-white">✕</button>
                    </div>

                    <input
                      type="text"
                      readOnly
                      value={typeof window !== "undefined" ? window.location.href : ""}
                      className="w-full bg-slate-700 text-slate-200 px-3 py-3 rounded-md border border-slate-600 focus:outline-none focus:border-indigo-500"
                      onFocus={(e) => e.target.select()}
                    />

                    <p className="text-xs text-slate-500 mt-3 text-center">
                      Copy the link above to share this analysis.
                    </p>
                  </div>
                </>
              )}
            </section>

            {/* 📊 ACTIVITY STATS */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Open PRs" value={data.pullRequests.open} color="blue" />
              <StatCard title="Merged PRs" value={data.pullRequests.merged} color="green" />
              <StatCard title="Recent Commits" value={data.recentActivity.commits} color="purple" />
              <StatCard title="Active Repos" value={data.recentActivity.activeRepositories} color="orange" />
            </section>

            {/* 🤖 AI ANALYSIS */}


            {aiLoading ? (
              <section className="bg-slate-900/80 border border-slate-700 rounded-3xl p-10 text-center">
                <p className="text-xl font-bold mb-2 text-indigo-300">
                  AI is reviewing this profile
                </p>
                <p className="text-slate-400">
                  Evaluating consistency, project quality,
                  open-source impact, and hiring readiness…
                </p>
              </section>
            ) : (
              analysis && (
                <section className="bg-slate-900/80 border border-slate-700 rounded-3xl p-6">

                  {/* Header: Title + Small Button */}
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-indigo-300">
                      AI Analysis
                    </h2>

                    <button
                      onClick={() => exportToPDF("aianalysis")}
                      className="px-3 py-1.5 text-sm rounded-md 
                     bg-indigo-500 text-white 
                     hover:bg-indigo-600 transition"
                    >
                      Download PDF
                    </button>
                  </div>

                  {/* Analysis Content */}
                  <div id="aianalysis">
                    <ProfileAIAnalysis analysis={analysis} />
                  </div>

                </section>
              )
            )}


            {/* 🔁 RESET */}
            <div className="text-center pt-6">
              <button
                onClick={() => {
                  localStorage.removeItem("githubData");
                  setData(null);
                  setAnalysis(null);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-full font-bold transition"
              >
                Analyze Another GitHub Profile
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

/* ---------- UI PARTS ---------- */

const MiniStat = ({ label, value }) => (
  <div className="bg-slate-800/80 border border-slate-600 px-4 py-3 rounded-xl text-center min-w-[90px]">
    <p className="text-xl font-black text-slate-100">{value}</p>
    <p className="text-sm text-slate-400">{label}</p>
  </div>
);

const StatCard = ({ title, value, color }) => {
  const colors = {
    blue: "bg-blue-500/10 text-blue-300 border-blue-400/30",
    green: "bg-emerald-500/10 text-emerald-300 border-emerald-400/30",
    purple: "bg-indigo-500/10 text-indigo-300 border-indigo-400/30",
    orange: "bg-orange-500/10 text-orange-300 border-orange-400/30",
  };

  return (
    <div className={`p-6 rounded-2xl border ${colors[color]}`}>
      <h3 className="text-sm font-bold uppercase opacity-70 mb-1">
        {title}
      </h3>
      <p className="text-4xl font-black">{value}</p>
    </div>
  );
};

export default HomePage;
