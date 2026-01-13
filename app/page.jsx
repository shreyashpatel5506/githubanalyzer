"use client";

import React, { useEffect, useState, useCallback } from "react";
import Layout from "./components/Layout";
import SearchBar from "./components/SearchBar";
import ProfileCard from "./components/ProfileCard";
import ProfileAIAnalysis from "./components/ProfileAIAnalysis";
import ShareModal from "./components/ShareModal";
import { StatsGrid } from "./components/StatsGrid";
import { Card, CardContent } from "./components/Card";
import { exportToPDF } from "./utils/exportToPdf";
import { useRouter } from "next/navigation";
import { Sparkles, Brain, Share2, RotateCcw } from "lucide-react";
import { useSession } from "next-auth/react";

const HomePage = () => {
  const router = useRouter();
  const { status } = useSession();

  const [data, setData] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sharing, setSharing] = useState(false);

  /* ===============================
     🔥 CORE FETCH (AUTH AWARE)
  =============================== */
  const fetchGithubData = async (username, includePrivate = false) => {
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const res = await fetch("/api/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          accessToken: includePrivate ? "session" : null,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      const payload = {
        ...result,
        fetchedWithAuth: includePrivate,
      };

      setData(payload);
      localStorage.setItem("githubData", JSON.stringify(payload));
      window.dispatchEvent(new Event("github-profile-updated"));

      fetchProfileAnalysis(payload);
    } catch {
      setError("User not found or GitHub API error");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  /* ===============================
     🤖 AI ANALYSIS
  =============================== */
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
      const updated = { ...githubData, analysis: result.analysis };

      setAnalysis(result.analysis);
      setData(updated);
      localStorage.setItem("githubData", JSON.stringify(updated));
    } catch {
      setAnalysis({ error: "AI analysis failed" });
    } finally {
      setAiLoading(false);
    }
  };

  /* ===============================
     📦 LOAD FROM CACHE
  =============================== */
  useEffect(() => {
    const cached = localStorage.getItem("githubData");
    if (!cached) return;

    const parsed = JSON.parse(cached);
    setData(parsed);
    if (parsed.analysis) setAnalysis(parsed.analysis);

    router.push(`?user=${parsed.profile.username}`, { scroll: false });
  }, []);

  /* ===============================
     🔗 URL PARAM
  =============================== */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const user = params.get("user");
    if (user) {
      fetchGithubData(user, status === "authenticated");
    }
  }, []);

  /* ===============================
     🔥 AUTO UPGRADE AFTER LOGIN
  =============================== */
  useEffect(() => {
    if (!data) return;
    if (status !== "authenticated") return;
    if (data.fetchedWithAuth) return;

    fetchGithubData(data.profile.username, true);
  }, [status]);

  /* ===============================
     🔎 SEARCH
  =============================== */
  const handleSearch = useCallback(
    (username) => {
      router.push(`?user=${username}`, { scroll: false });
      fetchGithubData(username, status === "authenticated");
    },
    [status]
  );

  const handleReset = () => {
    localStorage.removeItem("githubData");
    setData(null);
    setAnalysis(null);
    router.push("/", { scroll: false });
  };

  const handleExportPDF = () => exportToPDF("ai-analysis");

  /* ===============================
     ⏳ LOADING
  =============================== */
  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* ================= HERO ================= */}
      {!data && (
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-emerald-600 rounded-2xl">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          </div>

          <h1 className="text-5xl font-bold mb-4 text-white">
            <span className="gradient-text">GitProfile</span> AI
          </h1>

          <p className="text-gray-400 mb-10">
            AI-powered GitHub profile analysis with recruiter-grade insights
          </p>

          <SearchBar onSearch={handleSearch} loading={loading} />

          {error && <p className="text-red-500 mt-6">{error}</p>}
        </div>
      )}

      {/* ================= RESULTS ================= */}
      {data && (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
          {/* 🔥 HEADER (MATCHES SCREENSHOT) */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">
                Profile Analysis
              </h1>
              <p className="text-gray-400">
                Comprehensive GitHub profile evaluation
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSharing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>

              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                <RotateCcw className="w-4 h-4" />
                New Analysis
              </button>
            </div>
          </div>

          {/* PROFILE CARD */}
          <ProfileCard profile={data.profile} />

          {/* STATS */}
          <StatsGrid
            stats={[
              { title: "Open PRs", value: data.pullRequests.open },
              { title: "Merged PRs", value: data.pullRequests.merged },
              { title: "Commits", value: data.recentActivity.commits },
              {
                title: "Active Repos",
                value: data.recentActivity.activeRepositories,
              },
            ]}
          />

          {/* AI ANALYSIS */}
          {aiLoading ? (
            <Card>
              <CardContent className="text-center py-12">
                AI Analysis in progress…
              </CardContent>
            </Card>
          ) : (
            analysis && (
              <ProfileAIAnalysis
                analysis={analysis}
                onExport={handleExportPDF}
              />
            )
          )}
        </div>
      )}

      {/* SHARE MODAL */}
      <ShareModal
        isOpen={sharing}
        onClose={() => setSharing(false)}
        profileUrl={typeof window !== "undefined" ? window.location.href : ""}
        username={data?.profile?.username || ""}
      />
    </Layout>
  );
};

export default HomePage;
