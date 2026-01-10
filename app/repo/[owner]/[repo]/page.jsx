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
import Layout from "../../../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/Card";
import RepoTechCard from "../../../components/RepoTechCard";
import RepoCommitAnalytics from "../../../components/RepoCommitAnalytics";
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
  Activity
} from "lucide-react";

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
        setTimeout(() => fetchCommits(repoName, username), 3000);
        return;
      }

      setCommitWeeks(Array.isArray(json.weeks) ? json.weeks : []);
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
        const allRepos = Array.isArray(parsed?.repos) ? parsed.repos : [];
        const repo = allRepos.find((r) => r.name === params.repo);

        if (!repo) {
          router.push("/projects");
          return;
        }

        fetchCommits(repo.name, parsed.profile.username);

        // Fetch tech stack
        const res = await fetch(`/api/repo-tech/${repo.name}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: parsed.profile.username,
          }),
        });

        const json = await res.json();
        setRepoData({
          ...repo,
          tech: Array.isArray(json?.tech) ? json.tech : [],
        });

        // Check for cached AI analysis
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
  }, [params.repo, router]);

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

      localStorage.setItem(`analysis-${repo.name}`, JSON.stringify(data));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !scores || !sections) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              AI is analyzing {params.repo}...
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  const scoreEntries = Object.entries(scores);
  const weakest = scoreEntries.reduce((a, b) => (a[1] < b[1] ? a : b));

  const getScoreColor = (score) => {
    if (score >= 8) return "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20";
    if (score >= 6) return "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20";
    return "text-red-600 bg-red-50 dark:bg-red-900/20";
  };

  const getScoreIcon = (score) => {
    if (score >= 8) return CheckCircle;
    if (score >= 6) return AlertTriangle;
    return AlertTriangle;
  };

  const chartData = {
    labels: scoreEntries.map(([k]) => k.charAt(0).toUpperCase() + k.slice(1)),
    datasets: [
      {
        data: scoreEntries.map(([, v]) => v),
        fill: true,
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        borderColor: "#10b981",
        borderWidth: 2,
        pointBackgroundColor: "#10b981",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        min: 0,
        max: 10,
        ticks: {
          stepSize: 2,
          color: "#9ca3af",
          backdropColor: "transparent",
        },
        grid: {
          color: "rgba(156, 163, 175, 0.2)",
        },
        angleLines: {
          color: "rgba(156, 163, 175, 0.3)",
        },
        pointLabels: {
          color: "#6b7280",
          font: { size: 12, weight: "500" },
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        borderColor: "#10b981",
        borderWidth: 1,
      },
    },
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 
                     hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>

        {/* Repository Header */}
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col lg:flex-row lg:items-start gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg">
                    <Code className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {repoData.name}
                  </h1>
                  {repoData.isActive && (
                    <div className="flex items-center gap-1 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/20 
                                  text-emerald-700 dark:text-emerald-400 rounded-full text-sm font-medium">
                      <Activity className="w-3 h-3" />
                      Active
                    </div>
                  )}
                </div>

                <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed mb-6">
                  {repoData.description || "No description provided"}
                </p>

                {/* Stats */}
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="font-medium">{repoData.stars}</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <GitFork className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">{repoData.forks}</span>
                  </div>
                  {repoData.language && (
                    <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <span className="font-medium">{repoData.language}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">Updated {formatDate(repoData.updatedAt)}</span>
                  </div>
                </div>

                {/* Links */}
                {repoData.homepage && (
                  <a
                    href={repoData.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white 
                             rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Live Demo
                  </a>
                )}
              </div>
            </div>

            {/* Topics */}
            {repoData.topics && repoData.topics.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap gap-2">
                  {repoData.topics.slice(0, 10).map((topic) => (
                    <span
                      key={topic}
                      className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 
                               rounded-full text-sm font-medium"
                    >
                      #{topic}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Health Scores Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {scoreEntries.map(([key, value]) => {
            const ScoreIcon = getScoreIcon(value);
            const isWeakest = key === weakest[0];
            
            return (
              <Card key={key} className={isWeakest ? "border-red-200 dark:border-red-800" : ""}>
                <CardContent className="p-6 text-center">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg mb-3 ${getScoreColor(value)}`}>
                    <ScoreIcon className="w-6 h-6" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {value}/10
                  </div>
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                  {isWeakest && (
                    <div className="text-xs text-red-600 dark:text-red-400 font-medium mt-2">
                      Needs Attention
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Health Radar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              Project Health Radar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <Radar data={chartData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        {/* Tech Stack */}
        <RepoTechCard
          repo={{
            ...repoData,
            tech: repoData.tech || [],
          }}
        />

        {/* Commit Analytics */}
        <RepoCommitAnalytics weeks={commitWeeks} />

        {/* AI Analysis Sections */}
        <div className="grid gap-6">
          {/* Overall Verdict */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                Overall Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {sections.verdict || "No assessment available"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* What's Missing */}
          {sections.missing && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Areas for Improvement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose dark:prose-invert max-w-none">
                  <div 
                    className="text-gray-700 dark:text-gray-300"
                    dangerouslySetInnerHTML={{ __html: sections.missing.replace(/\n/g, '<br>') }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Fix Plan */}
          {sections.fixPlan && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  48-Hour Improvement Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose dark:prose-invert max-w-none">
                  <div 
                    className="text-gray-700 dark:text-gray-300"
                    dangerouslySetInnerHTML={{ __html: sections.fixPlan.replace(/\n/g, '<br>') }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Career Impact */}
          {sections.career && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-purple-500" />
                  Career Impact Advice
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose dark:prose-invert max-w-none">
                  <div 
                    className="text-gray-700 dark:text-gray-300"
                    dangerouslySetInnerHTML={{ __html: sections.career.replace(/\n/g, '<br>') }}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default RepoDetailPage;