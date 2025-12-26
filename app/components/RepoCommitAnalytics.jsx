"use client";

export default function RepoCommitAnalytics({ weeks }) {
  if (!weeks || weeks.length === 0) {
    return (
      <div className="text-gray-400 text-sm">
        No commit activity available.
      </div>
    );
  }

  /* ===================== BAR CHART ===================== */
  const last24Weeks = weeks.slice(-24);
  const hasCommits = last24Weeks.some(w => w.total > 0);

  const maxCommits = Math.max(
    ...last24Weeks.map(w => w.total),
    1
  );

  /* ===================== HEATMAP ===================== */
  const last12Weeks = weeks.slice(-12);
  const hasHeatmapData = last12Weeks.some(w =>
    w.days.some(d => d > 0)
  );

  const getColor = (count) => {
    if (count === 0) return "bg-gray-800";
    if (count < 3) return "bg-green-900";
    if (count < 6) return "bg-green-700";
    if (count < 10) return "bg-green-500";
    return "bg-green-400";
  };

  return (
    <div className="space-y-6">

      {/* ================= WEEKLY BAR CHART ================= */}
      {hasCommits ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h3 className="text-lg font-semibold mb-4">
            Weekly Commits (6 Months)
          </h3>

          <div className="overflow-x-auto">
            {/* 👇 FIXED HEIGHT CONTAINER */}
            <div className="flex items-end gap-4 h-40 min-w-[640px]">
              {last24Weeks.map((w, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center justify-end h-full"
                >
                  {/* BAR WRAPPER (IMPORTANT) */}
                  <div className="h-full flex items-end">
                    <div
                      className="w-4 rounded-sm bg-indigo-500/80
                                 hover:bg-indigo-400 transition"
                      style={{
                        height: `${(w.total / maxCommits) * 100}%`,
                        minHeight: w.total > 0 ? "2px" : "0px",
                      }}
                      title={`Week ${i + 1}: ${w.total} commits`}
                    />
                  </div>

                  {/* LABEL */}
                  <span className="mt-1 text-[10px] text-gray-400">
                    W{i + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-3 text-xs text-gray-400">
            Each bar represents total commits in a week
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5
                        text-gray-400 text-sm">
          No commit activity in the last 6 months.
        </div>
      )}

      {/* ================= HEATMAP ================= */}
      {hasHeatmapData ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h3 className="text-lg font-semibold mb-4">
            Commit Heatmap (12 Weeks)
          </h3>

          <div className="overflow-x-auto">
            <div className="flex gap-3 items-start w-fit">
              {/* Day labels */}
              <div className="flex flex-col justify-between
                              text-[10px] text-gray-400 h-[112px]">
                <span>Mon</span>
                <span>Wed</span>
                <span>Fri</span>
                <span>Sun</span>
              </div>

              {/* Heatmap grid */}
              <div
                className="grid gap-1"
                style={{
                  gridTemplateColumns: `repeat(${last12Weeks.length}, 1rem)`
                }}
              >
                {last12Weeks.map((week, wi) =>
                  week.days.map((count, di) => (
                    <div
                      key={`${wi}-${di}`}
                      className={`w-4 h-4 rounded ${getColor(count)}`}
                      title={`${count} commits`}
                      _toggle
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
            <span>Less</span>
            <div className="w-4 h-4 bg-gray-800 rounded" />
            <div className="w-4 h-4 bg-green-900 rounded" />
            <div className="w-4 h-4 bg-green-700 rounded" />
            <div className="w-4 h-4 bg-green-500 rounded" />
            <div className="w-4 h-4 bg-green-400 rounded" />
            <span>More</span>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5
                        text-gray-400 text-sm">
          No recent commit heatmap data.
        </div>
      )}
    </div>
  );
}
