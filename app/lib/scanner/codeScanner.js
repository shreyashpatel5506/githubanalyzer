/**
 * Code Scanner Orchestrator
 *
 * Orchestrates the full scanning pipeline:
 * 1. Fetch repo metadata
 * 2. Fetch repo tree
 * 3. Filter scannable files
 * 4. Fetch file contents
 * 5. Detect smells
 * 6. Aggregate results
 */

import { fetchRepoMeta } from "../github/fetchRepoMeta.js";
import { resolveBranchSha } from "../github/resolveBranch.js";
import { fetchRepositoryTree } from "../github/fetchRepositoryTree.js";
import { fetchFileContentBatch } from "../github/fetchFileContent.js";
import { filterFilesForScanning } from "./fileFilter.js";
import { detectSmells } from "./smellDetectors.js";
import { mapSeverity, sortBySeverity } from "./severityMap.js";
import { getScanLimits } from "./scanConfig.js";

/**
 * Scan a repository for code smells
 *
 * @async
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {Object} options - Scan options
 * @param {string} options.branch - Optional branch name
 * @param {string} options.token - Optional GitHub token
 * @param {string} options.planTier - Plan tier (free/pro/enterprise)
 * @returns {Promise<Object>} Comprehensive scan results
 */
export async function scanRepository(owner, repo, options = {}) {
  const { branch = null, token = null, planTier = "free" } = options;

  const results = {
    owner,
    repo,
    branch: branch || "default",
    timestamp: new Date().toISOString(),
    metadata: null,
    files: [],
    smells: [],
    statistics: {
      filesAnalyzed: 0,
      filesSkipped: 0,
      totalSmells: 0,
      smellsByCategory: {},
      smellsBySeverity: {},
      averageComplexity: 0,
    },
    errors: [],
  };

  const limits = getScanLimits(planTier);

  try {
    // Step 1: Fetch repository metadata
    const metaRes = await fetchRepoMeta(owner, repo, token);
    if (metaRes.error) {
      results.errors.push(metaRes.error);
      results.statusCode = metaRes.statusCode || 500;
      return results;
    }
    results.metadata = metaRes;

    // Step 2: Resolve branch
    const branchRes = await resolveBranchSha(owner, repo, branch, token);
    if (branchRes.error) {
      results.errors.push(branchRes.error);
      return results;
    }
    results.branch = branchRes.branch;
    const commitSha = branchRes.sha;

    // Step 3: Fetch repository tree
    const treeRes = await fetchRepositoryTree(owner, repo, commitSha, token);
    if (treeRes.error) {
      results.errors.push(treeRes.error);
      return results;
    }

    // Step 4: Filter scannable files
    const { scannable, stats: filterStats } = filterFilesForScanning(
      treeRes.files,
      { maxFiles: limits.maxFiles, maxFileSize: limits.maxFileSize },
    );

    results.statistics.filesSkipped = filterStats.excluded;

    // Step 5: Fetch file contents and analyze
    const fileContents = await fetchFileContentBatch(
      owner,
      repo,
      scannable, // Pass full objects to enable SHA-based caching
      branchRes.branch,
      token,
    );

    // Step 6: Analyze each file
    let totalComplexity = 0;
    const fileSmells = [];

    for (const fileContent of fileContents) {
      if (fileContent.error) {
        continue;
      }

      const analysis = detectSmells(fileContent.content, fileContent.path);

      results.files.push({
        path: fileContent.path,
        extension: fileContent.extension,
        size: fileContent.size,
        metrics: analysis.metrics,
        smellCount: analysis.smells.length,
      });

      results.statistics.filesAnalyzed++;
      totalComplexity += analysis.metrics.complexity || 0;

      // Map severity and add GitHub URL
      analysis.smells.forEach((smell) => {
        const finalSmell = {
          ...smell,
          severity: mapSeverity(smell, fileContent.path),
          file: fileContent.path,
          githubUrl: buildGitHubUrl(
            owner,
            repo,
            branchRes.branch,
            fileContent.path,
            smell.lineStart,
          ),
        };
        fileSmells.push(finalSmell);
        results.smells.push(finalSmell);
      });
    }

    // Step 7: Aggregate statistics
    results.smells = sortBySeverity(results.smells);
    results.statistics.totalSmells = results.smells.length;
    results.statistics.averageComplexity =
      results.statistics.filesAnalyzed > 0
        ? (totalComplexity / results.statistics.filesAnalyzed).toFixed(2)
        : 0;

    // Count smells by category
    results.smells.forEach((smell) => {
      const category = smell.category || "unknown";
      const severity = smell.severity || "low";

      results.statistics.smellsByCategory[category] =
        (results.statistics.smellsByCategory[category] || 0) + 1;

      results.statistics.smellsBySeverity[severity] =
        (results.statistics.smellsBySeverity[severity] || 0) + 1;
    });

    results.metadata.scanUrl = `https://github.com/${owner}/${repo}/tree/${branchRes.branch}`;
  } catch (error) {
    results.errors.push(`Scan error: ${error.message}`);
  }

  return results;
}

/**
 * Build GitHub blob URL with line numbers
 */
function buildGitHubUrl(owner, repo, branch, path, lineStart, lineEnd) {
  const baseUrl = `https://github.com/${owner}/${repo}/blob/${branch}/${path}`;
  if (!lineStart) return baseUrl;
  return `${baseUrl}#L${lineStart}${lineEnd ? `-L${lineEnd}` : ""}`;
}
