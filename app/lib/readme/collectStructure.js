import { GITHUB_API } from "../github/constants";

const IGNORE = ["node_modules", ".git", "dist", "build", ".next", "coverage"];

export async function collectStructure({ owner, repo, branch, headers }) {
  if (!branch) {
    console.warn(
      "collectStructure: branch not provided, skipping structure fetch",
    );
    return [];
  }

  try {
    const res = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      { headers },
    );

    if (!res.ok) return [];

    const data = await res.json();

    if (!data.tree || !Array.isArray(data.tree)) return [];

    return data.tree
      .filter((item) => item.type === "tree")
      .map((item) => item.path)
      .filter((path) => !IGNORE.some((i) => path.startsWith(i)))
      .slice(0, 30); // README-safe limit
  } catch (err) {
    console.error("collectStructure failed:", err.message);
    return [];
  }
}
