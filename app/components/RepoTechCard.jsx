"use client";

import { Card, CardContent, CardHeader, CardTitle } from "./Card";
import { Code2, Package } from "lucide-react";

export default function RepoTechCard({ repo }) {
  if (!repo?.tech || repo.tech.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-gray-500" />
            Technology Stack
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              No technology stack data available for this repository.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTechColor = (index) => {
    const colors = [
      "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400",
      "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
      "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400",
      "bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400",
      "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400",
    ];
    return colors[index % colors.length];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code2 className="w-5 h-5 text-emerald-600" />
          Technology Stack
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Technologies and frameworks detected in this repository:
          </p>
          
          <div className="flex flex-wrap gap-3">
            {repo.tech.slice(0, 12).map((tech, index) => (
              <span
                key={`${tech}-${index}`}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${getTechColor(index)}`}
              >
                {tech}
              </span>
            ))}
            
            {repo.tech.length > 12 && (
              <span className="px-3 py-2 text-gray-500 dark:text-gray-400 text-sm">
                +{repo.tech.length - 12} more
              </span>
            )}
          </div>

          {repo.tech.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Total technologies detected:
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {repo.tech.length}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
