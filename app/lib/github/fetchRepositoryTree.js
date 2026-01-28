/**
 * Fetch Repository Git Tree
 *
 * Recursively fetches the full Git tree from GitHub.
 * Resolves branch → commit SHA → tree SHA.
 */

import { getCachedTree, setCachedTree } from "../repositoryCache.js";

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
 * Fetch repository tree recursively
 *
 * @async
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} commitSha - Commit SHA to fetch tree from
 * @param {string|null} token - Optional GitHub token
 * @returns {Promise<Object>}
 *   { files: Array<{path, type, sha, size}>, stats, error? }
 */
export async function fetchRepositoryTree(
  owner,
  repo,
  commitSha,
  token = null,
) {
  if (!owner || !repo || !commitSha) {
    return {
      files: [],
      stats: { total: 0, blobs: 0, trees: 0 },
      error: "Owner, repo, and commitSha are required",
    };
  }

  // Check cache first (Commit SHA is immutable)
  const cached = getCachedTree(owner, repo, commitSha);
  if (cached) {
    console.log(`[TREE CACHE HIT] ${owner}/${repo} @ ${commitSha}`);
    return cached;
  }

  try {
    // Get tree SHA from commit
    const commitUrl = `${GITHUB_API}/repos/${owner}/${repo}/git/commits/${commitSha}`;
    const commitRes = await fetch(commitUrl, {
      headers: buildHeaders(token),
      timeout: 30000,
    });

    if (!commitRes.ok) {
      return {
        files: [],
        stats: { total: 0, blobs: 0, trees: 0 },
        error: `Failed to fetch commit: ${commitRes.status}`,
      };
    }

    const commitData = await commitRes.json();
    const treeSha = commitData.tree?.sha;

    if (!treeSha) {
      return {
        files: [],
        stats: { total: 0, blobs: 0, trees: 0 },
        error: "Could not resolve tree SHA",
      };
    }

    // Fetch recursive tree
    const treeUrl = `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`;
    const treeRes = await fetch(treeUrl, {
      headers: buildHeaders(token),
      timeout: 30000,
    });

    if (!treeRes.ok) {
      return {
        files: [],
        stats: { total: 0, blobs: 0, trees: 0 },
        error: `Failed to fetch tree: ${treeRes.status}`,
      };
    }

    const treeData = await treeRes.json();
    const rawItems = treeData.tree || [];

    // Normalize to file objects
    const files = rawItems
      .filter((item) => item.type === "blob" || item.type === "tree") // Include files and directories
      .map((item) => ({
        path: item.path,
        type: item.type,
        sha: item.sha,
        size: item.size || 0,
      }));

    const stats = {
      total: rawItems.length,
      blobs: files.length,
      trees: rawItems.filter((item) => item.type === "tree").length,
      totalSize: files.reduce((sum, f) => sum + (f.size || 0), 0),
    };

    const result = { files, stats };
    
    // Cache the result
    setCachedTree(owner, repo, commitSha, result);

    return result;
  } catch (error) {
    return {
      files: [],
      stats: { total: 0, blobs: 0, trees: 0 },
      error: `Error fetching tree: ${error.message}`,
    };
  }
}
