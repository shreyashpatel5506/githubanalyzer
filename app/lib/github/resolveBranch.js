/**
 * Resolve Branch to Commit SHA
 *
 * Safely resolves the target branch with support for user-selected branches.
 * Never hardcodes "main" or "master".
 */

const GITHUB_API = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";

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
 * Resolve target branch to its commit SHA
 *
 * @async
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string|null} selectedBranch - User-selected branch (optional)
 * @param {string|null} token - Optional GitHub token
 * @returns {Promise<Object>}
 *   { branch, defaultBranch, sha, error? }
 */
export async function resolveBranchSha(
  owner,
  repo,
  selectedBranch = null,
  token = null,
) {
  if (!owner || !repo) {
    return { error: "Owner and repo are required" };
  }

  try {
    // Get default branch from repo metadata
    const repoUrl = `${GITHUB_API}/repos/${owner}/${repo}`;
    const repoRes = await fetch(repoUrl, {
      headers: buildHeaders(token),
      timeout: 30000,
    });

    if (!repoRes.ok) {
      return {
        error: `Failed to fetch repository: ${repoRes.status}`,
      };
    }

    const repoData = await repoRes.json();
    const defaultBranch = repoData.default_branch;

    if (!defaultBranch) {
      return { error: "Could not determine default branch" };
    }

    // Use selected branch or default
    const targetBranch = selectedBranch || defaultBranch;

    // Fetch branch info to get commit SHA
    const branchUrl = `${GITHUB_API}/repos/${owner}/${repo}/branches/${encodeURIComponent(
      targetBranch,
    )}`;
    const branchRes = await fetch(branchUrl, {
      headers: buildHeaders(token),
      timeout: 30000,
    });

    if (!branchRes.ok) {
      if (branchRes.status === 404) {
        return {
          error: `Branch not found: ${targetBranch}`,
        };
      }
      return {
        error: `Failed to fetch branch: ${branchRes.status}`,
      };
    }

    const branchData = await branchRes.json();
    const commitSha = branchData.commit?.sha;

    if (!commitSha) {
      return { error: "Could not resolve commit SHA" };
    }

    return {
      branch: targetBranch,
      defaultBranch,
      sha: commitSha,
    };
  } catch (error) {
    return {
      error: `Error resolving branch: ${error.message}`,
    };
  }
}
