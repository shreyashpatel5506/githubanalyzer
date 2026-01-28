import { resolveBranchSha } from "../github/resolveBranch.js";
import { fetchRepositoryTree } from "../github/fetchRepositoryTree.js";

const IGNORE = ["node_modules", ".git", "dist", "build", ".next", "coverage"];

export async function collectStructure({ owner, repo, branch, headers }) {
  if (!branch) {
    console.warn(
      "collectStructure: branch not provided, skipping structure fetch",
    );
    return [];
  }

  try {
    const authHeader = headers?.Authorization || headers?.authorization;
    const token = authHeader ? authHeader.replace("Bearer ", "") : null;

    // Resolve branch to SHA
    const branchRes = await resolveBranchSha(owner, repo, branch, token);
    if (branchRes.error) return [];

    // Fetch tree (cached by SHA)
    const treeRes = await fetchRepositoryTree(owner, repo, branchRes.sha, token);
    if (treeRes.error) return [];

    return treeRes.files
      .filter((item) => item.type === "tree")
      .map((item) => item.path)
      .filter((path) => !IGNORE.some((i) => path.startsWith(i)))
      .slice(0, 30); // README-safe limit
  } catch (err) {
    console.error("collectStructure failed:", err.message);
    return [];
  }
}
