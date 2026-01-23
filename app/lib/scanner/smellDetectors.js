/**
 * Code Smell Detectors
 *
 * Detection logic for each smell category.
 * Pure functions that analyze code and return findings.
 */

import { SCAN_CONFIG } from "./scanConfig.js";
import { SMELL_RULES } from "./smellRules.js";

/**
 * Analyze file content and detect code smells
 *
 * @param {string} content - File content
 * @param {string} filePath - File path
 * @returns {Object}
 *   {
 *     path, language, metrics,
 *     smells: Array<{id, severity, line, message, recommendation}>
 *   }
 */
export function detectSmells(content, filePath) {
  if (!content || typeof content !== "string") {
    return { path: filePath, error: "Invalid content", smells: [] };
  }

  const lines = content.split("\n");
  const metrics = analyzeMetrics(content, filePath);
  const language = getLanguage(filePath);
  const smells = [];

  // Detect each category
  smells.push(...detectMaintainability(lines, filePath, metrics));
  smells.push(...detectReliability(lines, filePath, language));
  smells.push(...detectPerformance(lines, filePath, language));
  smells.push(...detectSecurity(lines, filePath));

  return {
    path: filePath,
    language,
    metrics,
    smells: smells.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return (
        severityOrder[a.severity] - severityOrder[b.severity] ||
        a.lineStart - b.lineStart
      );
    }),
  };
}

/**
 * Analyze basic metrics
 */
