import { Octokit } from 'octokit';

type CommitActivityWeek = { week?: number; total?: number };

export interface CommitPoint {
  period: string;
  count: number;
}

export interface CommitContributor {
  author: string;
  commits: number;
}

export interface CommitAnalyticsResult {
  weekly: Array<{ date: string; count: number }>;
  monthly: CommitPoint[];
  yearly: CommitPoint[];
  contributors: CommitContributor[];
  totalCommitsLastYear: number;
}

function toMonthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function aggregateByPeriod(points: Array<{ date: Date; count: number }>, mode: 'monthly' | 'yearly'): CommitPoint[] {
  const map = new Map<string, number>();

  for (const point of points) {
    const key = mode === 'monthly' ? toMonthKey(point.date) : String(point.date.getUTCFullYear());
    map.set(key, (map.get(key) || 0) + point.count);
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, count]) => ({ period, count }));
}

export async function getCommitAnalytics(octokit: Octokit, owner: string, repo: string): Promise<CommitAnalyticsResult> {
  const fallback: CommitAnalyticsResult = {
    weekly: [],
    monthly: [],
    yearly: [],
    contributors: [],
    totalCommitsLastYear: 0,
  };

  try {
    const commitActivity = await octokit.rest.repos
      .getCommitActivityStats({ owner, repo })
      .catch(() => ({ data: [] as CommitActivityWeek[] }));

    const weekly = Array.isArray(commitActivity.data)
      ? commitActivity.data
          .filter((w: CommitActivityWeek) => Number(w?.total || 0) > 0)
          .map((w: CommitActivityWeek) => ({
            date: new Date(Number(w.week || 0) * 1000).toISOString(),
            count: Number(w.total || 0),
          }))
      : [];

    if (weekly.length > 0) {
      const points = weekly.map((w) => ({ date: new Date(w.date), count: w.count }));
      const monthly = aggregateByPeriod(points, 'monthly');
      const yearly = aggregateByPeriod(points, 'yearly');
      return {
        weekly,
        monthly,
        yearly,
        contributors: [],
        totalCommitsLastYear: weekly.reduce((acc, row) => acc + row.count, 0),
      };
    }

    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const commits = await octokit.paginate(octokit.rest.repos.listCommits, {
      owner,
      repo,
      since: oneYearAgo,
      per_page: 100,
    });

    const points: Array<{ date: Date; count: number }> = [];
    const contributorMap = new Map<string, number>();

    for (const commit of commits) {
      const dateText = commit.commit?.author?.date;
      if (!dateText) continue;
      const date = new Date(dateText);
      if (Number.isNaN(date.getTime())) continue;

      points.push({ date, count: 1 });

      const author = commit.author?.login || commit.commit?.author?.name || 'unknown';
      contributorMap.set(author, (contributorMap.get(author) || 0) + 1);
    }

    const monthly = aggregateByPeriod(points, 'monthly');
    const yearly = aggregateByPeriod(points, 'yearly');

    const contributors = [...contributorMap.entries()]
      .map(([author, commits]) => ({ author, commits }))
      .sort((a, b) => b.commits - a.commits)
      .slice(0, 10);

    const weeklyFallback = monthly.map((row) => ({
      date: `${row.period}-01T00:00:00.000Z`,
      count: row.count,
    }));

    return {
      weekly: weeklyFallback,
      monthly,
      yearly,
      contributors,
      totalCommitsLastYear: points.length,
    };
  } catch {
    return fallback;
  }
}
