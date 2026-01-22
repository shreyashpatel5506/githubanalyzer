"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Layout from "@/app/components/Layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/Card";
import {
  ArrowLeft,
  Loader2,
  FileText,
  Copy,
  Github,
} from "lucide-react";

export default function ReadmeGeneratorPage() {
  const params = useParams();
  const router = useRouter();

  const [repoData, setRepoData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [readme, setReadme] = useState("");
  const [error, setError] = useState(null);

  /* ================= LOAD REPO ================= */

  useEffect(() => {
    const saved = localStorage.getItem("githubData");
    if (!saved) return router.push("/");

    const parsed = JSON.parse(saved);
    const repo = parsed.repos?.find((r) => r.name === params.repo);

    if (!repo) return router.push("/projects");

    setRepoData(repo);
  }, [params.repo, router]);

  /* ================= GENERATE README ================= */

  const generateReadme = async () => {
    setLoading(true);
    setError(null);
    setReadme("");

    try {
      const res = await fetch("/api/readme/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: params.owner,
          repo: params.repo,
          commitToRepo: false, // 🔒 Pro++ later
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to generate README");
      }

      setReadme(json.readme);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ================= COPY ================= */

  const copyToClipboard = () => {
    navigator.clipboard.writeText(readme);
  };

  if (!repoData) {
    return (
      <Layout>
        <div className="flex justify-center py-20">Loading…</div>
      </Layout>
    );
  }

  /* ================= RENDER ================= */

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

        {/* Header */}
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-6 h-6 text-emerald-600" />
              <h1 className="text-3xl font-bold">README Generator</h1>
            </div>

            <p className="text-gray-600">
              Generate a clean, accurate README by scanning your repository.
              No guessing. No hallucination.
            </p>

            <div className="mt-6 flex flex-wrap gap-4">
              <button
                onClick={generateReadme}
                disabled={loading}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Generate README
                  </>
                )}
              </button>

              <a
                href={repoData.url}
                target="_blank"
                className="px-4 py-2 border rounded-lg flex items-center gap-2"
              >
                <Github className="w-4 h-4" />
                View Repo
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <Card>
            <CardContent className="p-4 text-red-600">
              {error}
            </CardContent>
          </Card>
        )}

        {/* README OUTPUT */}
        {readme && (
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>Generated README.md</CardTitle>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 text-sm px-3 py-1 border rounded"
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>
            </CardHeader>

            <CardContent>
              <pre className="whitespace-pre-wrap text-sm bg-black p-4 rounded-lg overflow-x-auto">
                {readme}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
