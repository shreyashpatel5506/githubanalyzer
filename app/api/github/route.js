import { NextResponse } from "next/server";

/* ================== CONSTANTS ================== */
const GITHUB_API = "https://api.github.com";
const GITHUB_GRAPHQL = "https://api.github.com/graphql";
const GITHUB_API_VERSION = "2022-11-28";
const REPOS_PER_PAGE = 100;
const MAX_REPOS_TO_FETCH = 100;

/* ================== HEADERS ================== */

const publicHeaders = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": GITHUB_API_VERSION,
  "User-Agent": "gitprofile-ai",
};

// ✅ AUTH (OPTIONAL)
function getAuthHeaders(token) {
  if (!token) return publicHeaders;
  return {
    ...publicHeaders,
    Authorization: `Bearer ${token}`,
  };
}

/* ================== HELPERS ================== */

function validateUsername(username) {
  if (!username || typeof username !== "string") {
    return { valid: false, error: "Username is required" };
  }

  const sanitized = username.trim().toLowerCase();

  if (sanitized.length === 0 || sanitized.length > 39) {
    return { valid: false, error: "Invalid username format" };
  }

  if (!/^[a-z0-9-]+$/.test(sanitized)) {
    return { valid: false, error: "Username contains invalid characters" };
  }

  return { valid: true, username: sanitized };
}

async function handleGitHubResponse(res, context) {
  if (res.status === 404) {
    return { error: true, status: 404, message: "User not found" };
  }

  if (!res.ok) {
    const text = await res.text();
    return {
      error: true,
      status: res.status,
      message: `${context}: ${text}`,
    };
  }

  const data = await res.json();
  return { error: false, data };
}

/* ================== GRAPHQL (AUTH ONLY) ================== */

async function fetchExactContributions(username, headers) {
  const fromDate = new Date(
    Date.now() - 90 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const query = `
    query ($login: String!) {
      user(login: $login) {
        contributionsCollection(from: "${fromDate}") {
          totalCommitContributions
          totalPullRequestContributions
          totalIssueContributions
        }
      }
    }
  `;

  try {
    const res = await fetch(GITHUB_GRAPHQL, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables: { login: username } }),
    });

    const json = await res.json();

    if (json.errors || !json?.data?.user?.contributionsCollection) {
      return null;
    }

    return json.data.user.contributionsCollection;
  } catch {
    return null;
  }
}

/* ================== FETCH REPOS ================== */

async function fetchAllRepos({ username, headers }) {
  let repos = [];
  let page = 1;

  const baseUrl = `${GITHUB_API}/users/${username}/repos?visibility=public`;

  while (repos.length < MAX_REPOS_TO_FETCH) {
    const res = await fetch(
      `${baseUrl}&per_page=${REPOS_PER_PAGE}&page=${page}&sort=updated`,
      { headers },
    );

    const result = await handleGitHubResponse(res, "Failed to fetch repos");
    if (result.error || result.data.length === 0) break;

    repos.push(...result.data);
    page++;
  }

  return repos.slice(0, MAX_REPOS_TO_FETCH);
}

/* ================== GUEST MODE ESTIMATES ================== */

async function estimateCommits(username, repos) {
  let commits = 0;

  for (const repo of repos.slice(0, 10)) {
    const res = await fetch(
      `${GITHUB_API}/repos/${username}/${repo.name}/commits?author=${username}&per_page=1`,
      { headers: publicHeaders },
    );

    if (!res.ok) continue;

    const link = res.headers.get("link");
    if (link?.includes('rel="last"')) {
      const match = link.match(/page=(\d+)>; rel="last"/);
      if (match) commits += parseInt(match[1], 10);
    } else {
      const data = await res.json();
      commits += data.length;
    }
  }

  return commits;
}

async function estimatePRBreakdown(username, repos) {
  let open = 0;
  let merged = 0;

  for (const repo of repos.slice(0, 10)) {
    const openRes = await fetch(
      `${GITHUB_API}/repos/${username}/${repo.name}/pulls?state=open&per_page=1`,
      { headers: publicHeaders },
    );

    if (openRes.ok) {
      const link = openRes.headers.get("link");
      if (link?.includes('rel="last"')) {
        const match = link.match(/page=(\d+)>; rel="last"/);
        if (match) open += parseInt(match[1], 10);
      }
    }

    const closedRes = await fetch(
      `${GITHUB_API}/repos/${username}/${repo.name}/pulls?state=closed&per_page=30`,
      { headers: publicHeaders },
    );

    if (closedRes.ok) {
      const pulls = await closedRes.json();
      for (const pr of pulls) {
        if (pr.merged_at) merged++;
      }
    }
  }

  return {
    total: open + merged,
    open,
    merged,
  };
}

