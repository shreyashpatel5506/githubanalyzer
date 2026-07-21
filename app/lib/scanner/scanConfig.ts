export const SCAN_CONFIG = {
  MAX_FILES: 150,
  MAX_FILE_SIZE_BYTES: 200 * 1024, // 200 KB
  INCLUDED_EXTENSIONS: new Set([
    '.js', '.jsx', '.ts', '.tsx',
    '.json', '.yaml', '.yml', '.sql',
    '.env', '.md', '.mjs', '.cjs', '.cts', '.mts',
  ]),
  EXCLUDED_DIRS: new Set([
    'node_modules', '.next', 'dist', 'build', 'coverage',
    '.git', '.cache', 'vendor', 'public', 'static',
  ]),
  PRIORITY_DIRS: ['app', 'src', 'pages', 'api', 'components', 'lib', 'utils'],
  THRESHOLDS: {
    LARGE_FILE_LOC: 300,
    LARGE_FUNCTION_LOC: 50,
    MAX_NESTING_DEPTH: 5,
    MAX_PARAMETERS: 5,
    MAX_CONSOLE_LOGS: 5,
  },
};

export function getScanLimits(planTier: string) {
  if (planTier === 'pro_plus') return { maxFiles: 400, maxFileSize: 700 * 1024 };
  if (planTier === 'pro') return { maxFiles: 250, maxFileSize: 500 * 1024 };
  return { maxFiles: SCAN_CONFIG.MAX_FILES, maxFileSize: SCAN_CONFIG.MAX_FILE_SIZE_BYTES };
}
