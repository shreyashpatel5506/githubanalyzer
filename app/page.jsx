"use client";

import React, { useState, useEffect } from "react";
import SearchBar from "./components/SearchBar";

const HomePage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ✅ Read from localStorage on load
  useEffect(() => {
    const stored = localStorage.getItem("githubData");
    if (stored) {
      setData(JSON.parse(stored));
    }
  }, []);

  const fetchGithubData = async (username) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "API Error");
      }

      setData(result);
      localStorage.setItem("githubData", JSON.stringify(result));
    } catch (err) {
      setError("User not found or API error");
    } finally {
      setLoading(false);
    }
  };

  // ⏳ Loading
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="text-gray-400">Analyzing GitHub Profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-6xl mx-auto px-4 pt-10">

        {/* 🔎 SEARCH VIEW */}
        {!data && (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <h1 className="text-5xl font-extrabold text-white mb-4">
              GitProfile AI
            </h1>

            <p className="text-gray-400 mb-8 max-w-md">
              Enter a GitHub username to get a professional AI-powered analysis.
            </p>

            <div className="w-full max-w-md">
              <SearchBar onSearch={fetchGithubData} />
            </div>

            {error && (
              <p className="mt-4 text-red-500 bg-red-100 px-4 py-2 rounded-lg">
                {error}
              </p>
            )}
          </div>
        )}

        {/* 📊 RESULT VIEW */}
        {data && (
          <div className="space-y-10 animate-in fade-in duration-700">

            {/* 🧑 PROFILE CARD */}
            <section className="bg-white rounded-3xl p-8 border flex flex-col md:flex-row gap-8 items-center md:items-start">
              <img
                src={data.profile.avatarUrl}
                alt="avatar"
                className="w-36 h-36 rounded-3xl border-4 border-white shadow"
              />

              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold text-gray-900">
                  {data.profile.name || data.profile.username}
                </h1>
                <p className="text-gray-500 mb-3">
                  @{data.profile.username}
                </p>
                <p className="text-gray-600 mb-6">
                  {data.profile.bio || "No bio available"}
                </p>

                <div className="flex gap-4 justify-center md:justify-start">
                  <MiniStat label="Followers" value={data.profile.followers} />
                  <MiniStat label="Following" value={data.profile.following} />
                  <MiniStat label="Repos" value={data.profile.publicRepos} />
                </div>
              </div>
            </section>

            {/* 🔥 YE HI THA BEECH WALA (PR / COMMITS STATS) */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Open PRs"
                value={data.pullRequests.open}
                color="blue"
              />
              <StatCard
                title="Merged PRs"
                value={data.pullRequests.merged}
                color="green"
              />
              <StatCard
                title="Recent Commits"
                value={data.recentActivity.commits}
                color="purple"
              />
              <StatCard
                title="Active Repos"
                value={data.recentActivity.activeRepositories}
                color="orange"
              />
            </section>

            {/* 📁 PROJECTS */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-6">
                Featured Projects
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data.repos.slice(0, 6).map((repo) => (
                  <div
                    key={repo.id}
                    onClick={() => window.open(repo.url, "_blank")}
                    className="bg-white p-6 rounded-2xl border hover:shadow-lg cursor-pointer"
                  >
                    <h3 className="font-bold text-lg mb-2">{repo.name}</h3>
                    <p className="text-gray-500 text-sm mb-4">
                      {repo.description || "No description available"}
                    </p>

                    <div className="flex justify-between text-sm text-gray-400">
                      <span>⭐ {repo.stars}</span>
                      <span>🍴 {repo.forks}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 🔁 CLEAR */}
            <div className="text-center">
              <button
                onClick={() => {
                  localStorage.removeItem("githubData");
                  setData(null);
                }}
                className="bg-red-600 text-white px-6 py-3 rounded-full font-bold"
              >
                Analyze Another User
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

/* ---------- COMPONENTS ---------- */

const MiniStat = ({ label, value }) => (
  <div className="bg-gray-100 px-4 py-3 rounded-xl text-center">
    <p className="text-xl font-bold text-gray-900">{value}</p>
    <p className="text-sm text-gray-500">{label}</p>
  </div>
);

const StatCard = ({ title, value, color }) => {
  const colors = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
    orange: "bg-orange-50 text-orange-700 border-orange-100",
  };

  return (
    <div
      className={`p-6 rounded-2xl border-2 ${colors[color]} hover:scale-[1.02] transition`}
    >
      <h3 className="text-sm font-bold uppercase opacity-70 mb-1">
        {title}
      </h3>
      <p className="text-4xl font-black">{value}</p>
    </div>
  );
};

export default HomePage;