/* ================== NORMALIZERS ================== */

const ACTIVE_DAYS_THRESHOLD = 90;

function isRepoActive(repo) {
  if (repo.archived || repo.disabled) return false;
  const lastPush = new Date(repo.pushed_at).getTime();
  const cutoff = Date.now() - ACTIVE_DAYS_THRESHOLD * 86400000;
  return lastPush >= cutoff;
}

function normalizeProfile(p) {
  return {
    id: p.id,
    username: p.login,
    name: p.name,
    bio: p.bio,
    avatarUrl: p.avatar_url,
    followers: p.followers,
    following: p.following,
    publicRepos: p.public_repos,
    profileUrl: p.html_url,
    createdAt: p.created_at,
  };
}

function normalizeRepos(repos) {
  return repos
    .filter((r) => !r.fork)
    .map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      stars: r.stargazers_count,
      forks: r.forks_count,
      language: r.language,
      topics: r.topics || [],
      archived: r.archived,
      pushedAt: r.pushed_at,
      updatedAt: r.updated_at,
      isActive: isRepoActive(r),
    }));
}

/* ================== API HANDLER ================== */

export async function POST(req) {
  try {
    const { username, accessToken } = await req.json();

    const validation = validateUsername(username);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const cleanUsername = validation.username;

    // ✅ PROFILE (PUBLIC)
    const profileRes = await fetch(`${GITHUB_API}/users/${cleanUsername}`, {
      headers: publicHeaders,
    });

    const profileResult = await handleGitHubResponse(
      profileRes,
      "Profile fetch failed",
    );

    if (profileResult.error) {
      return NextResponse.json(
        { error: profileResult.message },
        { status: profileResult.status },
      );
    }

    const repos = await fetchAllRepos({
      username: cleanUsername,
      headers: publicHeaders,
    });
    const normalizedRepos = normalizeRepos(repos);
    const authHeaders = getAuthHeaders(accessToken);

    let totalPR = 0;
    let openPR = 0;
    let mergedPR = 0;
    let graphStats;

    if (accessToken) {
      const [totalPRRes, mergedPRRes, openPRRes, graphStatsRaw] =
        await Promise.all([
          fetch(
            `${GITHUB_API}/search/issues?q=author:${cleanUsername}+type:pr&per_page=1`,
            { headers: authHeaders },
          ),
          fetch(
            `${GITHUB_API}/search/issues?q=author:${cleanUsername}+type:pr+is:merged&per_page=1`,
            { headers: authHeaders },
          ),
          fetch(
            `${GITHUB_API}/search/issues?q=author:${cleanUsername}+type:pr+is:open&per_page=1`,
            { headers: authHeaders },
          ),
          fetchExactContributions(cleanUsername, authHeaders),
        ]);

      totalPR = totalPRRes.ok ? (await totalPRRes.json()).total_count : 0;
      mergedPR = mergedPRRes.ok ? (await mergedPRRes.json()).total_count : 0;
      openPR = openPRRes.ok ? (await openPRRes.json()).total_count : 0;

      graphStats = graphStatsRaw ?? {
        totalCommitContributions: 0,
        totalPullRequestContributions: 0,
        totalIssueContributions: 0,
      };
    } else {
      const prEstimate = await estimatePRBreakdown(cleanUsername, repos);
      const commitEstimate = await estimateCommits(cleanUsername, repos);

      totalPR = prEstimate.total;
      openPR = prEstimate.open;
      mergedPR = prEstimate.merged;

      graphStats = {
        totalCommitContributions: commitEstimate,
        totalPullRequestContributions: totalPR,
        totalIssueContributions: 0,
      };
    }

    return NextResponse.json({
      profile: normalizeProfile(profileResult.data),
      repos: normalizeRepos(repos),
      pullRequests: {
        total: totalPR,
        open: openPR,
        merged: mergedPR,
        closed: Math.max(0, totalPR - openPR - mergedPR),
      },
      recentActivity: {
        commits: graphStats.totalCommitContributions,
        pullRequests: graphStats.totalPullRequestContributions,
        issues: graphStats.totalIssueContributions,
        activeRepositories: normalizedRepos.filter((r) => r.isActive).length,
      },
      authMode: accessToken ? "authenticated" : "guest",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
