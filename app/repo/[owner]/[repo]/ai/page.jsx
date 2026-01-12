"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Layout from "@/app/components/Layout";
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
import { ArrowLeft, TrendingUp, Loader2 } from "lucide-react";
import { Star, GitFork, Code, Calendar, ExternalLink } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/Card";

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
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const saved = localStorage.getItem("githubData");
        if (!saved) return router.push("/");

        const parsed = JSON.parse(saved);
        const repoDetails = parsed?.repos?.find((r) => r.name === repo);
        if (!repoDetails) return router.push("/projects");

        setRepoData(repoDetails);

        const cacheKey = `analysis-${repoDetails.name}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          setAnalysis(JSON.parse(cached));
          setLoading(false);
          return;
        }

        const res = await fetch("/api/analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repoDetails }),
        });

        const data = await res.json();
        setAnalysis(data);
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch (err) {
        console.error("Analysis load failed", err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [repo, router]);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
        </div>
      </Layout>
    );
  }

  /* ---------- HARD SAFETY ---------- */
  const scores =
    analysis?.scores && typeof analysis.scores === "object"
      ? analysis.scores
      : {};

  const sections =
    analysis?.sections && typeof analysis.sections === "object"
      ? analysis.sections
      : {};

  /* ---------- RADAR ---------- */
  const radarData =
    Object.keys(scores).length > 0
      ? {
          labels: Object.keys(scores).map((k) =>
            k.replace(/([A-Z])/g, " $1")
          ),
          datasets: [
            {
              data: Object.values(scores),
              fill: true,
              backgroundColor: "rgba(16,185,129,0.15)",
              borderColor: "#10b981",
            },
          ],
        }
      : null;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-500"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Header */}
        <Card>
          <CardContent className="p-8">
            <h1 className="text-3xl font-bold">{repoData?.name}</h1>
            <p className="text-gray-600 mt-2">
              {repoData?.description || "No description"}
            </p>
          </CardContent>
        </Card>
{/* GitHub Meta Info */}
<Card>
  <CardContent className="p-6">
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">

      {/* Stars */}
      <div className="flex items-center gap-2 text-gray-700">
        <Star className="w-4 h-4 text-yellow-500" />
        <span className="font-medium">{repoData?.stars ?? 0}</span>
        <span className="text-sm text-gray-500">Stars</span>
      </div>

      {/* Forks */}
      <div className="flex items-center gap-2 text-gray-700">
        <GitFork className="w-4 h-4 text-blue-500" />
        <span className="font-medium">{repoData?.forks ?? 0}</span>
        <span className="text-sm text-gray-500">Forks</span>
      </div>

      {/* Language */}
      {repoData?.language && (
        <div className="flex items-center gap-2 text-gray-700">
          <Code className="w-4 h-4 text-emerald-600" />
          <span className="font-medium">{repoData.language}</span>
        </div>
      )}

      {/* Updated At */}
      {repoData?.updatedAt && (
        <div className="flex items-center gap-2 text-gray-700">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-sm">
            Updated{" "}
            {new Date(repoData.updatedAt).toLocaleDateString()}
          </span>
        </div>
      )}

      {/* GitHub Link */}
      {repoData?.url && (
        <a
          href={repoData.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-emerald-600 font-medium hover:underline"
        >
          <ExternalLink className="w-4 h-4" />
          GitHub
        </a>
      )}
    </div>
  </CardContent>
</Card>

        {/* Scores */}
        {Object.keys(scores).length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(scores).map(([k, v]) => (
              <Card key={k}>
                <CardContent className="p-6 text-center">
                  <div className="text-2xl font-bold">{v}/10</div>
                  <div className="text-sm text-gray-500 capitalize">
                    {k.replace(/([A-Z])/g, " $1")}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Radar */}
        {radarData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex gap-2">
                <TrendingUp /> Project Health
              </CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <Radar data={radarData} />
            </CardContent>
          </Card>
        )}

        {/* Executive Verdict */}
        {sections.executiveVerdict && (
          <Card>
            <CardHeader>
              <CardTitle>Executive Verdict</CardTitle>
            </CardHeader>
            <CardContent className="whitespace-pre-line">
              {sections.executiveVerdict}
            </CardContent>
          </Card>
        )}

        {/* Strengths */}
        {Array.isArray(sections.strengths) &&
          sections.strengths.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Strengths to Keep</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {sections.strengths.map((s, i) => (
                  <div key={i}>
                    <h4 className="font-semibold">{s.title}</h4>
                    <p className="text-gray-600">{s.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

        {/* Critical Gaps */}
        {Array.isArray(sections.criticalGaps) &&
          sections.criticalGaps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Critical Gaps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {sections.criticalGaps.map((g, i) => (
                  <div key={i}>
                    <h4 className="font-semibold">{g.title}</h4>
                    <p className="text-gray-600">{g.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

        {/* 48h Plan */}
        {Array.isArray(sections.fixPlan48h) &&
          sections.fixPlan48h.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>48-Hour Execution Plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {sections.fixPlan48h.map((p, i) => (
                  <div key={i}>
                    <h4 className="font-semibold text-emerald-600">
                      {p.phase} — {p.goal}
                    </h4>
                    {Array.isArray(p.deliverables) &&
                      p.deliverables.length > 0 && (
                        <ul className="list-disc pl-6 text-gray-600">
                          {p.deliverables.map((d, j) => (
                            <li key={j}>{d}</li>
                          ))}
                        </ul>
                      )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

        {/* Career Impact */}
        {sections.careerImpact && (
          <Card>
            <CardHeader>
              <CardTitle>Career Impact</CardTitle>
            </CardHeader>
            <CardContent className="whitespace-pre-line">
              {sections.careerImpact}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
