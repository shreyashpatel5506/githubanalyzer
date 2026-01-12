"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Layout from "../../../components/Layout";
import { Card, CardContent } from "../../../components/Card";
import RepoTechCard from "../../../components/RepoTechCard";
import RepoCommitAnalytics from "../../../components/RepoCommitAnalytics";
import {
  ArrowLeft,
  Star,
  GitFork,
  ExternalLink,
  Calendar,
  Code,
  Activity,
  Brain,
} from "lucide-react";

const RepoDetailPage = () => {
  const params = useParams();
  const router = useRouter();

  const [repoData, setRepoData] = useState(null);
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
        setTimeout(() => fetchCommits(repoName, username), 3000);
        return;
      }

      setCommitWeeks(Array.isArray(json.weeks) ? json.weeks : []);
    } catch {
      setCommitWeeks([]);
    }
  };

  useEffect(() => {
    const loadRepo = async () => {
      const saved = localStorage.getItem("githubData");
      if (!saved) return router.push("/");

      const parsed = JSON.parse(saved);
      const repo = parsed.repos.find((r) => r.name === params.repo);
      if (!repo) return router.push("/projects");

      fetchCommits(repo.name, parsed.profile.username);

      const techRes = await fetch(`/api/repo-tech/${repo.name}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: parsed.profile.username }),
      });

      const techJson = await techRes.json();

      setRepoData({
        ...repo,
        tech: techJson?.tech || [],
      });
    };

    loadRepo();
  }, [params.repo, router]);

  if (!repoData) {
    return (
      <Layout>
        <div className="flex justify-center py-20">Loading repository…</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-500 hover:text-black"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Repo Header */}
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-4">
              <Code className="w-6 h-6 text-emerald-600" />
              <h1 className="text-3xl font-bold">{repoData.name}</h1>
              {repoData.isActive && (
                <span className="flex items-center gap-1 text-emerald-600">
                  <Activity className="w-4 h-4" /> Active
                </span>
              )}
            </div>

            <p className="text-gray-600 mb-6">
              {repoData.description || "No description"}
            </p>

            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" />
                {repoData.stars}
              </div>
              <div className="flex items-center gap-2">
                <GitFork className="w-4 h-4 text-blue-500" />
                {repoData.forks}
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Updated {new Date(repoData.updatedAt).toLocaleDateString()}
              </div>
            </div>

            <div className="flex gap-4">
              {repoData.homepage && (
                <a
                  href={repoData.homepage}
                  target="_blank"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg"
                >
                  <ExternalLink className="inline w-4 h-4 mr-1" />
                  Live Demo
                </a>
              )}

              <button
                onClick={() => router.push(`/repo/${params.repo}/ai`)}
                className="px-4 py-2 border rounded-lg flex items-center gap-2"
              >
                <Brain className="w-4 h-4" />
                Run AI Analysis
              </button>
            </div>
          </CardContent>
        </Card>

        <RepoTechCard repo={repoData} />
        <RepoCommitAnalytics weeks={commitWeeks} />
      </div>
    </Layout>
  );
};

export default RepoDetailPage;
