/**
 * Repository Cache System
 * 
 * Single source of truth for repository scanning.
 * Eliminates duplicate GitHub API calls and AI analysis.
 * Implements session-level caching with TTL and Request Coalescing.
 */

// In-memory caches
const scanCache = new Map();
const pendingScans = new Map();
const treeCache = new Map();
const fileContentCache = new Map();

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const IMMUTABLE_TTL = 60 * 60 * 1000; // 1 hour (Trees/Files are immutable by SHA)

/**
 * Cache key generator
 */
function getCacheKey(owner, repo, branch = 'default') {
  return `${owner}/${repo}@${branch}`;
}

/**
 * Check if cache entry is valid
 */
function isCacheValid(entry, ttl = CACHE_TTL) {
  if (!entry) return false;
  return Date.now() - entry.timestamp < ttl;
}

/**
 * Get or Start a Repository Scan (Request Coalescing)
 * 
 * If a scan is already running for this key, return the existing Promise.
 * If a result is cached, return it immediately.
 * Otherwise, start the scan and cache the promise.
 */
export async function getOrStartScan(owner, repo, branch, scanFn) {
  const key = getCacheKey(owner, repo, branch);

  // 1. Check completed cache
  const cached = scanCache.get(key);
  if (isCacheValid(cached)) {
    console.log(`[CACHE HIT] ${key}`);
    return cached.data;
  }

  // 2. Check pending scans (deduplication)
  if (pendingScans.has(key)) {
    console.log(`[SCAN DEDUP] Joining existing scan for ${key}`);
    return pendingScans.get(key);
  }

  // 3. Start new scan
  console.log(`[SCAN START] ${key}`);
  const scanPromise = scanFn().then(result => {
    // Only cache successful results without critical errors
    if (!result.errors || result.errors.length === 0) {
      scanCache.set(key, {
        data: result,
        timestamp: Date.now()
      });
    }
    return result;
  }).finally(() => {
    pendingScans.delete(key);
  });

  pendingScans.set(key, scanPromise);
  return scanPromise;
}

/**
 * Get cached repository scan (direct access)
 */
export function getCachedScan(owner, repo, branch) {
  const key = getCacheKey(owner, repo, branch);
  const entry = scanCache.get(key);
  
  if (isCacheValid(entry)) {
    return entry.data;
  }
  return null;
}

/**
 * Cache repository scan results
 */
export function setCachedScan(owner, repo, branch, scanData) {
  const key = getCacheKey(owner, repo, branch);
  scanCache.set(key, {
    data: scanData,
    timestamp: Date.now()
  });
}

/**
 * Tree Caching (Immutable by SHA)
 */
export function getCachedTree(owner, repo, commitSha) {
  const key = `${owner}/${repo}/${commitSha}`;
  const entry = treeCache.get(key);
  if (isCacheValid(entry, IMMUTABLE_TTL)) return entry.data;
  return null;
}

export function setCachedTree(owner, repo, commitSha, data) {
  const key = `${owner}/${repo}/${commitSha}`;
  treeCache.set(key, { data, timestamp: Date.now() });
}

/**
 * File Content Caching (Immutable by SHA)
 */
export function getCachedFile(owner, repo, fileSha) {
  // Key by SHA is sufficient globally, but owner/repo context is safer for collisions (rare)
  const key = `${owner}/${repo}/${fileSha}`;
  const entry = fileContentCache.get(key);
  if (isCacheValid(entry, IMMUTABLE_TTL)) return entry.data;
  return null;
}

export function setCachedFile(owner, repo, fileSha, data) {
  if (!fileSha) return;
  const key = `${owner}/${repo}/${fileSha}`;
  fileContentCache.set(key, { data, timestamp: Date.now() });
}

/**
 * Clear cache for specific repository
 */
export function clearRepoCache(owner, repo) {
  const pattern = `${owner}/${repo}`;
  
  // Clear scans
  for (const key of scanCache.keys()) {
    if (key.startsWith(pattern)) {
      scanCache.delete(key);
    }
  }
  
  // Clear trees (optional, but good for memory)
  for (const key of treeCache.keys()) {
    if (key.startsWith(pattern)) {
      treeCache.delete(key);
    }
  }
  
  console.log(`[CACHE CLEAR] ${pattern}`);
}

/**
 * Cleanup expired entries
 */
export function cleanupCache() {
  const now = Date.now();
  let cleaned = 0;
  
  const cleanupMap = (map, ttl) => {
    for (const [key, entry] of map.entries()) {
      if (now - entry.timestamp >= ttl) {
        map.delete(key);
        cleaned++;
      }
    }
  };

  cleanupMap(scanCache, CACHE_TTL);
  cleanupMap(treeCache, IMMUTABLE_TTL);
  cleanupMap(fileContentCache, IMMUTABLE_TTL);
  
  if (cleaned > 0) {
    console.log(`[CACHE CLEANUP] Removed ${cleaned} expired entries`);
  }
  return cleaned;
}

// Auto-cleanup every 10 minutes
setInterval(cleanupCache, 10 * 60 * 1000);
