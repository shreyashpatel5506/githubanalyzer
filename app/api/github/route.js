import { NextResponse } from "next/server";

/* ================== CONSTANTS ================== */
const GITHUB_API = "https://api.github.com";
const GITHUB_GRAPHQL = "https://api.github.com/graphql";
const GITHUB_API_VERSION = "2022-11-28";
const REPOS_PER_PAGE = 100;
const MAX_REPOS_TO_FETCH = 100;

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

function getGitHubHeaders() {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
    "User-Agent": "gitprofile-ai",
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
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

/* ================== GRAPHQL (EXACT COMMITS) ================== */

async function fetchExactContributions(username, headers) {
  const fromDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const toDate = new Date().toISOString();

  const query = `
    query ($login: String!) {
      user(login: $login) {
        contributionsCollection(from: "${fromDate}", to: "${toDate}") {
          totalCommitContributions
          totalPullRequestContributions
          totalIssueContributions
        }
      }
    }
  `;

  const res = await fetch(GITHUB_GRAPHQL, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables: { login: username },
    }),
  });

  const json = await res.json();

  if (json.errors) {
    throw new Error("GraphQL contribution fetch failed");
  }

  return json.data.user.contributionsCollection;
}

/* ================== FETCH REPOS ================== */

async function fetchAllRepos(username, headers) {
  let repos = [];
  let page = 1;

  while (repos.length < MAX_REPOS_TO_FETCH) {
    const res = await fetch(
      `${GITHUB_API}/users/${username}/repos?per_page=${REPOS_PER_PAGE}&page=${page}&sort=updated`,
      { headers }
    );

    const result = await handleGitHubResponse(res, "Failed to fetch repos");
    if (result.error) break;

    if (result.data.length === 0) break;

    repos.push(...result.data);
    page++;
  }

  return repos.slice(0, MAX_REPOS_TO_FETCH);
}

/* ================== NORMALIZERS ================== */

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
      liveDemo: r.homepage || null,
      pushedAt: r.pushed_at,
      updatedAt: r.updated_at,
      topics: r.topics || []
    }));
}

/* ================== API HANDLER ================== */

export async function POST(req) {
  try {
    const body = await req.json();
    const validation = validateUsername(body.username);

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    if (!process.env.GITHUB_TOKEN) {
      return NextResponse.json(
        { error: "GitHub token missing" },
        { status: 500 }
      );
    }

    const username = validation.username;
    const headers = getGitHubHeaders();

    /* -------- PARALLEL FETCH -------- */
    const [
      profileRes,
      repos,
      totalPRRes,
      mergedPRRes,
      openPRRes,
      graphStats,
    ] = await Promise.all([
      fetch(`${GITHUB_API}/users/${username}`, { headers }),
      fetchAllRepos(username, headers),
      fetch(
        `${GITHUB_API}/search/issues?q=author:${username}+type:pr&per_page=1`,
        { headers }
      ),
      fetch(
        `${GITHUB_API}/search/issues?q=author:${username}+type:pr+is:merged&per_page=1`,
        { headers }
      ),
      fetch(
        `${GITHUB_API}/search/issues?q=author:${username}+type:pr+is:open&per_page=1`,
        { headers }
      ),
      fetchExactContributions(username, headers),
    ]);

    const profileResult = await handleGitHubResponse(
      profileRes,
      "Profile fetch failed"
    );

    if (profileResult.error) {
      return NextResponse.json(
        { error: profileResult.message },
        { status: profileResult.status }
      );
    }

    const totalPR = (await totalPRRes.json()).total_count || 0;
    const mergedPR = (await mergedPRRes.json()).total_count || 0;
    const openPR = (await openPRRes.json()).total_count || 0;

    /* -------- FINAL RESPONSE -------- */
    return NextResponse.json({
      profile: normalizeProfile(profileResult.data),
      repos: normalizeRepos(repos),
      pullRequests: {
        total: totalPR,
        merged: mergedPR,
        open: openPR,
        closed: Math.max(0, totalPR - mergedPR - openPR),
      },
      recentActivity: {
        commits: graphStats.totalCommitContributions,
        pullRequests: graphStats.totalPullRequestContributions,
        issues: graphStats.totalIssueContributions,
        activeRepositories: repos.filter(
          (r) =>
            new Date(r.pushed_at) >
            new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        ).length,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
