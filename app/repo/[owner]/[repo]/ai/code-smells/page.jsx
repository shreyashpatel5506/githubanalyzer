"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Layout from "@/app/components/Layout";
import AuthRequiredModal from "@/app/components/AuthRequiredModal";
import NotOwnerModal from "@/app/components/NotOwnerModal";
import { ArrowLeft, Loader2, ExternalLink } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/Card";

/**
 * Code Smells Detail Page
 * Lists all code smells from backend scanning
 * Grouped by severity (High → Medium → Low)
 * Direct GitHub links to exact line numbers
 */
export default function CodeSmellsPage() {
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

        // Fetch scan results
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
        console.error("Init error:", err);
        setError("Failed to load code smells");
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

  // Group smells by severity
  const highSmells =
    scanResults?.smells?.filter((s) => s.severity === "HIGH") || [];
  const mediumSmells =
    scanResults?.smells?.filter((s) => s.severity === "MEDIUM") || [];
  const lowSmells =
    scanResults?.smells?.filter((s) => s.severity === "LOW") || [];

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

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-500 hover:text-black"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <Card>
          <CardContent className="p-6">
            <h1 className="text-2xl font-bold mb-1">Code Smells</h1>
            <p className="text-gray-600">
              {scanResults?.smells?.length || 0} issues found
            </p>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <p className="text-red-800">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* High Severity */}
        {highSmells.length > 0 && (
          <Card className="border-red-200">
            <CardHeader className="bg-red-50">
              <CardTitle className="text-red-700">
                Critical ({highSmells.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {highSmells.map((smell, i) => (
                  <SmellItem key={i} smell={smell} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Medium Severity */}
        {mediumSmells.length > 0 && (
          <Card className="border-orange-200">
            <CardHeader className="bg-orange-50">
              <CardTitle className="text-orange-700">
                Medium ({mediumSmells.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {mediumSmells.map((smell, i) => (
                  <SmellItem key={i} smell={smell} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Low Severity */}
        {lowSmells.length > 0 && (
          <Card className="border-yellow-200">
            <CardHeader className="bg-yellow-50">
              <CardTitle className="text-yellow-700">
                Low ({lowSmells.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {lowSmells.map((smell, i) => (
                  <SmellItem key={i} smell={smell} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No smells found */}
        {scanResults && scanResults.smells?.length === 0 && (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="p-8 text-center">
              <p className="text-emerald-800 font-semibold">
                ✓ No code smells detected! Repository is clean.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

/**
 * Individual smell item component
 */
function SmellItem({ smell }) {
  const severityColor = {
    HIGH: "bg-red-50 border-l-4 border-red-600",
    MEDIUM: "bg-orange-50 border-l-4 border-orange-600",
    LOW: "bg-yellow-50 border-l-4 border-yellow-600",
  };

  const severityBadge = {
    HIGH: "bg-red-100 text-red-800",
    MEDIUM: "bg-orange-100 text-orange-800",
    LOW: "bg-yellow-100 text-yellow-800",
  };

  return (
    <div className={`p-4 ${severityColor[smell.severity]}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`px-2 py-1 rounded text-xs font-semibold ${severityBadge[smell.severity]}`}
            >
              {smell.severity}
            </span>
            <span className="text-sm font-medium text-gray-700">
              {smell.id}
            </span>
          </div>

          <p className="text-gray-800 font-semibold mb-1">{smell.message}</p>
          <p className="text-sm text-gray-600 mb-2">{smell.description}</p>

          <div className="text-xs text-gray-500">
            <span className="font-mono">
              {smell.file}:{smell.line}
            </span>
          </div>
        </div>

        {/* GitHub Link Button */}
        {smell.githubUrl && (
          <a
            href={smell.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors shadow-sm"
            title="View exact line in GitHub"
          >
            <ExternalLink className="w-4 h-4" />
            View in Repo
          </a>
        )}
      </div>
    </div>
  );
}
