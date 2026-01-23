/**
 * Scan Configuration
 *
 * Limits and thresholds for code scanning by plan tier.
 */

export const SCAN_CONFIG = {
  // File limits
  MAX_FILES: 500,
  MAX_FILE_SIZE_BYTES: 1000 * 1024, // 500 KB

  // API timeout
  TIMEOUT_MS: 30000,

  // Code smell thresholds
  THRESHOLDS: {
    LARGE_FILE_LOC: 1000,
    LARGE_FUNCTION_LOC: 100,
    MAX_NESTING_DEPTH: 5,
    MAX_PARAMETERS: 5,
    MAX_CONSOLE_LOGS: 5,
    MAX_CYCLOMATIC_COMPLEXITY: 10,
  },

  // Included extensions
  INCLUDED_EXTENSIONS: new Set([".js", ".jsx", ".ts", ".tsx"]),

  // Excluded directories (never scan)
  EXCLUDED_DIRS: new Set([
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
    ".cache",
    ".pytest_cache",
    "__pycache__",
  ]),

  // Priority directories (scan first)
  PRIORITY_DIRS: [
    "/app",
    "/pages",
    "/components",
    "/api",
    "/lib",
    "/src",
    "/server",
    "/client",
  ],
};

/**
 * Get scan limits for a plan tier
 *
 * @param {string} planTier - 'free', 'pro', 'enterprise'
 * @returns {Object} Scan limits
 */
export function getScanLimits(planTier = "free") {
  const baseLimits = {
    maxFiles: SCAN_CONFIG.MAX_FILES,
    maxFileSize: SCAN_CONFIG.MAX_FILE_SIZE_BYTES,
    timeout: SCAN_CONFIG.TIMEOUT_MS,
  };

  switch (planTier) {
    case "pro":
      return {
        ...baseLimits,
        maxFiles: 1000,
        timeout: 60000,
      };
    case "enterprise":
      return {
        ...baseLimits,
        maxFiles: 5000,
        timeout: 120000,
      };
    default:
      return baseLimits;
  }
}
