"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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
import {
  ArrowLeft,
  Star,
  GitFork,
  ExternalLink,
  Calendar,
  Code,
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  Loader2,
  Activity,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../../components/Card";
import RepoTechCard from "../../../../components/RepoTechCard";
import RepoCommitAnalytics from "../../../../components/RepoCommitAnalytics";
import Layout from "@/app/components/Layout";


ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

export default function RepoDetailPage() {
  const { repo } = useParams();
  const router = useRouter();

  const [repoData, setRepoData] = useState(null);
  const [scores, setScores] = useState(null);
  const [sections, setSections] = useState(null);
  const [commitWeeks, setCommitWeeks] = useState([]);
  const [loading, setLoading] = useState(true);

  // -------------------------------
  // Fetch commits
  // -------------------------------
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

  // -------------------------------
  // Fetch AI
  // -------------------------------
  const fetchAI = async (repoDetails) => {
    try {
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoDetails }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error || "AI failed");
      }

      const data = await res.json();

      if (!data?.scores) {
        throw new Error("Invalid AI response");
      }

      setScores(data.scores);
      setSections(data.sections);

      localStorage.setItem(
        `analysis-${repoDetails.name}`,
        JSON.stringify(data)
      );
    } catch (err) {
      console.error("AI ERROR:", err.message);
    } finally {
      setLoading(false); // 🔥 SPINNER KILL SWITCH
    }
  };

  // -------------------------------
  // Main loader
  // -------------------------------
  useEffect(() => {
    const init = async () => {
      try {
        const saved = localStorage.getItem("githubData");
        if (!saved) return router.push("/");

        const parsed = JSON.parse(saved);
        const repoDetails = parsed.repos?.find(
          (r) => r.name === repo
        );

        if (!repoDetails) return router.push("/projects");

        setRepoData(repoDetails);
        fetchCommits(repoDetails.name, parsed.profile.username);

        // Tech stack
        const techRes = await fetch(`/api/repo-tech/${repoDetails.name}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: parsed.profile.username }),
        });

        const techJson = await techRes.json();
        setRepoData((prev) => ({
          ...prev,
          tech: Array.isArray(techJson?.tech) ? techJson.tech : [],
        }));

        // Cache check
        const cacheKey = `analysis-${repoDetails.name}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const data = JSON.parse(cached);
          if (data?.scores) {
            setScores(data.scores);
            setSections(data.sections);
            setLoading(false);
            return;
          }
        }

        // Run AI
        fetchAI(repoDetails);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };

    init();
  }, [repo, router]);

  // -------------------------------
  // Loading UI
  // -------------------------------
  if (loading || !repoData) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-600" />
        </div>
      </Layout>
    );
  }

  // -------------------------------
  // Chart
  // -------------------------------
  const chartData = scores && {
    labels: Object.keys(scores),
    datasets: [
      {
        data: Object.values(scores),
        fill: true,
        backgroundColor: "rgba(16,185,129,0.15)",
        borderColor: "#10b981",
      },
    ],
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-500"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Repo Header */}
        <Card>
          <CardContent className="p-8">
            <h1 className="text-3xl font-bold flex gap-2 items-center">
              <Code /> {repoData.name}
            </h1>
            <p className="text-gray-600 mt-2">
              {repoData.description || "No description"}
            </p>
          </CardContent>
        </Card>

        {/* Radar */}
        {scores && (
          <Card>
            <CardHeader>
              <CardTitle className="flex gap-2">
                <TrendingUp /> Project Health Radar
              </CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <Radar data={chartData} />
            </CardContent>
          </Card>
        )}

        {/* Verdict */}
        {sections?.verdict && (
          <Card>
            <CardHeader>
              <CardTitle className="flex gap-2">
                <CheckCircle /> Verdict
              </CardTitle>
            </CardHeader>
            <CardContent>{sections.verdict}</CardContent>
          </Card>
        )}

        <RepoTechCard repo={repoData} />
        <RepoCommitAnalytics weeks={commitWeeks} />
      </div>
    </Layout>
  );
}
