import { SCAN_CONFIG } from './scanConfig';

export interface FileEntry {
  path: string;
  size?: number;
  sha?: string;
  url?: string;
}

export interface FilterResult {
  scannable: FileEntry[];
  stats: {
    totalInput: number;
    included: number;
    excluded: number;
    byReason: Record<string, number>;
  };
}

export function filterFilesForScanning(
  files: FileEntry[],
  options: { maxFiles?: number; maxFileSize?: number } = {}
): FilterResult {
  const {
    maxFiles = SCAN_CONFIG.MAX_FILES,
    maxFileSize = SCAN_CONFIG.MAX_FILE_SIZE_BYTES,
  } = options;

  const stats = {
    totalInput: files.length,
    included: 0,
    excluded: 0,
    byReason: { invalidExtension: 0, excludedDirectory: 0, fileTooLarge: 0, maxFilesReached: 0 },
  };

  const priorityFiles: FileEntry[] = [];
  const regularFiles: FileEntry[] = [];

  for (const file of files) {
    const { path, size = 0 } = file;

    const ext = '.' + path.split('.').pop();
    if (!SCAN_CONFIG.INCLUDED_EXTENSIONS.has(ext)) {
      stats.excluded++;
      stats.byReason.invalidExtension++;
      continue;
    }

    const isExcludedDir = Array.from(SCAN_CONFIG.EXCLUDED_DIRS).some(
      (dir) => path.includes(`/${dir}/`) || path.startsWith(`${dir}/`)
    );
    if (isExcludedDir) {
      stats.excluded++;
      stats.byReason.excludedDirectory++;
      continue;
    }

    if (size > maxFileSize) {
      stats.excluded++;
      stats.byReason.fileTooLarge++;
      continue;
    }

    stats.included++;
    const isPriority = SCAN_CONFIG.PRIORITY_DIRS.some((dir) => path.startsWith(dir));
    if (isPriority) priorityFiles.push(file);
    else regularFiles.push(file);
  }

  const combined = [...priorityFiles, ...regularFiles].slice(0, maxFiles);

  // Mark excluded by maxFiles
  const remaining = stats.included - combined.length;
  if (remaining > 0) {
    stats.excluded += remaining;
    stats.byReason.maxFilesReached = remaining;
    stats.included = combined.length;
  }

  return { scannable: combined, stats };
}
