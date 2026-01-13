"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Layout from "@/app/components/Layout";
import AuthRequiredModal from "@/app/components/AuthRequiredModal";

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
  TrendingUp,
  Loader2,
  Star,
  GitFork,
  Code,
  Calendar,
  ExternalLink,
} from "lucide-react";

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
  const { data: session, status } = useSession();

  const [repoData, setRepoData] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    if (status === "loading") return;

    // ❌ Not logged in → open modal, stop execution
    if (!session) {
      setShowLoginModal(true);
      setLoading(false);
      return;
    }

    // ✅ Logged in → proceed as before
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
  }, [repo, router, session, status]);

  /* ---------- LOADING ---------- */
  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
        </div>
      </Layout>
    );
  }

  /* ---------- SAFETY ---------- */
  const scores =
    analysis?.scores && typeof analysis.scores === "object"
      ? analysis.scores
      : {};

  const sections =
    analysis?.sections && typeof analysis.sections === "object"
      ? analysis.sections
      : {};

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
      {/* 🔐 LOGIN MODAL */}
      <AuthRequiredModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />

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
    {sections?.executiveVerdict && (
  <Card>
    <CardHeader>
      <CardTitle>Executive Verdict</CardTitle>
    </CardHeader>
    <CardContent className="text-gray-700 leading-relaxed">
      {sections.executiveVerdict}
    </CardContent>
  </Card>
)}
        {/* GitHub Meta */}
        <Card>
          <CardContent className="p-6 grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              {repoData?.stars ?? 0}
            </div>
            <div className="flex items-center gap-2">
              <GitFork className="w-4 h-4 text-blue-500" />
              {repoData?.forks ?? 0}
            </div>
            {repoData?.language && (
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-emerald-600" />
                {repoData.language}
              </div>
            )}
            {repoData?.updatedAt && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(repoData.updatedAt).toLocaleDateString()}
              </div>
            )}
            {repoData?.url && (
              <a
                href={repoData.url}
                target="_blank"
                className="flex items-center gap-2 text-emerald-600"
              >
                <ExternalLink className="w-4 h-4" />
                GitHub
              </a>
            )}
          </CardContent>
        </Card>

        {/* Scores */}
        {Object.keys(scores).length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(scores).map(([k, v]) => (
              <Card key={k}>
                <CardContent className="p-6 text-center">
                  <div className="text-2xl font-bold">{v}/10</div>
                  <div className="text-sm text-gray-500">
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
        {/* Strengths */}
{sections?.strengths?.length > 0 && (
  <Card>
    <CardHeader>
      <CardTitle>Strengths</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      {sections.strengths.map((item, i) => (
        <div key={i} className="p-3 rounded bg-emerald-50">
          <p className="text-sm text-gray-800">
            {item.description}
          </p>
        </div>
      ))}
    </CardContent>
  </Card>
)}
{/* Critical Gaps */}
{sections?.criticalGaps?.length > 0 && (
  <Card>
    <CardHeader>
      <CardTitle className="text-red-600">
        Critical Gaps Blocking Production
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      {sections.criticalGaps.map((item, i) => (
        <div key={i} className="p-3 rounded bg-red-50">
          <p className="text-sm text-gray-800">
            {item.description}
          </p>
        </div>
      ))}
    </CardContent>
  </Card>
)}

{/* 48 Hour Fix Plan */}
{sections?.fixPlan48h?.length > 0 && (
  <Card>
    <CardHeader>
      <CardTitle>48-Hour Improvement Plan</CardTitle>
    </CardHeader>
    <CardContent className="space-y-2">
      {sections.fixPlan48h
        .filter(item => item.goal)
        .map((item, i) => (
          <div key={i} className="text-sm text-gray-700">
            • {item.goal.replace(/^\*\s*/, "")}
          </div>
        ))}
    </CardContent>
  </Card>
)}

{/* Career Impact */}
{sections?.careerImpact && (
  <Card>
    <CardHeader>
      <CardTitle>Career Impact</CardTitle>
    </CardHeader>
    <CardContent className="text-gray-700 whitespace-pre-line">
      {sections.careerImpact}
    </CardContent>
  </Card>
)}


      </div>
    </Layout>
  );
}
