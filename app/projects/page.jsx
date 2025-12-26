"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const ProjectsPage = () => {
  const [data, setData] = useState(null);
  const [filteredRepos, setFilteredRepos] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLang, setSelectedLang] = useState("All");
  const router = useRouter();

  /* 🔁 Load data from localStorage */
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedData = localStorage.getItem("githubData");
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          setData(parsed);
          setFilteredRepos(parsed.repos || []);
        } catch (e) {
          console.error("Error parsing localStorage data", e);
          router.push("/");
        }
      } else {
        router.push("/");
      }
    }
  }, [router]);

  /* 🔎 Filter logic */
  useEffect(() => {
    if (!data) return;

    const filtered = data.repos.filter((repo) => {
      const matchesSearch = repo.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesLang =
        selectedLang === "All" || repo.language === selectedLang;
      return matchesSearch && matchesLang;
    });

    setFilteredRepos(filtered);
  }, [searchTerm, selectedLang, data]);

  if (!data) return null;

  const languages = [
    "All",
    ...new Set(data.repos.map((r) => r.language).filter(Boolean)),
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">

        {/* ================= HEADER ================= */}
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold text-indigo-300 tracking-tight">
            Projects
            <span className="text-slate-500 text-2xl font-medium ml-2">
              ({data.repos.length})
            </span>
          </h1>
          <p className="text-slate-400 mt-2 text-lg">
            Browse and analyze all public repositories.
          </p>
        </div>

        {/* ================= FILTER BAR ================= */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search repositories..."
              className="w-full pl-12 pr-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl
                         text-slate-100 placeholder-slate-500
                         focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="absolute left-4 top-3.5 text-slate-500">🔍</span>
          </div>

          <select
            className="px-6 py-3 bg-slate-900/80 border border-slate-700 rounded-xl
                       text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500
                       font-medium"
            onChange={(e) => setSelectedLang(e.target.value)}
          >
            {languages.map((lang) => (
              <option key={lang} value={lang} className="bg-slate-900">
                {lang}
              </option>
            ))}
          </select>
        </div>

        {/* ================= REPO GRID ================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRepos.map((repo) => (
            <div
              key={repo.id}
              onClick={() =>
                router.push(`/repo/${data.profile.username}/${repo.name}`)
              }
              className="group bg-slate-900/80 border border-slate-700
                         rounded-2xl p-6 cursor-pointer
                         hover:border-indigo-500/60
                         hover:shadow-xl hover:shadow-indigo-500/10
                         transition-all flex flex-col h-full relative"
            >
              {/* 📌 PINNED */}
              {repo.isPinned && (
                <div className="absolute top-4 right-4 text-indigo-300 bg-indigo-500/10
                                px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                  📌 Pinned
                </div>
              )}

              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-100
                               group-hover:text-indigo-300 transition-colors
                               mb-2 truncate pr-16">
                  {repo.name}
                </h3>

                <p className="text-slate-400 text-sm line-clamp-3 mb-6 leading-relaxed">
                  {repo.description ||
                    "No description provided for this repository."}
                </p>
              </div>
              {repo.liveDemo && (
                <a
                  href={repo.liveDemo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1
               w-[120px]   /* change to 100px or 150px */
               px-2.5 py-1
               bg-slate-800 text-slate-300
               rounded-lg
               text-xs font-bold mb-2
               hover:bg-indigo-500 hover:text-white
               transition-colors
               shrink-0"
                >
                  🚀 Live Demo
                </a>
              )}




              <div className="mt-auto space-y-4">
                {/* 🧪 TECH TAGS */}
                <div className="flex flex-wrap gap-2">
                  {repo.language && (
                    <span className="px-2.5 py-1 bg-slate-800
                                     text-slate-300 rounded-lg
                                     text-xs font-bold">
                      {repo.language}
                    </span>
                  )}

                  {repo.topics?.slice(0, 8).map((topic) => (
                    <span
                      key={topic}
                      className="px-2.5 py-1 bg-indigo-500/10
                                 text-indigo-300 rounded-lg
                                 text-xs font-medium"
                    >
                      #{topic}
                    </span>
                  ))}
                </div>

                {/* 📊 STATS */}
                <div className="flex items-center justify-between pt-4
                                border-t border-slate-700
                                text-slate-400 text-sm">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      ⭐ {repo.stars}
                    </span>
                    <span className="flex items-center gap-1">
                      🍴 {repo.forks}
                    </span>
                  </div>

                  <span className="text-[11px] font-semibold uppercase opacity-60">
                    Updated{" "}
                    {new Date(repo.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ================= EMPTY STATE ================= */}
        {filteredRepos.length === 0 && (
          <div className="text-center py-20">
            <p className="text-slate-400 text-lg">
              No projects found matching your criteria.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectsPage;
