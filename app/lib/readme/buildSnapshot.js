/**
 * Builds a unified snapshot object with consistent schema.
 * Pure function - does NOT fetch data.
 */
export function buildSnapshot({ meta, structure, packageInfo, assets }) {
  return {
    // Basic metadata
    name: meta?.name || "Repository",
    description: meta?.description || "",
    visibility: meta?.visibility || "public",
    owner: meta?.owner || "unknown",
    topics: meta?.topics || [],
    stars: meta?.stars || 0,
    forks: meta?.forks || 0,
    language: meta?.language || null,

    // Structure and content
    structure: structure && structure.length > 0 ? structure : [],
    techStack: {
      dependencies: packageInfo?.dependencies || [],
      devDependencies: packageInfo?.devDependencies || [],
    },
    scripts: packageInfo?.scripts || {},
    assets: assets && assets.length > 0 ? assets : [],
  };
}
