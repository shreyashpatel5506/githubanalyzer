/**
 * File Filter
 *
 * Determines which files should be scanned based on extension,
 * path, and size constraints.
 */

import { SCAN_CONFIG } from "./scanConfig.js";

/**
 * Filter files for scanning
 *
 * Includes only .js, .jsx, .ts, .tsx files.
 * Excludes node_modules, build, dist, .next, etc.
 * Enforces size and file count limits.
 *
 * @param {Array<Object>} files - Array of {path, size}
 * @param {Object} options - Filtering options
 * @param {number} options.maxFiles - Maximum files to include
 * @param {number} options.maxFileSize - Maximum file size in bytes
 * @returns {Object}
 *   {
 *     scannable: Array of files to scan,
 *     stats: { total, included, excluded, byReason: Object }
 *   }
 */
export function filterFilesForScanning(files = [], options = {}) {
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

  const scannable = [];
  let priorityFiles = [];
  let regularFiles = [];

  for (const file of files) {
    // Check if we've hit max files
    if (scannable.length >= maxFiles) {
      stats.excluded++;
      stats.byReason.maxFilesReached++;
      continue;
    }

    const { path, size = 0 } = file;

    // Check extension
    const hasValidExtension = Array.from(SCAN_CONFIG.INCLUDED_EXTENSIONS).some(
      (ext) => path.endsWith(ext),
    );
    if (!hasValidExtension) {
      stats.excluded++;
      stats.byReason.invalidExtension++;
      continue;
    }

    // Check excluded directories
    const isExcludedDir = Array.from(SCAN_CONFIG.EXCLUDED_DIRS).some(
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

    stats.included++;

    // Prioritize files from /app, /pages, /api, /components, /lib
    const isPriority = SCAN_CONFIG.PRIORITY_DIRS.some((dir) =>
      path.startsWith(dir),
    );

    if (isPriority) {
      priorityFiles.push(file);
    } else {
      regularFiles.push(file);
    }
  }

  // Merge: priority files first, then regular
  scannable.push(...priorityFiles, ...regularFiles);

  return { scannable: scannable.slice(0, maxFiles), stats };
}

/**
 * Check if a file path should be scanned
 *
 * @param {string} filePath - File path
 * @returns {boolean} True if file should be scanned
 */
export function isScannable(filePath) {
  if (!filePath) return false;

  // Check extension
  const hasValidExtension = Array.from(SCAN_CONFIG.INCLUDED_EXTENSIONS).some(
    (ext) => filePath.endsWith(ext),
  );
  if (!hasValidExtension) return false;

  // Check excluded dirs
  const isExcludedDir = Array.from(SCAN_CONFIG.EXCLUDED_DIRS).some(
    (dir) => filePath.includes(`/${dir}/`) || filePath.startsWith(`${dir}/`),
  );
  if (isExcludedDir) return false;

  return true;
}
