"use client";

import React, { useEffect, useState, useCallback } from "react";
import Layout from "./components/Layout";
import SearchBar from "./components/SearchBar";
import ProfileCard from "./components/ProfileCard";
import ProfileAIAnalysis from "./components/ProfileAIAnalysis";
import ShareModal from "./components/ShareModal";
import { StatsGrid } from "./components/StatsGrid";
import { Card, CardContent } from "./components/Card";
import { useRouter } from "next/navigation";
import { Sparkles, Share2, RotateCcw } from "lucide-react";
import { useSessionAuth } from "@/app/lib/use-session-auth";

export default function HomePage() {
  const router = useRouter();
  const { isSignedIn } = useSessionAuth();

  const [data, setData] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  /* ===============================
     🔥 CORE FETCH (AUTH AWARE)
  =============================== */
  const fetchGithubData = async (username: string, includePrivate = false) => {
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      // NOTE: Using the existing /api/github route (assuming it exists or will be ported)
      // If not, this needs to be implemented. The prompt asked to map logic. 
      // I haven't implemented /api/github in claritycode yet!
      // I should do that next if it's missing.
      const res = await fetch("/api/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          accessToken: includePrivate ? "session" : null, // This logic depends on /api/github implementation
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
    } catch (err: any) {
      setError(err.message || "User not found or GitHub API error");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  /* ===============================
     🤖 AI ANALYSIS
  =============================== */
  const fetchProfileAnalysis = async (githubData: any) => {
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
    const userParam = params.get("user");
    if (userParam) {
      fetchGithubData(userParam, isSignedIn);
    }
  }, []);

  /* ===============================
     🔥 AUTO UPGRADE AFTER LOGIN
  =============================== */
  useEffect(() => {
    if (!data) return;
    if (!isSignedIn) return;
    if (data.fetchedWithAuth) return;

    fetchGithubData(data.profile.username, true);
  }, [isSignedIn]);

  /* ===============================
     🔎 SEARCH
  =============================== */
  const handleSearch = useCallback(
    (username: string) => {
      router.push(`?user=${username}`, { scroll: false });
      fetchGithubData(username, isSignedIn);
    },
    [isSignedIn]
  );

  const handleReset = () => {
    localStorage.removeItem("githubData");
    setData(null);
    setAnalysis(null);
    router.push("/", { scroll: false });
  };

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

          <h1 className="text-5xl font-bold mb-4 text-gray-900 dark:text-white">
            <span className="text-transparent bg-clip-text bg-linear-to-r from-emerald-500 to-blue-600">ClarityCode</span>
          </h1>

          <p className="text-gray-500 dark:text-gray-400 mb-10 text-lg">
            AI-powered GitHub profile analysis with recruiter-grade insights
          </p>

          <SearchBar onSearch={handleSearch} loading={loading} />

          {error && <p className="text-red-500 mt-6 font-medium">{error}</p>}
        </div>
      )}

      {/* ================= RESULTS ================= */}
      {data && (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* 🔥 HEADER */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Profile Analysis
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                Comprehensive GitHub profile evaluation
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSharing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>

              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-lg hover:shadow-emerald-500/30"
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
              { title: "Open PRs", value: data.pullRequests.open, icon: "pullRequests" },
              { title: "Merged PRs", value: data.pullRequests.merged, icon: "pullRequests", color: "purple" },
              { title: "Commits", value: data.recentActivity.commits, icon: "commits", color: "green" },
              {
                title: "Active Repos",
                value: data.recentActivity.activeRepositories,
                icon: "trending",
                color: "orange"
              },
            ]}
          />

          {/* AI ANALYSIS */}
          {aiLoading ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                  <p className="text-gray-500 dark:text-gray-400 animate-pulse">
                    AI Analysis in progress.....
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            analysis && (
              <ProfileAIAnalysis
                analysis={analysis}
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
}
