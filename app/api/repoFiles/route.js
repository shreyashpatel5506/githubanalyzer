const GITHUB_API = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";

const DEFAULT_HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": GITHUB_API_VERSION,
  "User-Agent": "gitprofile-ai/1.0",
};

// File filtering constants
const INCLUDED_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);
const EXCLUDED_DIRS = new Set([
  "node_modules",
  "build",
  "dist",
  ".next",
  "public",
  ".git",
  "coverage",
  ".vercel",
  ".nuxt",
  "out",
  "venv",
  "env",
]);

const SCAN_CONFIG = {
  MAX_FILES: 500,
  MAX_FILE_SIZE_BYTES: 500 * 1024, // 500 KB
  MAX_TREE_DEPTH: 10,
  TIMEOUT_MS: 30000,
};

/* ======================= HEADERS & AUTH ======================= */

/**
 * Build GitHub API headers with optional authentication
 * @param {string|null} token - GitHub personal access token
 * @returns {Object} Headers object for API requests
 */
function buildHeaders(token = null) {
  const headers = { ...DEFAULT_HEADERS };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

/* ======================= BRANCH RESOLUTION ======================= */

/**
 * Safely resolve the target branch for a repository
 *
 * Fetches repository metadata to determine the default branch,
 * then validates the user-selected branch if provided.
 * Never hardcodes "main" or "master".
 *
 * @async
 * @param {string} owner - Repository owner (username/org)
 * @param {string} repo - Repository name
 * @param {string|null} selectedBranch - Optional user-selected branch
 * @param {string|null} token - Optional GitHub token
 * @returns {Promise<Object>} { branch: string, sha: string, error?: string }
 * @throws {Error} On network or API errors
 */
export async function resolveBranch(
  owner,
  repo,
  selectedBranch = null,
  token = null,
) {
  if (!owner || !repo) {
    return { error: "Owner and repo are required" };
  }

  try {
    // Fetch repository metadata
    const repoUrl = `${GITHUB_API}/repos/${owner}/${repo}`;
    const repoRes = await fetch(repoUrl, {
      headers: buildHeaders(token),
      timeout: SCAN_CONFIG.TIMEOUT_MS,
    });

    if (!repoRes.ok) {
      return {
        error: `Failed to fetch repository: ${repoRes.status} ${repoRes.statusText}`,
      };
    }

    const repoData = await repoRes.json();
    const defaultBranch = repoData.default_branch;

    if (!defaultBranch) {
      return { error: "Could not determine default branch" };
    }

    // Use selected branch if provided, otherwise use default
    const targetBranch = selectedBranch || defaultBranch;

    // Fetch commit SHA for the target branch
    const branchUrl = `${GITHUB_API}/repos/${owner}/${repo}/branches/${targetBranch}`;
    const branchRes = await fetch(branchUrl, {
      headers: buildHeaders(token),
      timeout: SCAN_CONFIG.TIMEOUT_MS,
    });

    if (!branchRes.ok) {
      return {
        error: `Branch not found: ${targetBranch}`,
      };
    }

    const branchData = await branchRes.json();
    const commitSha = branchData.commit?.sha;

    if (!commitSha) {
      return { error: "Could not resolve branch commit SHA" };
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

/* ======================= TREE FETCHING ======================= */

/**
 * Fetch the full Git tree recursively from GitHub
 *
 * Resolves branch → commit SHA → tree SHA, then recursively
 * fetches the entire tree structure.
 *
 * @async
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string|null} branch - Optional branch name
 * @param {string|null} token - Optional GitHub token
 * @returns {Promise<Object>} { files: Array, stats: Object, error?: string }
 *   files: Array of { path, type, sha, size }
 *   stats: { totalFiles, filteredFiles, totalSize }
 * @throws {Error} On network errors
 */
export async function fetchRepositoryTree(
  owner,
  repo,
  branch = null,
  token = null,
) {
  if (!owner || !repo) {
    return { error: "Owner and repo are required", files: [] };
  }

  try {
    // Step 1: Resolve the branch
    const branchRes = await resolveBranch(owner, repo, branch, token);
    if (branchRes.error) {
      return { error: branchRes.error, files: [] };
    }

    const { sha: commitSha } = branchRes;

    // Step 2: Get the tree SHA from the commit
    const commitUrl = `${GITHUB_API}/repos/${owner}/${repo}/git/commits/${commitSha}`;
    const commitRes = await fetch(commitUrl, {
      headers: buildHeaders(token),
      timeout: SCAN_CONFIG.TIMEOUT_MS,
    });

    if (!commitRes.ok) {
      return {
        error: `Failed to fetch commit: ${commitRes.statusText}`,
        files: [],
      };
    }

    const commitData = await commitRes.json();
    const treeSha = commitData.tree?.sha;

    if (!treeSha) {
      return { error: "Could not resolve tree SHA", files: [] };
    }

    // Step 3: Fetch recursive tree
    const treeUrl = `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`;
    const treeRes = await fetch(treeUrl, {
      headers: buildHeaders(token),
      timeout: SCAN_CONFIG.TIMEOUT_MS,
    });

    if (!treeRes.ok) {
      return {
        error: `Failed to fetch tree: ${treeRes.statusText}`,
        files: [],
      };
    }

    const treeData = await treeRes.json();
    const rawFiles = treeData.tree || [];

    // Normalize and filter
    const normalizedFiles = rawFiles
      .filter((item) => item.type === "blob") // Only files
      .map((item) => ({
        path: item.path,
        type: item.type,
        sha: item.sha,
        size: item.size || 0,
      }));

    const stats = {
      totalFiles: normalizedFiles.length,
      filteredFiles: 0,
      totalSize: normalizedFiles.reduce((sum, f) => sum + (f.size || 0), 0),
    };

    return {
      files: normalizedFiles,
      stats,
    };
  } catch (error) {
    return {
      error: `Error fetching repository tree: ${error.message}`,
      files: [],
    };
  }
}

/* ======================= FILE FILTERING ======================= */

/**
 * Filter files based on extension, path, and size constraints
 *
 * Includes only .js, .jsx, .ts, .tsx files.
 * Excludes node_modules, build, dist, .next, public, .git, coverage.
 * Enforces max file count and max file size limits.
 *
 * @param {Array} files - Array of file objects with path, type, size
 * @param {Object} options - Filtering options
 * @param {number} options.maxFiles - Maximum files to include (default: 500)
 * @param {number} options.maxFileSize - Maximum file size in bytes (default: 500KB)
 * @returns {Object} { filtered: Array, stats: Object }
 *   filtered: Array of file objects that pass all filters
 *   stats: { totalInput, included, excluded, byReason: Object }
 */
export function filterRepositoryFiles(files = [], options = {}) {
  const {
    maxFiles = SCAN_CONFIG.MAX_FILES,
    maxFileSize = SCAN_CONFIG.MAX_FILE_SIZE_BYTES,
  } = options;

  const stats = {
    totalInput: files.length,
    included: 0,
    excluded: 0,
    byReason: {
      invalidExtension: 0,
      excludedDirectory: 0,
      fileTooLarge: 0,
      maxFilesReached: 0,
    },
  };

  const filtered = [];

  for (const file of files) {
    // Check if we've hit the max file limit
    if (filtered.length >= maxFiles) {
      stats.excluded++;
      stats.byReason.maxFilesReached++;
      continue;
    }

    const { path, size = 0 } = file;

    // Check extension
    const hasValidExtension = Array.from(INCLUDED_EXTENSIONS).some((ext) =>
      path.endsWith(ext),
    );
    if (!hasValidExtension) {
      stats.excluded++;
      stats.byReason.invalidExtension++;
      continue;
    }

    // Check excluded directories
    const isExcludedDir = Array.from(EXCLUDED_DIRS).some(
      (dir) => path.includes(`/${dir}/`) || path.startsWith(`${dir}/`),
    );
    if (isExcludedDir) {
      stats.excluded++;
      stats.byReason.excludedDirectory++;
      continue;
    }

    // Check file size
    if (size > maxFileSize) {
      stats.excluded++;
      stats.byReason.fileTooLarge++;
      continue;
    }

    filtered.push(file);
    stats.included++;
  }

  return { filtered, stats };
}

/* ======================= CONTENT FETCHING ======================= */

/**
 * Fetch file content from GitHub
 *
 * Retrieves file content via GitHub Contents API and decodes Base64.
 * Returns structured file objects with content and metadata.
 *
 * @async
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} filePath - Path to file in repository
 * @param {string|null} branch - Optional branch name
 * @param {string|null} token - Optional GitHub token
 * @returns {Promise<Object>}
 *   { path, content, size, encoding, extension, error?: string }
 * @throws {Error} On network errors
 */
export async function fetchFileContent(
  owner,
  repo,
  filePath,
  branch = null,
  token = null,
) {
  if (!owner || !repo || !filePath) {
    return {
      path: filePath,
      error: "Owner, repo, and filePath are required",
    };
  }

  try {
    // Resolve branch to get the correct tree
    const branchRes = await resolveBranch(owner, repo, branch, token);
    if (branchRes.error) {
      return { path: filePath, error: branchRes.error };
    }

    const targetBranch = branchRes.branch;

    // Fetch file via Contents API
    const contentUrl = `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`;
    const contentRes = await fetch(
      `${contentUrl}?ref=${encodeURIComponent(targetBranch)}`,
      {
        headers: buildHeaders(token),
        timeout: SCAN_CONFIG.TIMEOUT_MS,
      },
    );

    if (!contentRes.ok) {
      if (contentRes.status === 404) {
        return { path: filePath, error: "File not found" };
      }
      return {
        path: filePath,
        error: `HTTP ${contentRes.status}: ${contentRes.statusText}`,
      };
    }

    const fileData = await contentRes.json();

    // Verify it's a file, not a directory
    if (fileData.type !== "file") {
      return { path: filePath, error: "Path is not a file" };
    }

    // Decode Base64 content
    let content = "";
    try {
      content = Buffer.from(fileData.content, "base64").toString("utf-8");
    } catch (decodeError) {
      return {
        path: filePath,
        error: `Failed to decode file content: ${decodeError.message}`,
      };
    }

    // Extract extension
    const dotIndex = filePath.lastIndexOf(".");
    const extension = dotIndex !== -1 ? filePath.substring(dotIndex) : "";

    return {
      path: filePath,
      content,
      size: fileData.size || 0,
      encoding: "utf-8",
      extension,
      sha: fileData.sha,
    };
  } catch (error) {
    return {
      path: filePath,
      error: `Error fetching file content: ${error.message}`,
    };
  }
}

/* ======================= STATIC CODE ANALYSIS ======================= */

/**
 * Analyze file content for code smells and metrics
 *
 * Lightweight static analysis without AI:
 * - Count lines of code (excluding comments/blank)
 * - Count functions and async functions
 * - Detect console.log usage
 * - Detect missing try/catch in async functions
 * - Flag large files and deeply nested logic
 *
 * @param {string} content - File content
 * @param {string} filePath - File path (for reporting)
 * @returns {Object} Structured analysis results
 */
export function analyzeFileContent(content, filePath = "") {
  if (!content || typeof content !== "string") {
    return {
      path: filePath,
      error: "Invalid content",
      metrics: null,
    };
  }

  const lines = content.split("\n");
  const analysis = {
    path: filePath,
    metrics: {
      totalLines: lines.length,
      codeLines: 0,
      commentLines: 0,
      blankLines: 0,
      functions: 0,
      asyncFunctions: 0,
      consoleUsage: 0,
      maxNestingDepth: 0,
    },
    smells: [],
  };

  let inBlockComment = false;
  let maxNestingDepth = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Track block comments
    if (trimmed.includes("/*")) inBlockComment = true;
    if (inBlockComment) {
      analysis.metrics.commentLines++;
      if (trimmed.includes("*/")) inBlockComment = false;
      continue;
    }

    // Check for single-line comments
    if (trimmed.startsWith("//")) {
      analysis.metrics.commentLines++;
      continue;
    }

    // Blank lines
    if (trimmed.length === 0) {
      analysis.metrics.blankLines++;
      continue;
    }

    analysis.metrics.codeLines++;

    // Count functions
    if (
      /\bfunction\s+\w+|^const\s+\w+\s*=\s*(?:async\s*)?\(|^let\s+\w+\s*=\s*(?:async\s*)?\(/.test(
        trimmed,
      )
    ) {
      if (trimmed.includes("async")) {
        analysis.metrics.asyncFunctions++;
      } else {
        analysis.metrics.functions++;
      }
    }

    // Arrow functions
    if (trimmed.includes("=>")) {
      if (trimmed.includes("async")) {
        analysis.metrics.asyncFunctions++;
      } else {
        analysis.metrics.functions++;
      }
    }

    // Console usage
    if (/console\.(log|warn|error|debug|info)/.test(trimmed)) {
      analysis.metrics.consoleUsage++;
    }

    // Calculate nesting depth
    const openBraces = (trimmed.match(/{/g) || []).length;
    const closeBraces = (trimmed.match(/}/g) || []).length;
    maxNestingDepth += openBraces - closeBraces;
    maxNestingDepth = Math.max(0, maxNestingDepth);
    analysis.metrics.maxNestingDepth = Math.max(
      analysis.metrics.maxNestingDepth,
      maxNestingDepth,
    );
  }

  // Detect code smells
  if (analysis.metrics.totalLines > 400) {
    analysis.smells.push({
      type: "LARGE_FILE",
      severity: "medium",
      message: `File has ${analysis.metrics.totalLines} lines (threshold: 400)`,
    });
  }

  if (analysis.metrics.maxNestingDepth > 5) {
    analysis.smells.push({
      type: "DEEP_NESTING",
      severity: "medium",
      message: `Max nesting depth is ${analysis.metrics.maxNestingDepth} (threshold: 5)`,
    });
  }

  if (analysis.metrics.consoleUsage > 5) {
    analysis.smells.push({
      type: "EXCESSIVE_LOGGING",
      severity: "low",
      message: `Found ${analysis.metrics.consoleUsage} console.log calls`,
    });
  }

  // Detect missing try/catch in async functions
  if (analysis.metrics.asyncFunctions > 0) {
    const hasTryCatch = content.includes("try") && content.includes("catch");
    if (!hasTryCatch && analysis.metrics.asyncFunctions > 2) {
      analysis.smells.push({
        type: "MISSING_ERROR_HANDLING",
        severity: "high",
        message: "Async functions detected but no try/catch blocks found",
      });
    }
  }

  return analysis;
}

/* ======================= BATCH OPERATIONS ======================= */

/**
 * Analyze multiple files in a repository
 *
 * Combines fetching, filtering, and analysis operations.
 * Optimized for serverless environments with timeout handling.
 *
 * @async
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {Object} options - Configuration options
 * @param {string|null} options.branch - Optional branch
 * @param {string|null} options.token - Optional GitHub token
 * @param {number} options.maxFiles - Max files to analyze
 * @param {Array} options.filePaths - Specific files to analyze (optional)
 * @returns {Promise<Object>} Analysis results for all files
 */
export async function analyzeRepository(owner, repo, options = {}) {
  const {
    branch = null,
    token = null,
    maxFiles = SCAN_CONFIG.MAX_FILES,
    filePaths = null,
  } = options;

  const results = {
    owner,
    repo,
    branch: branch || "default",
    files: [],
    stats: {
      total: 0,
      analyzed: 0,
      failed: 0,
      averageComplexity: 0,
    },
    errors: [],
  };

  try {
    // Fetch repository tree
    let files;
    if (filePaths && Array.isArray(filePaths)) {
      // Specific files mode
      files = filePaths.map((path) => ({
        path,
        type: "blob",
        size: 0,
      }));
    } else {
      // Full tree scan mode
      const treeRes = await fetchRepositoryTree(owner, repo, branch, token);
      if (treeRes.error) {
        results.errors.push(treeRes.error);
        return results;
      }
      files = treeRes.files;
    }

    results.stats.total = files.length;

    // Filter files
    const { filtered } = filterRepositoryFiles(files, { maxFiles });

    // Analyze each file
    for (const file of filtered) {
      try {
        const contentRes = await fetchFileContent(
          owner,
          repo,
          file.path,
          branch,
          token,
        );

        if (contentRes.error) {
          results.stats.failed++;
          results.files.push({
            path: file.path,
            error: contentRes.error,
          });
          continue;
        }

        const analysis = analyzeFileContent(contentRes.content, file.path);

        results.files.push({
          path: file.path,
          size: contentRes.size,
          extension: contentRes.extension,
          metrics: analysis.metrics,
          smells: analysis.smells,
        });

        results.stats.analyzed++;
      } catch (error) {
        results.stats.failed++;
        results.files.push({
          path: file.path,
          error: `Analysis error: ${error.message}`,
        });
      }
    }

    // Calculate statistics
    if (results.stats.analyzed > 0) {
      const totalComplexity = results.files.reduce(
        (sum, f) => sum + (f.metrics?.maxNestingDepth || 0),
        0,
      );
      results.stats.averageComplexity = (
        totalComplexity / results.stats.analyzed
      ).toFixed(2);
    }
  } catch (error) {
    results.errors.push(`Repository analysis error: ${error.message}`);
  }

  return results;
}
