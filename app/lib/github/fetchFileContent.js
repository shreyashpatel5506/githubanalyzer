const GITHUB_API = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";

import { getCachedFile, setCachedFile } from "../repositoryCache.js";

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
 * Fetch single file content from repository
 *
 * @async
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} filePath - Path to file in repo
 * @param {string} branch - Branch name
 * @param {string|null} token - Optional GitHub token
 * @returns {Promise<Object>}
 *   { path, content, size, extension, sha, encoding, error? }
 */
export async function fetchFileContent(
  owner,
  repo,
  filePath,
  branch,
  token = null,
) {
  if (!owner || !repo || !filePath || !branch) {
    return {
      path: filePath,
      error: "Owner, repo, filePath, and branch are required",
    };
  }

  try {
    const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`;
    const res = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, {
      headers: buildHeaders(token),
      timeout: 30000,
    });

    if (!res.ok) {
      if (res.status === 404) {
        return {
          path: filePath,
          error: "File not found",
        };
      }
      return {
        path: filePath,
        error: `HTTP ${res.status}: ${res.statusText}`,
      };
    }

    const fileData = await res.json();

    // Ensure it's a file, not a directory
    if (fileData.type !== "file") {
      return {
        path: filePath,
        error: "Path is not a file",
      };
    }

    // Decode Base64 content
    let content = "";
    try {
      content = Buffer.from(fileData.content, "base64").toString("utf-8");
    } catch (decodeError) {
      return {
        path: filePath,
        error: `Failed to decode content: ${decodeError.message}`,
      };
    }

    // Extract file extension
    const dotIndex = filePath.lastIndexOf(".");
    const extension = dotIndex !== -1 ? filePath.substring(dotIndex) : "";

    return {
      path: filePath,
      content,
      size: fileData.size || 0,
      extension,
      sha: fileData.sha,
      encoding: "utf-8",
    };
  } catch (error) {
    return {
      path: filePath,
      error: `Error fetching file: ${error.message}`,
    };
  }
}



/**
 * Fetch multiple files in parallel
 *
 * @async
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {Array<string|Object>} files - Array of file paths or file objects {path, sha}
 * @param {string} branch - Branch name
 * @param {string|null} token - Optional GitHub token
 * @returns {Promise<Array<Object>>} Array of file content objects
 */
export async function fetchFileContentBatch(
  owner,
  repo,
  files,
  branch,
  token = null,
) {
  if (!Array.isArray(files)) {
    return [];
  }

  const results = [];
  const BATCH_SIZE = 5; // Conservative limit to avoid abusive rate limiting

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    
    const batchPromises = batch.map(async (file) => {
      const path = typeof file === 'string' ? file : file.path;
      const sha = typeof file === 'string' ? null : file.sha;

      // 1. Check Cache (if SHA is known)
      if (sha) {
        const cached = getCachedFile(owner, repo, sha);
        if (cached) {
          return cached;
        }
      }

      // 2. Fetch from GitHub
      const result = await fetchFileContent(owner, repo, path, branch, token);

      // 3. Cache Result (if successful)
      if (!result.error && result.sha) {
        setCachedFile(owner, repo, result.sha, result);
      } else if (sha && !result.error && result.content) {
         // Fallback: manually cache using the known SHA if fetch didn't return it
         // (though fetchFileContent usually returns SHA found in response or null)
         const resultWithSha = { ...result, sha };
         setCachedFile(owner, repo, sha, resultWithSha); 
      }

      return result;
    });

    // Wait for batch to complete
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}
