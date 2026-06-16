"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Layout from "./components/Layout";
import SearchBar from "./components/SearchBar";
import ProfileCard from "./components/ProfileCard";
import ShareModal from "./components/ShareModal";
import { StatsGrid } from "./components/StatsGrid";
import { Card, CardContent } from "./components/Card";
import { useRouter } from "next/navigation";
import { Sparkles, Share2, RotateCcw } from "lucide-react";
import { useSessionAuth } from "@/app/lib/use-session-auth";
// 📦 Lazy-load heavy analysis component (Chart.js, react-chartjs-2)
const ProfileAIAnalysis = dynamic(
  () => import("./components/ProfileAIAnalysis"),
  {
    ssr: false,
    loading: () =>
      _jsx(Card, {
        children: _jsx(CardContent, {
          className: "py-12",
          children: _jsxs("div", {
            className: "flex flex-col items-center justify-center gap-4",
            children: [
              _jsx("div", {
                className:
                  "w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin",
              }),
              _jsx("p", {
                className: "text-gray-500 dark:text-gray-400 animate-pulse",
                children: "Loading analysis visualization...",
              }),
            ],
          }),
        }),
      }),
  },
);
export default function HomePage() {
  var _a;
  const router = useRouter();
  const { isSignedIn } = useSessionAuth();
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
          includePrivate,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      const payload = Object.assign(Object.assign({}, result), {
        fetchedWithAuth: includePrivate,
      });
      setData(payload);
      localStorage.setItem("githubData", JSON.stringify(payload));
      window.dispatchEvent(new Event("github-profile-updated"));
      fetchProfileAnalysis(payload);
    } catch (err) {
      setError(err.message || "User not found or GitHub API error");
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
      const updated = Object.assign(Object.assign({}, githubData), {
        analysis: result.analysis,
      });
      setAnalysis(result.analysis);
      setData(updated);
      localStorage.setItem("githubData", JSON.stringify(updated));
    } catch (_a) {
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
    (username) => {
      router.push(`?user=${username}`, { scroll: false });
      fetchGithubData(username, isSignedIn);
    },
    [isSignedIn],
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
    return _jsx(Layout, {
      children: _jsx("div", {
        className: "flex items-center justify-center min-h-[60vh]",
        children: _jsx("div", {
          className:
            "w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin",
        }),
      }),
    });
  }
  return _jsxs(Layout, {
    children: [
      !data &&
        _jsxs("div", {
          className: "max-w-4xl mx-auto px-4 py-20 text-center",
          children: [
            _jsx("div", {
              className: "flex justify-center mb-6",
              children: _jsx("div", {
                className: "p-3 bg-emerald-600 rounded-2xl",
                children: _jsx(Sparkles, {
                  className: "w-8 h-8 text-white",
                }),
              }),
            }),

            _jsx("h1", {
              className:
                "text-5xl font-bold mb-4 text-gray-900 dark:text-white",
              children: _jsx("span", {
                className:
                  "text-transparent bg-clip-text bg-linear-to-r from-emerald-500 to-blue-600",
                children: "ClarityCode",
              }),
            }),

            _jsx("p", {
              className: "text-gray-500 dark:text-gray-400 mb-10 text-lg",
              children:
                "AI-powered GitHub profile analysis with recruiter-grade insights",
            }),

            _jsx(SearchBar, {
              onSearch: handleSearch,
              loading: loading,
            }),

            error &&
              _jsx("p", {
                className: "text-red-500 mt-6 font-medium",
                children: error,
              }),
          ],
        }),

      data &&
        _jsxs("div", {
          className:
            "max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500",
          children: [
            _jsxs("div", {
              className:
                "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4",
              children: [
                _jsxs("div", {
                  children: [
                    _jsx("h1", {
                      className:
                        "text-2xl font-bold text-gray-900 dark:text-white",
                      children: "Profile Analysis",
                    }),

                    _jsx("p", {
                      className: "text-gray-500 dark:text-gray-400",
                      children: "Comprehensive GitHub profile evaluation",
                    }),
                  ],
                }),

                _jsxs("div", {
                  className: "flex gap-3",
                  children: [
                    _jsxs("button", {
                      onClick: () => setSharing(true),
                      className:
                        "flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors",
                      children: [
                        _jsx(Share2, {
                          className: "w-4 h-4",
                        }),
                        "Share",
                      ],
                    }),

                    _jsxs("button", {
                      onClick: handleReset,
                      className:
                        "flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-lg hover:shadow-emerald-500/30",
                      children: [
                        _jsx(RotateCcw, {
                          className: "w-4 h-4",
                        }),
                        "New Analysis",
                      ],
                    }),
                  ],
                }),
              ],
            }),

            _jsx(ProfileCard, {
              profile: data.profile,
            }),

            _jsx(StatsGrid, {
              stats: [
                {
                  title: "Open PRs",
                  value: data.pullRequests.open,
                  icon: "pullRequests",
                },
                {
                  title: "Merged PRs",
                  value: data.pullRequests.merged,
                  icon: "pullRequests",
                  color: "purple",
                },
                {
                  title: "Commits",
                  value: data.recentActivity.commits,
                  icon: "commits",
                  color: "green",
                },
                {
                  title: "Active Repos",
                  value: data.recentActivity.activeRepositories,
                  icon: "trending",
                  color: "orange",
                },
              ],
            }),

            aiLoading
              ? _jsx(Card, {
                  children: _jsx(CardContent, {
                    className: "text-center py-12",
                    children: _jsxs("div", {
                      className:
                        "flex flex-col items-center justify-center gap-4",
                      children: [
                        _jsx("div", {
                          className:
                            "w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin",
                        }),

                        _jsx("p", {
                          className:
                            "text-gray-500 dark:text-gray-400 animate-pulse",
                          children: "AI Analysis in progress.....",
                        }),
                      ],
                    }),
                  }),
                })
              : analysis &&
                _jsx(ProfileAIAnalysis, {
                  analysis: analysis,
                }),
          ],
        }),

      _jsx(ShareModal, {
        isOpen: sharing,
        onClose: () => setSharing(false),
        profileUrl: typeof window !== "undefined" ? window.location.href : "",
        username:
          ((_a = data?.profile) === null || _a === void 0
            ? void 0
            : _a.username) || "",
      }),
    ],
  });
}
