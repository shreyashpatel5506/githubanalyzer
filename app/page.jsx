"use client";

import React, { useEffect, useState, useCallback } from "react";
import Layout from "./components/Layout";
import SearchBar from "./components/SearchBar";
import ProfileCard from "./components/ProfileCard";
import ProfileAIAnalysis from "./components/ProfileAIAnalysis";
import { StatsGrid } from "./components/StatsGrid";
import { Card, CardContent } from "./components/Card";
import { exportToPDF } from "./utils/exportToPdf";
import { useRouter } from "next/navigation";
import { Sparkles, Brain, Share2, RotateCcw } from "lucide-react";

const HomePage = () => {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sharing, setSharing] = useState(false);

  /* Load cached data */
  useEffect(() => {
    const stored = localStorage.getItem("githubData");
    if (stored) {
      const parsed = JSON.parse(stored);
      setData(parsed);
      if (parsed.analysis) setAnalysis(parsed.analysis);
    }
  }, []);

  /* Check URL for username param */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userParam = params.get("user");
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

  const handleSearch = useCallback(
    (username) => {
      fetchGithubData(username);
      router.push(`?user=${username}`, { scroll: false });
    },
    [router]
  );

  /* AI Profile Analysis */
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
      window.dispatchEvent(new Event("github-profile-updated"));
    } catch (err) {
      console.error(err);
      setAnalysis({ error: "AI analysis failed. Try again later." });
    } finally {
      setAiLoading(false);
    }
  };

  /* Fetch GitHub Profile */
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
      window.dispatchEvent(new Event("github-profile-updated"));
      fetchProfileAnalysis(result);
    } catch (err) {
      setError("User not found or GitHub API error");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    setSharing(true);
  };

  const handleReset = () => {
    localStorage.removeItem("githubData");
    setData(null);
    setAnalysis(null);
    router.push("/", { scroll: false });
  };

  const handleExportPDF = () => {
    exportToPDF("ai-analysis");
  };

  /* Loading State */
  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">
            Analyzing GitHub profile...
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Hero Section */}
      {!data && (
        <div className="relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-gray-900 dark:to-gray-800"></div>
          <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
          
          <div className="relative max-w-4xl mx-auto px-4 py-20 text-center">
            {/* Hero Content */}
            <div className="mb-12">
              <div className="flex items-center justify-center mb-6">
                <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
              </div>
              
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
                <span className="gradient-text">GitProfile</span> AI
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-4 max-w-3xl mx-auto leading-relaxed">
                Get AI-powered insights into GitHub profiles and coding expertise
              </p>
              
              <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
                Analyze any GitHub profile with recruiter-grade insights, skill assessments, and improvement recommendations
              </p>
            </div>

            {/* Search */}
            <div className="mb-12">
              <SearchBar onSearch={handleSearch} loading={loading} />
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="text-center p-6">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">AI Analysis</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Advanced AI evaluates coding skills, project quality, and hiring readiness
                </p>
              </div>
              
              <div className="text-center p-6">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Instant Insights</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Get comprehensive analysis in seconds with actionable recommendations
                </p>
              </div>
              
              <div className="text-center p-6">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Share2 className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Share Results</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Export and share professional analysis reports with recruiters
                </p>
              </div>
            </div>

            {/* Error State */}
            {error && (
              <Card className="max-w-md mx-auto mt-8 border-red-200 dark:border-red-800">
                <CardContent className="text-center py-6">
                  <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Results Section */}
      {data && (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Profile Analysis
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Comprehensive GitHub profile evaluation
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 
                         text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 
                         dark:hover:bg-gray-700 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white 
                         rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                New Analysis
              </button>
            </div>
          </div>

          {/* Profile Card */}
          <ProfileCard profile={data.profile} onShare={handleShare} />

          {/* Stats Grid */}
          <StatsGrid 
            stats={[
              {
                title: "Open PRs",
                value: data.pullRequests.open,
                icon: "pullRequests",
                color: "blue"
              },
              {
                title: "Merged PRs", 
                value: data.pullRequests.merged,
                icon: "pullRequests",
                color: "green"
              },
              {
                title: "Recent Commits",
                value: data.recentActivity.commits,
                icon: "commits", 
                color: "purple"
              },
              {
                title: "Active Repos",
                value: data.recentActivity.activeRepositories,
                icon: "trending",
                color: "orange"
              }
            ]}
          />

          {/* AI Analysis */}
          {aiLoading ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  AI Analysis in Progress
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Evaluating profile consistency, project quality, and hiring readiness...
                </p>
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

      {/* Share Modal */}
      {sharing && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSharing(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md z-50">
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Share Analysis
                  </h3>
                  <button
                    onClick={() => setSharing(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 
                             p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    ✕
                  </button>
                </div>
                
                <input
                  type="text"
                  readOnly
                  value={typeof window !== "undefined" ? window.location.href : ""}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 
                           dark:border-gray-700 rounded-lg text-gray-900 dark:text-white 
                           focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  onFocus={(e) => e.target.select()}
                />
                
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
                  Copy the link above to share this analysis
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </Layout>
  );
};

export default HomePage;