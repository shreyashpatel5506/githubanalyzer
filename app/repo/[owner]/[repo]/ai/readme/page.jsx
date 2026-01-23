"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Layout from "@/app/components/Layout";
import AuthRequiredModal from "@/app/components/AuthRequiredModal";
import NotOwnerModal from "@/app/components/NotOwnerModal";
import {
  ArrowLeft,
  Loader2,
  Copy,
  Download,
  RefreshCw,
  FileText,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/Card";

/**
 * README Generator Page
 * Displays AI-generated README from scanning results
 * Shows scan-driven content + features + tech stack
 * Actions: copy, download, regenerate
 */
export default function ReadmePage() {
  const { owner, repo } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [repoData, setRepoData] = useState(null);
  const [readmeContent, setReadmeContent] = useState(null);
  const [scanResults, setScanResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showNotOwnerModal, setShowNotOwnerModal] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

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

        // Fetch README from backend
        await fetchReadme(targetUsername, repoDetails.name);
      } catch (err) {
        console.error("Init error:", err);
        setError("Failed to load README");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [repo, router, session, status]);

  const fetchReadme = async (username, repoName) => {
    try {
      setError(null);

      // Fetch README generation
      const readmeRes = await fetch("/api/readme/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: username,
          repo: repoName,
          planTier: session?.user?.plan || "free",
        }),
      });

      if (!readmeRes.ok) {
        setError("Failed to generate README");
        return;
      }

      const readmeData = await readmeRes.json();
      if (readmeData.success) {
        setReadmeContent(readmeData.data.markdown);
        setScanResults(readmeData.data.scan);
      } else {
        setError(readmeData.error || "README generation failed");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to fetch README");
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    await fetchReadme(repoData.owner || owner, repo);
    setRegenerating(false);
  };

  const handleCopy = () => {
    if (readmeContent) {
      navigator.clipboard.writeText(readmeContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (readmeContent) {
      const element = document.createElement("a");
      element.setAttribute(
        "href",
        "data:text/plain;charset=utf-8," + encodeURIComponent(readmeContent),
      );
      element.setAttribute("download", "README.md");
      element.style.display = "none";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

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
              <FileText className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-bold">README Generator</h1>
            </div>
            <p className="text-gray-600">
              AI-generated README based on scanned repository
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

        {/* Scan Info */}
        {scanResults && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <p className="text-blue-800 text-sm">
                <strong>Generated from:</strong> {scanResults.filesAnalyzed}{" "}
                files analyzed • {scanResults.totalSmells} issues detected •{" "}
                {scanResults.featuresDetected || 0} features identified
              </p>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Copy className="w-4 h-4" />
            {copied ? "Copied!" : "Copy to Clipboard"}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${regenerating ? "animate-spin" : ""}`}
            />
            {regenerating ? "Regenerating..." : "Regenerate"}
          </button>
        </div>

        {/* README Preview */}
        {readmeContent && (
          <Card>
            <CardHeader>
              <CardTitle>README.md Preview</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="prose prose-sm max-w-none bg-gray-50 p-6 rounded border border-gray-200 overflow-auto max-h-96">
                <MarkdownPreview content={readmeContent} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* No README */}
        {!readmeContent && !loading && (
          <Card className="border-gray-200 bg-gray-50">
            <CardContent className="p-8 text-center">
              <p className="text-gray-700">
                No README generated yet. Click "Regenerate" to create one.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

/**
 * Simple Markdown preview component
 * Renders basic markdown formatting
 */
function MarkdownPreview({ content }) {
  const lines = content.split("\n");
  return (
    <div className="text-sm text-gray-800 space-y-2 font-mono">
      {lines.map((line, i) => {
        if (line.startsWith("# ")) {
          return (
            <h1 key={i} className="text-xl font-bold mt-4 mb-2">
              {line.replace("# ", "")}
            </h1>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h2 key={i} className="text-lg font-bold mt-3 mb-1">
              {line.replace("## ", "")}
            </h2>
          );
        }
        if (line.startsWith("### ")) {
          return (
            <h3 key={i} className="font-bold text-base mt-2 mb-1">
              {line.replace("### ", "")}
            </h3>
          );
        }
        if (line.startsWith("- ")) {
          return (
            <div key={i} className="ml-4">
              • {line.replace("- ", "")}
            </div>
          );
        }
        if (line.startsWith("* ")) {
          return (
            <div key={i} className="ml-4">
              • {line.replace("* ", "")}
            </div>
          );
        }
        if (line.trim() === "") {
          return <div key={i}>&nbsp;</div>;
        }
        return <div key={i}>{line}</div>;
      })}
    </div>
  );
}
