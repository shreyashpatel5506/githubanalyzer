import { Octokit } from 'octokit';
import { filterFilesForScanning, FileEntry } from './fileFilter';
import { detectSmells, Smell } from './smellDetectors';
import { getScanLimits } from './scanConfig';
import { analyzeDatabaseArtifacts } from './databaseAnalyzer';

export interface ScanOptions {
  branch?: string | null;
  token?: string | null;
  planTier?: string;
}

export interface SmellWithFile extends Smell {
  file: string;
}

export interface ScanResult {
  owner: string;
  repo: string;
  branch: string;
  timestamp: string;
  filesAnalyzed: number;
  smells: SmellWithFile[];
  bugs: SmellWithFile[];
  securityIssues: SmellWithFile[];
  codeSmells: SmellWithFile[];
  statistics: {
    totalSmells: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
    averageComplexity: number;
  };
  errors: string[];
  report: {
    generatedAt: string;
    totals: {
      smells: number;
      bugs: number;
      security: number;
      filesAnalyzed: number;
    };
  };
}

export async function scanRepositoryFiles(
  owner: string,
  repo: string,
  options: ScanOptions = {}
): Promise<ScanResult> {
  const { branch = null, token = null, planTier = 'free' } = options;
  const limits = getScanLimits(planTier);

  const result: ScanResult = {
    owner,
    repo,
    branch: branch || 'main',
    timestamp: new Date().toISOString(),
    filesAnalyzed: 0,
    smells: [],
    bugs: [],
    securityIssues: [],
    codeSmells: [],
    statistics: {
      totalSmells: 0,
      byCategory: {},
      bySeverity: {},
      averageComplexity: 0,
    },
    errors: [],
    report: {
      generatedAt: new Date().toISOString(),
      totals: {
        smells: 0,
        bugs: 0,
        security: 0,
        filesAnalyzed: 0,
      },
    },
  };

  try {
    const octokit = new Octokit({ auth: token || undefined });

    // 1. Get default branch if not specified
    let targetBranch = branch;
    if (!targetBranch) {
      try {
        const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
        targetBranch = repoData.default_branch;
      } catch {
        targetBranch = 'main';
      }
    }
    result.branch = targetBranch;

    // 2. Fetch repo tree (recursive)
    let treeItems: FileEntry[] = [];
    try {
      const { data: treeData } = await octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: targetBranch,
        recursive: '1',
      });

      treeItems = (treeData.tree || [])
        .filter((item) => item.type === 'blob')
        .map((item) => ({
          path: item.path!,
          size: item.size || 0,
          sha: item.sha!,
          url: item.url,
        }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown tree fetch error';
      result.errors.push(`Failed to fetch repository tree: ${message}`);
      return result;
    }

    // 3. Filter files
    const { scannable } = filterFilesForScanning(treeItems, {
      maxFiles: limits.maxFiles,
      maxFileSize: limits.maxFileSize,
    });

    if (scannable.length === 0) {
      result.errors.push('No scannable files found in this repository.');
      return result;
    }

    // 4. Fetch and analyze each file
    let totalComplexity = 0;
    const fetchedFiles: Array<{ path: string; content: string }> = [];

    for (const file of scannable) {
      try {
        const contentResponse = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: file.path,
          ref: targetBranch!,
        });

        const fileData = contentResponse.data as { content?: string } | Array<unknown>;

        if (!fileData || Array.isArray(fileData) || !fileData.content) continue;

        const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
        fetchedFiles.push({ path: file.path, content });

        const analysis = detectSmells(content, file.path);
        result.filesAnalyzed++;
        totalComplexity += analysis.metrics.complexity;

        for (const smell of analysis.smells) {
          const enriched: SmellWithFile = { ...smell, file: file.path };
          result.smells.push(enriched);

          if (smell.category === 'security') result.securityIssues.push(enriched);
          else if (smell.category === 'reliability') result.bugs.push(enriched);
          else result.codeSmells.push(enriched);
        }
      } catch {
        // Skip files that can't be fetched without failing whole analysis
      }
    }

    // 4b. Cross-file database-aware analysis
    const dbFindings = analyzeDatabaseArtifacts(fetchedFiles);
    for (const finding of dbFindings) {
      const enriched: SmellWithFile = {
        id: finding.id,
        severity: finding.severity,
        category: finding.category,
        lineStart: finding.lineStart,
        message: finding.message,
        confidence: finding.confidence,
        suggestedFix: finding.suggestedFix,
        file: finding.file,
      };

      result.smells.push(enriched);
      if (enriched.category === 'security') result.securityIssues.push(enriched);
      else if (enriched.category === 'reliability') result.bugs.push(enriched);
      else result.codeSmells.push(enriched);
    }

    // 5. Aggregate statistics
    result.statistics.totalSmells = result.smells.length;
    result.statistics.averageComplexity =
      result.filesAnalyzed > 0
        ? Number((totalComplexity / result.filesAnalyzed).toFixed(2))
        : 0;

    for (const smell of result.smells) {
      result.statistics.byCategory[smell.category] =
        (result.statistics.byCategory[smell.category] || 0) + 1;
      result.statistics.bySeverity[smell.severity] =
        (result.statistics.bySeverity[smell.severity] || 0) + 1;
    }

    result.report = {
      generatedAt: new Date().toISOString(),
      totals: {
        smells: result.codeSmells.length,
        bugs: result.bugs.length,
        security: result.securityIssues.length,
        filesAnalyzed: result.filesAnalyzed,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown scan error';
    result.errors.push(`Scan error: ${message}`);
  }

  return result;
}