function analyzeMetrics(content, filePath) {
  const lines = content.split("\n");
  let totalLines = lines.length;
  let codeLines = 0;
  let commentLines = 0;
  let blankLines = 0;
  let functions = 0;
  let asyncFunctions = 0;
  let consoleCount = 0;
  let maxNestingDepth = 0;
  let currentNestingDepth = 0;

  let inBlockComment = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Track block comments
    if (trimmed.includes("/*")) inBlockComment = true;
    if (inBlockComment) {
      commentLines++;
      if (trimmed.includes("*/")) inBlockComment = false;
      continue;
    }

    // Single-line comments
    if (trimmed.startsWith("//")) {
      commentLines++;
      continue;
    }

    // Blank lines
    if (trimmed.length === 0) {
      blankLines++;
      continue;
    }

    codeLines++;

    // Count functions
    if (
      /\bfunction\s+\w+|\=>\s*\{|:\s*\(\)?\s*=>/.test(trimmed) ||
      /const\s+\w+\s*=\s*(?:async\s*)?\(/.test(trimmed)
    ) {
      if (trimmed.includes("async")) {
        asyncFunctions++;
      } else {
        functions++;
      }
    }

    // Count console logs
    if (/console\.(log|warn|error|debug)/.test(trimmed)) {
      consoleCount++;
    }

    // Calculate nesting depth
    const openBraces = (trimmed.match(/{/g) || []).length;
    const closeBraces = (trimmed.match(/}/g) || []).length;
    currentNestingDepth += openBraces - closeBraces;
    maxNestingDepth = Math.max(maxNestingDepth, currentNestingDepth);
    currentNestingDepth = Math.max(0, currentNestingDepth);
  }

  return {
    totalLines,
    codeLines,
    commentLines,
    blankLines,
    functions,
    asyncFunctions,
    consoleCount,
    maxNestingDepth,
    complexity: calculateComplexity(content),
  };
}

/**
 * Detect maintainability issues
 */
function detectMaintainability(lines, filePath, metrics) {
  const smells = [];
  const {
    LARGE_FILE_LOC,
    LARGE_FUNCTION_LOC,
    MAX_NESTING_DEPTH,
    MAX_PARAMETERS,
    MAX_CONSOLE_LOGS,
  } = SCAN_CONFIG.THRESHOLDS;

  // Large file
  if (metrics.totalLines > LARGE_FILE_LOC) {
    smells.push({
      id: "LARGE_FILE",
      severity: "medium",
      lineStart: 1,
      lineEnd: Math.min(20, metrics.totalLines),
      message: `File has ${metrics.totalLines} lines (threshold: ${LARGE_FILE_LOC})`,
      confidence: 0.95,
    });
  }

  // Deep nesting
  if (metrics.maxNestingDepth > MAX_NESTING_DEPTH) {
    smells.push({
      id: "DEEP_NESTING",
      severity: "medium",
      lineStart: 1,
      lineEnd: metrics.totalLines,
      message: `Max nesting depth is ${metrics.maxNestingDepth} (threshold: ${MAX_NESTING_DEPTH})`,
      confidence: 0.9,
    });
  }

  // Excessive logging
  if (metrics.consoleCount > MAX_CONSOLE_LOGS) {
    smells.push({
      id: "EXCESSIVE_LOGGING",
      severity: "low",
      lineStart: 1,
      lineEnd: metrics.totalLines,
      message: `Found ${metrics.consoleCount} console calls (threshold: ${MAX_CONSOLE_LOGS})`,
      confidence: 0.85,
    });
  }

  return smells;
}

/**
 * Detect reliability issues
 */
function detectReliability(lines, filePath, language) {
  const smells = [];
  let asyncCount = 0;
  let hasTryBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Count async functions
    if (/\basync\s+function|\basync\s*\(|:\s*async/.test(trimmed)) {
      asyncCount++;
    }

    // Check try blocks
    if (trimmed.includes("try {") || trimmed.startsWith("try {")) {
      hasTryBlock = true;
    }

    // Empty catch blocks
    if (trimmed.includes("catch") && /catch\s*\(\w*\)\s*{/.test(trimmed)) {
      const nextLine = lines[i + 1]?.trim() || "";
      if (nextLine === "}" || nextLine === "" || /^\/\//.test(nextLine)) {
        smells.push({
          id: "EMPTY_CATCH",
          severity: "high",
          lineStart: i + 1,
          lineEnd: i + 2,
          message: "Empty catch block detected",
          confidence: 0.92,
        });
      }
    }

    // Unhandled promise
    if (
      /\.then\s*\(/.test(trimmed) &&
      !lines
        .slice(Math.max(0, i - 2), i + 3)
        .join("")
        .includes(".catch")
    ) {
      smells.push({
        id: "PROMISE_NO_CATCH",
        severity: "high",
        lineStart: i + 1,
        lineEnd: i + 1,
        message: "Promise without .catch() handler",
        confidence: 0.8,
      });
    }
  }

  // Async without try/catch
  if (asyncCount > 0 && !hasTryBlock && asyncCount > 2) {
    smells.push({
      id: "ASYNC_NO_TRY_CATCH",
      severity: "high",
      lineStart: 1,
      lineEnd: Math.min(10, lines.length),
      message: `${asyncCount} async functions detected but no try/catch found`,
      confidence: 0.75,
    });
  }

  return smells;
}

/**
 * Detect performance issues
 */
function detectPerformance(lines, filePath, language) {
  const smells = [];
  const isReact =
    /\.(jsx|tsx)$/.test(filePath) || /react/i.test(lines.join(" "));

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Inline JSX functions in React
    if (
      isReact &&
      /onClick|onChange|onSubmit/.test(trimmed) &&
      /\(\)\s*=>/.test(trimmed)
    ) {
      smells.push({
        id: "INLINE_JSX_FUNCTION",
        severity: "medium",
        lineStart: i + 1,
        lineEnd: i + 1,
        message: "Inline function in JSX causes unnecessary re-renders",
        confidence: 0.88,
      });
    }

    // Heavy synchronous loops
    if (/for\s*\(|while\s*\(/.test(trimmed)) {
      let loopComplexity = 0;
      for (let j = i; j < Math.min(i + 10, lines.length); j++) {
        if (/fetch|await|\.map\(|\.filter\(/.test(lines[j])) {
          loopComplexity++;
        }
      }
      if (loopComplexity > 3) {
        smells.push({
          id: "HEAVY_SYNC_LOOP",
          severity: "medium",
          lineStart: i + 1,
          lineEnd: Math.min(i + 10, lines.length),
          message: "Heavy operations in synchronous loop detected",
          confidence: 0.7,
        });
      }
    }
  }

  return smells;
}

/**
 * Detect security issues
 */
function detectSecurity(lines, filePath) {
  const smells = [];
  const secretPatterns = [
    /api[_-]?key\s*[:=]/i,
    /secret\s*[:=]/i,
    /password\s*[:=]/i,
    /token\s*[:=]/i,
    /bearer\s+/i,
  ];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Hardcoded secrets
    secretPatterns.forEach((pattern) => {
      if (pattern.test(trimmed) && /['"`][^'"`]*['"`]/.test(trimmed)) {
        smells.push({
          id: "HARDCODED_SECRET",
          severity: "high",
          lineStart: i + 1,
          lineEnd: i + 1,
          message: "Potential hardcoded secret detected",
          confidence: 0.82,
        });
      }
    });

    // Eval usage
    if (/\beval\s*\(|new\s+Function\s*\(/.test(trimmed)) {
      smells.push({
        id: "EVAL_USAGE",
        severity: "high",
        lineStart: i + 1,
        lineEnd: i + 1,
        message: "Usage of eval() or Function() constructor",
        confidence: 0.98,
      });
    }

    // Open CORS
    if (
      /cors|origin|Access-Control/i.test(trimmed) &&
      /\*|true|undefined/.test(trimmed)
    ) {
      smells.push({
        id: "OPEN_CORS",
        severity: "high",
        lineStart: i + 1,
        lineEnd: i + 1,
        message: "CORS allows requests from any origin",
        confidence: 0.85,
      });
    }
  }

  return smells;
}

/**
 * Get file language
 */
function getLanguage(filePath) {
  if (/\.ts$/.test(filePath)) return "typescript";
  if (/\.jsx$/.test(filePath)) return "jsx";
  if (/\.tsx$/.test(filePath)) return "tsx";
  if (/\.js$/.test(filePath)) return "javascript";
  return "unknown";
}

/**
 * Calculate cyclomatic complexity (simplified)
 */
function calculateComplexity(content) {
  const conditions = (content.match(/if|else|case|catch|for|while/g) || [])
    .length;
  return Math.max(1, conditions);
}
