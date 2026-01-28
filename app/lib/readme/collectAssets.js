import { fetchRepositoryTree } from "../github/fetchRepositoryTree.js";
import { resolveBranchSha } from "../github/resolveBranch.js";

const ASSET_DIRS = ["screenshots", "assets", "public"];

export async function collectAssets({ owner, repo, headers }) {
  try {
    const authHeader = headers?.Authorization || headers?.authorization;
    const token = authHeader ? authHeader.replace("Bearer ", "") : null;

    // Resolve branch
    const branchRes = await resolveBranchSha(owner, repo, null, token);
    const branch = branchRes.branch || "main";

    // Fetch full tree (cached)
    const treeRes = await fetchRepositoryTree(owner, repo, branchRes.sha, token);
    if (treeRes.error) return [];

    const foundAssets = [];

    // Filter tree for asset files
    for (const file of treeRes.files) {
      // Check if file is in one of the asset dirs
      for (const dir of ASSET_DIRS) {
        if (file.path.startsWith(`${dir}/`) && file.type === "blob") {
           // Basic heuristic: images or common asset types
           if (/\.(png|jpg|jpeg|gif|svg|ico)$/i.test(file.path)) {
             foundAssets.push(file.path);
           }
        }
      }
    }

    return foundAssets.slice(0, 10); // Limit to 10 assets
  } catch (error) {
    console.error("COLLECT ASSETS ERROR:", error);
    return [];
  }
}
