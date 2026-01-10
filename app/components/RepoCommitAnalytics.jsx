"use client";

import { Card, CardContent, CardHeader, CardTitle } from "./Card";
import { GitCommit, Activity, Calendar } from "lucide-react";

export default function RepoCommitAnalytics({ weeks }) {
  if (!weeks || weeks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCommit className="w-5 h-5 text-gray-500" />
            Commit Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              No commit activity data available.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const last24Weeks = weeks.slice(-24);
  const hasCommits = last24Weeks.some(w => w.total > 0);
  const maxCommits = Math.max(...last24Weeks.map(w => w.total), 1);

  const last12Weeks = weeks.slice(-12);
  const hasHeatmapData = last12Weeks.some(w => w.days.some(d => d > 0));

  const getHeatmapColor = (count) => {
    if (count === 0) return "bg-gray-200 dark:bg-gray-800";
    if (count < 3) return "bg-emerald-200 dark:bg-emerald-900/40";
    if (count < 6) return "bg-emerald-400 dark:bg-emerald-700/60";
    if (count < 10) return "bg-emerald-500 dark:bg-emerald-600/80";
    return "bg-emerald-600 dark:bg-emerald-500";
  };

  const totalCommits = last24Weeks.reduce((sum, week) => sum + week.total, 0);
  const avgCommitsPerWeek = Math.round(totalCommits / last24Weeks.length);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {totalCommits}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Commits (6 months)
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {avgCommitsPerWeek}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Avg per Week
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {Math.max(...last24Weeks.map(w => w.total))}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Peak Week
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Bar Chart */}
      {hasCommits ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitCommit className="w-5 h-5 text-emerald-600" />
              Weekly Commit Activity (6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="flex items-end gap-2 h-40 min-w-[600px] px-4">
                {last24Weeks.map((w, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center justify-end h-full flex-1"
                  >
                    <div className="h-full flex items-end w-full">
                      <div
                        className="w-full rounded-t bg-emerald-500 hover:bg-emerald-600 
                                 transition-colors cursor-pointer"
                        style={{
                          height: `${(w.total / maxCommits) * 100}%`,
                          minHeight: w.total > 0 ? "4px" : "2px",
                        }}
                        title={`Week ${i + 1}: ${w.total} commits`}
                      />
                    </div>
                    <span className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {i % 4 === 0 ? `W${i + 1}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Each bar represents total commits in a week. Hover for details.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitCommit className="w-5 h-5 text-gray-500" />
              Weekly Commit Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No commit activity in the last 6 months.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Commit Heatmap */}
      {hasHeatmapData ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              Daily Commit Heatmap (12 Weeks)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="flex gap-4 items-start w-fit">
                {/* Day labels */}
                <div className="flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400 h-28 py-1">
                  <span>Mon</span>
                  <span>Wed</span>
                  <span>Fri</span>
                  <span>Sun</span>
                </div>

                {/* Heatmap grid */}
                <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${last12Weeks.length}, 1rem)` }}>
                  {last12Weeks.map((week, wi) =>
                    week.days.map((count, di) => (
                      <div
                        key={`${wi}-${di}`}
                        className={`w-4 h-4 rounded ${getHeatmapColor(count)} cursor-pointer 
                                  hover:ring-2 hover:ring-emerald-400 transition-all`}
                        title={`${count} commits`}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-2 mt-6 text-xs text-gray-500 dark:text-gray-400">
              <span>Less</span>
              <div className="w-3 h-3 bg-gray-200 dark:bg-gray-800 rounded" />
              <div className="w-3 h-3 bg-emerald-200 dark:bg-emerald-900/40 rounded" />
              <div className="w-3 h-3 bg-emerald-400 dark:bg-emerald-700/60 rounded" />
              <div className="w-3 h-3 bg-emerald-500 dark:bg-emerald-600/80 rounded" />
              <div className="w-3 h-3 bg-emerald-600 dark:bg-emerald-500 rounded" />
              <span>More</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-gray-500" />
              Daily Commit Heatmap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No recent commit heatmap data available.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
