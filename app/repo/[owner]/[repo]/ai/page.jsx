"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Layout from "@/app/components/Layout";
import AuthRequiredModal from "@/app/components/AuthRequiredModal";
import NotOwnerModal from "@/app/components/NotOwnerModal";
import {
  ArrowLeft,
  Code,
  AlertTriangle,
  Lock,
  FileText,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/Card";

/**
 * Deep Analysis Dashboard
 * Navigation hub for repo-level AI analysis
 *
 * Shows real counts from backend scanning APIs
 * Routes to sub-pages for detailed analysis
 */
export default function DeepAnalysisDashboard() {
  const { owner, repo } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [repoData, setRepoData] = useState(null);
  const [scanResults, setScanResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showNotOwnerModal, setShowNotOwnerModal] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        // Rehydrate from localStorage
        const saved = localStorage.getItem("githubData");
        if (!saved) {
          router.push("/");
          return;
        }

        const parsed = JSON.parse(saved);
        const repoDetails = parsed?.repos?.find((r) => r.name === repo);
        const targetUsername = parsed?.profile?.username;

        if (!repoDetails || !targetUsername) {
          router.push("/");
          return;
        }

        setRepoData(repoDetails);

        // Gating logic
        if (status === "loading") return;

        if (!session) {
          setShowLoginModal(true);
          setLoading(false);
          return;
        }

        const loggedInUsername = session.user.username?.toLowerCase();
        const searchedLower = targetUsername.toLowerCase();

        if (loggedInUsername !== searchedLower) {
          setShowNotOwnerModal(true);
          setLoading(false);
          return;
        }

        // Fetch scan results from backend
        const scanRes = await fetch("/api/smells/detect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            owner: targetUsername,
            repo: repoDetails.name,
            planTier: session.user.plan || "free",
          }),
        });

        if (!scanRes.ok) {
          setError("Failed to fetch scan results");
          setLoading(false);
          return;
        }

        const scanData = await scanRes.json();
        if (scanData.success) {
          setScanResults(scanData.data);
        } else {
          setError(scanData.error || "Scan failed");
        }
      } catch (err) {
        console.error("Dashboard init error:", err);
        setError("Failed to load analysis dashboard");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [repo, router, session, status]);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <AuthRequiredModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
      <NotOwnerModal
        open={showNotOwnerModal}
        onClose={() => setShowNotOwnerModal(false)}
      />

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-500 hover:text-black"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Header */}
        <Card>
          <CardContent className="p-8">
            <h1 className="text-3xl font-bold mb-2">{repoData?.name}</h1>
            <p className="text-gray-600">
              {repoData?.description || "No description"}
            </p>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <p className="text-red-800">{error}</p>
            </CardContent>
          </Card>
        )}
        {/* Analysis Cards Grid */}
        {scanResults && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Code Smells Card */}
            <AnalysisCard
              title="Code Smells"
              icon={<Code className="w-6 h-6" />}
              count={scanResults.statistics?.totalSmells || 0}
              breakdown={[
                {
                  label: "High",
                  value: scanResults.statistics?.smellsBySeverity?.high || 0,
                  color: "text-red-600",
                },
                {
                  label: "Medium",
                  value: scanResults.statistics?.smellsBySeverity?.medium || 0,
                  color: "text-orange-600",
                },
                {
                  label: "Low",
                  value: scanResults.statistics?.smellsBySeverity?.low || 0,
                  color: "text-yellow-600",
                },
              ]}
              onClick={() =>
                router.push(`/repo/${owner}/${repo}/ai/code-smells`)
              }
            />

            {/* Bugs & Reliability Card */}
            <AnalysisCard
              title="Bugs & Reliability"
              icon={<AlertTriangle className="w-6 h-6" />}
              count={
                scanResults.smells?.filter((s) => s.category === "reliability")
                  .length || 0
              }
              breakdown={[
                {
                  label: "Async Issues",
                  value:
                    scanResults.smells?.filter(
                      (s) => s.id === "ASYNC_NO_TRY_CATCH",
                    ).length || 0,
                  color: "text-red-600",
                },
                {
                  label: "Error Handling",
                  value:
                    scanResults.smells?.filter(
                      (s) => s.category === "reliability",
                    ).length || 0,
                  color: "text-orange-600",
                },
              ]}
              onClick={() => router.push(`/repo/${owner}/${repo}/ai/bugs`)}
            />

            {/* Security & Performance Card */}
            <AnalysisCard
              title="Security & Performance"
              icon={<Lock className="w-6 h-6" />}
              count={
                scanResults.smells?.filter((s) =>
                  ["security", "performance"].includes(s.category),
                ).length || 0
              }
              breakdown={[
                {
                  label: "Security",
                  value:
                    scanResults.smells?.filter((s) => s.category === "security")
                      .length || 0,
                  color: "text-red-600",
                },
                {
                  label: "Performance",
                  value:
                    scanResults.smells?.filter(
                      (s) => s.category === "performance",
                    ).length || 0,
                  color: "text-orange-600",
                },
              ]}
              onClick={() => router.push(`/repo/${owner}/${repo}/ai/security`)}
            />

            {/* README Generator Card */}
            <AnalysisCard
              title="README Generator"
              icon={<FileText className="w-6 h-6" />}
              count={scanResults.statistics?.filesAnalyzed || 0}
              subtitle="files analyzed"
              onClick={() => router.push(`/repo/${owner}/${repo}/ai/readme`)}
            />
          </div>
        )}

        {/* Health Score Summary */}
        {scanResults?.statistics && (
          <Card>
            <CardHeader>
              <CardTitle>Scan Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600">
                  {scanResults.statistics.filesAnalyzed}
                </div>
                <div className="text-sm text-gray-500">Files Analyzed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {scanResults.statistics.totalSmells}
                </div>
                <div className="text-sm text-gray-500">Total Issues</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {scanResults.statistics.smellsBySeverity?.high || 0}
                </div>
                <div className="text-sm text-gray-500">Critical</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {scanResults.statistics.averageComplexity || 0}
                </div>
                <div className="text-sm text-gray-500">Avg Complexity</div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

function AnalysisCard({ title, icon, count, subtitle, breakdown, onClick }) {
  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-2 bg-gray-100 rounded-lg">{icon}</div>
          <div>
            <h3 className="font-semibold text-lg">{title}</h3>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        </div>

        <div className="text-3xl font-bold mb-4">{count}</div>

        {breakdown && (
          <div className="space-y-2">
            {breakdown.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.label}</span>
                <span className={`font-semibold ${item.color}`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 text-emerald-600 text-sm font-semibold">
          View Details →
        </div>
      </CardContent>
    </Card>
  );
}
