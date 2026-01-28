import { fetchFileContent } from "../github/fetchFileContent.js";
import { resolveBranchSha } from "../github/resolveBranch.js";

export async function collectPackage({ owner, repo, headers }) {
  try {
    const authHeader = headers?.Authorization || headers?.authorization;
    const token = authHeader ? authHeader.replace("Bearer ", "") : null;

    // We need a branch to fetch content. 
    // Optimization: If we already knew the default branch or SHA, we should pass it. 
    // For now, let's resolve it or default. 
    // Actually, fetchFileContent needs a branch/ref.
    
    // Quick resolve (cached if possible by resolveBranch logic if we add cache there, 
    // but resolveBranch itself isn't cached yet. 
    // However, `fetchFileContent` uses `ref`.
    
    // Let's first resolve the branch to get the head SHA, 
    // then fetchFileContent will cache the file by its SHA.
    const branchRes = await resolveBranchSha(owner, repo, null, token);
    const branch = branchRes.branch || "main";

    const file = await fetchFileContent(owner, repo, "package.json", branch, token);

    if (file.error || !file.content) return null;

    const pkg = JSON.parse(file.content);

    return {
      name: pkg.name || repo,
      scripts: pkg.scripts || {},
      dependencies: Object.keys(pkg.dependencies || {}),
      devDependencies: Object.keys(pkg.devDependencies || {}),
    };
  } catch (err) {
    console.error("PACKAGE PARSE FAILED:", err.message);
    return null;
  }
}
