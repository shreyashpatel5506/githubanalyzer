"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Layout from "@/app/components/Layout";
import AuthRequiredModal from "@/app/components/AuthRequiredModal";
import NotOwnerModal from "@/app/components/NotOwnerModal";
import { ArrowLeft, Loader2, ExternalLink, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/Card";

/**
 * Bugs & Reliability Issues Page
 * Filters smells by "reliability" category
 * Shows error handling, async/await issues, exception handling
 */
export default function BugsPage() {
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
        setError("Failed to load bugs data");
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

  // Filter smells by reliability category
  const bugs =
    scanResults?.smells?.filter((s) => s.category === "reliability") || [];

  // Group by severity
  const highBugs = bugs.filter((b) => b.severity === "HIGH") || [];
  const mediumBugs = bugs.filter((b) => b.severity === "MEDIUM") || [];
  const lowBugs = bugs.filter((b) => b.severity === "LOW") || [];

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
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-6 h-6 text-orange-600" />
              <h1 className="text-2xl font-bold">Bugs & Reliability Issues</h1>
            </div>
            <p className="text-gray-600">
              {bugs.length} issues found affecting code reliability
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

        {/* Info Card */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <p className="text-blue-800 text-sm">
              <strong>Reliability Issues</strong> include: async/await without
              try-catch, unhandled promise rejections, missing error handlers,
              and improper exception handling.
            </p>
          </CardContent>
        </Card>

        {/* High Severity Bugs */}
        {highBugs.length > 0 && (
          <Card className="border-red-200">
            <CardHeader className="bg-red-50">
              <CardTitle className="text-red-700">
                Critical Bugs ({highBugs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {highBugs.map((bug, i) => (
                  <BugItem key={i} bug={bug} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Medium Severity Bugs */}
        {mediumBugs.length > 0 && (
          <Card className="border-orange-200">
            <CardHeader className="bg-orange-50">
              <CardTitle className="text-orange-700">
                Medium Bugs ({mediumBugs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {mediumBugs.map((bug, i) => (
                  <BugItem key={i} bug={bug} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Low Severity Bugs */}
        {lowBugs.length > 0 && (
          <Card className="border-yellow-200">
            <CardHeader className="bg-yellow-50">
              <CardTitle className="text-yellow-700">
                Low Bugs ({lowBugs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {lowBugs.map((bug, i) => (
                  <BugItem key={i} bug={bug} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No bugs found */}
        {scanResults && bugs.length === 0 && (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="p-8 text-center">
              <p className="text-emerald-800 font-semibold">
                ✓ No reliability issues found!
              </p>
              <p className="text-emerald-700 text-sm mt-2">
                Your error handling and async patterns are solid.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

/**
 * Individual bug item component
 */
function BugItem({ bug }) {
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
    <div className={`p-4 ${severityColor[bug.severity]}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`px-2 py-1 rounded text-xs font-semibold ${severityBadge[bug.severity]}`}
            >
              {bug.severity}
            </span>
            <span className="text-sm font-medium text-gray-700">{bug.id}</span>
          </div>

          <p className="text-gray-800 font-semibold mb-1">{bug.message}</p>
          <p className="text-sm text-gray-600 mb-2">{bug.description}</p>

          <div className="text-xs text-gray-500">
            <span className="font-mono">
              {bug.file}:{bug.line}
            </span>
          </div>
        </div>

        {bug.githubUrl && (
          <a
            href={bug.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 p-2 hover:bg-white rounded transition-colors"
            title="View on GitHub"
          >
            <ExternalLink className="w-5 h-5 text-blue-600" />
          </a>
        )}
      </div>
    </div>
  );
}
