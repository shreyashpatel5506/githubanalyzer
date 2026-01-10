"use client";

import { Card, CardContent } from "./Card";
import { TrendingUp, GitPullRequest, GitCommit, Star } from "lucide-react";

const iconMap = {
  commits: GitCommit,
  pullRequests: GitPullRequest,
  stars: Star,
  trending: TrendingUp,
};

const colorMap = {
  blue: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
  green: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20",
  purple: "text-purple-600 bg-purple-50 dark:bg-purple-900/20",
  orange: "text-orange-600 bg-orange-50 dark:bg-orange-900/20",
};

export function StatCard({ title, value, icon, color = "blue", change, changeType }) {
  const IconComponent = iconMap[icon] || TrendingUp;
  const colorClass = colorMap[color];

  return (
    <Card hover className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {change && (
            <p className={`text-xs mt-1 ${changeType === 'positive' ? 'text-emerald-600' : 'text-red-600'}`}>
              {changeType === 'positive' ? '+' : ''}{change}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClass}`}>
          <IconComponent className="w-6 h-6" />
        </div>
      </div>
    </Card>
  );
}

export function StatsGrid({ stats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
}