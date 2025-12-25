"use client";

export default function RepoCommitAnalytics({ weeks }) {
  if (!weeks || weeks.length === 0) {
    return (
      <div className="text-gray-400 text-sm">
        No commit activity available.
      </div>
    );
  }

  /* ---------- BAR CHART ---------- */
  const last24Weeks = weeks.slice(-24);
  const maxCommits = Math.max(
    ...last24Weeks.map((w) => w.total),
    1
  );

  /* ---------- HEATMAP ---------- */
  const heatmap = weeks.flatMap((w) => w.days);

  const getColor = (count) => {
    if (count === 0) return "bg-gray-800";
    if (count < 3) return "bg-green-900";
    if (count < 6) return "bg-green-700";
    if (count < 10) return "bg-green-500";
    return "bg-green-400";
  };

  return (
    <div className="space-y-6">
      {/* ===== BAR CHART ===== */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-5">
        <h3 className="text-lg font-semibold mb-4">
          Weekly Commits (6 Months)
        </h3>

        <div className="flex items-end gap-1 h-32">
          {last24Weeks.map((w, i) => (
            <div
              key={i}
              className="w-2 bg-indigo-500/80 rounded-sm"
              style={{
                height: `${(w.total / maxCommits) * 100}%`,
              }}
              title={`${w.total} commits`}
            />
          ))}
        </div>
      </div>

      {/* ===== HEATMAP ===== */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-5">
        <h3 className="text-lg font-semibold mb-4">
          Commit Heatmap (12 Weeks)
        </h3>

        <div className="grid grid-cols-7 gap-1 w-fit">
          {heatmap.map((count, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded ${getColor(count)}`}
              title={`${count} commits`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
