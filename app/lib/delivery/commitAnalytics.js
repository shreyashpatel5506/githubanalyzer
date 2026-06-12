function toMonthKey(date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}
function aggregateByPeriod(points, mode) {
    const map = new Map();
    for (const point of points) {
        const key = mode === 'monthly' ? toMonthKey(point.date) : String(point.date.getUTCFullYear());
        map.set(key, (map.get(key) || 0) + point.count);
    }
    return [...map.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([period, count]) => ({ period, count }));
}
export async function getCommitAnalytics(octokit, owner, repo) {
    var _a, _b, _c, _d, _e;
    const fallback = {
        weekly: [],
        monthly: [],
        yearly: [],
        contributors: [],
        totalCommitsLastYear: 0,
    };
    try {
        const commitActivity = await octokit.rest.repos
            .getCommitActivityStats({ owner, repo })
            .catch(() => ({ data: [] }));
        const weekly = Array.isArray(commitActivity.data)
            ? commitActivity.data
                .filter((w) => Number((w === null || w === void 0 ? void 0 : w.total) || 0) > 0)
                .map((w) => ({
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
        const points = [];
        const contributorMap = new Map();
        for (const commit of commits) {
            const dateText = (_b = (_a = commit.commit) === null || _a === void 0 ? void 0 : _a.author) === null || _b === void 0 ? void 0 : _b.date;
            if (!dateText)
                continue;
            const date = new Date(dateText);
            if (Number.isNaN(date.getTime()))
                continue;
            points.push({ date, count: 1 });
            const author = ((_c = commit.author) === null || _c === void 0 ? void 0 : _c.login) || ((_e = (_d = commit.commit) === null || _d === void 0 ? void 0 : _d.author) === null || _e === void 0 ? void 0 : _e.name) || 'unknown';
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
    }
    catch (_f) {
        return fallback;
    }
}
