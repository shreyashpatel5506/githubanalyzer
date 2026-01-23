/**
 * Fetch GitHub Repository Metadata
 *
 * Retrieves essential repo information: default branch, visibility, primary language.
 * No hardcoding of branch names.
 */

const GITHUB_API = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";

/**
 * Build GitHub API headers with optional authentication
 * @param {string|null} token - GitHub personal access token
 * @returns {Object} Headers object for API requests
 */
function buildHeaders(token = null) {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
    "User-Agent": "gitprofile-ai/1.0",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Fetch repository metadata
 *
 * @async
 * @param {string} owner - Repository owner (username/org)
 * @param {string} repo - Repository name
 * @param {string|null} token - Optional GitHub token
 * @returns {Promise<Object>}
 *   {
 *     name, description, owner, visibility, defaultBranch,
 *     language, stargazers, forks, topics,
 *     createdAt, updatedAt, error?
 *   }
 */
export async function fetchRepoMeta(owner, repo, token = null) {
  if (!owner || !repo) {
    return {
      error: "Owner and repo are required",
    };
  }

  try {
    const url = `${GITHUB_API}/repos/${owner}/${repo}`;
    const res = await fetch(url, {
      headers: buildHeaders(token),
      timeout: 30000,
    });

    if (!res.ok) {
      if (res.status === 404) {
        return { error: "Repository not found" };
      }
      if (res.status === 403) {
        return {
          error:
            "GitHub API rate limit exceeded. Please try again in a few minutes.",
          statusCode: 429,
        };
      }
      return {
        error: `Failed to fetch repository: ${res.status} ${res.statusText}`,
        statusCode: res.status,
      };
    }

    const data = await res.json();

    return {
      name: data.name,
      description: data.description || "",
      owner: data.owner?.login || owner,
      visibility: data.private ? "private" : "public",
      defaultBranch: data.default_branch,
      language: data.language || "Unknown",
      stargazers: data.stargazers_count || 0,
      forks: data.forks_count || 0,
      topics: data.topics || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      homepageUrl: data.homepage || null,
      isArchived: data.archived || false,
    };
  } catch (error) {
    return {
      error: `Error fetching repository metadata: ${error.message}`,
    };
  }
}
