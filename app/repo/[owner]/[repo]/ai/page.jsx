"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Layout from "../../../../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/Card";
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
  Loader2,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

const RepoAIPage = () => {
  const { repo } = useParams();
  const router = useRouter();

  const [scores, setScores] = useState(null);
  const [sections, setSections] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = localStorage.getItem(`analysis-${repo}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      setScores(parsed.scores);
      setSections(parsed.sections);
      setLoading(false);
      return;
    }

    const runAI = async () => {
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoName: repo }),
      });

      if (res.status === 403) {
        router.push("/login");
        return;
      }

      const data = await res.json();
      setScores(data.scores);
      setSections(data.sections);
      localStorage.setItem(`analysis-${repo}`, JSON.stringify(data));
      setLoading(false);
    };

    runAI();
  }, [repo, router]);

  if (loading || !scores) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
        </div>
      </Layout>
    );
  }

  const labels = Object.keys(scores);
  const values = Object.values(scores);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
        {/* Radar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex gap-2">
              <TrendingUp /> Project Health Radar
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <Radar
              data={{
                labels,
                datasets: [
                  {
                    data: values,
                    fill: true,
                    backgroundColor: "rgba(16,185,129,0.15)",
                    borderColor: "#10b981",
                  },
                ],
              }}
            />
          </CardContent>
        </Card>

        {/* Verdict */}
        <Card>
          <CardHeader>
            <CardTitle className="flex gap-2">
              <CheckCircle /> Verdict
            </CardTitle>
          </CardHeader>
          <CardContent>{sections.verdict}</CardContent>
        </Card>

        {/* Missing */}
        {sections.missing && (
          <Card>
            <CardHeader>
              <CardTitle className="flex gap-2">
                <AlertTriangle /> What’s Missing
              </CardTitle>
            </CardHeader>
            <CardContent>{sections.missing}</CardContent>
          </Card>
        )}

        {/* Fix Plan */}
        {sections.fixPlan && (
          <Card>
            <CardHeader>
              <CardTitle>48-Hour Fix Plan</CardTitle>
            </CardHeader>
            <CardContent>{sections.fixPlan}</CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default RepoAIPage;
