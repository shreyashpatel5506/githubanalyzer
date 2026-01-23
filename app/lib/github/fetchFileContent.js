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
 * @param {Array<string>} filePaths - Array of file paths
 * @param {string} branch - Branch name
 * @param {string|null} token - Optional GitHub token
 * @returns {Promise<Array<Object>>} Array of file content objects
 */
export async function fetchFileContentBatch(
  owner,
  repo,
  filePaths,
  branch,
  token = null,
) {
  if (!Array.isArray(filePaths)) {
    return [];
  }

  const promises = filePaths.map((filePath) =>
    fetchFileContent(owner, repo, filePath, branch, token),
  );

  return Promise.all(promises);
}
