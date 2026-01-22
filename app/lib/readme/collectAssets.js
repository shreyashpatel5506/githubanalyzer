import { GITHUB_API } from "../github/constants";

const ASSET_DIRS = ["screenshots", "assets", "public"];

export async function collectAssets({ owner, repo, headers }) {
  for (const dir of ASSET_DIRS) {
    const res = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/${dir}`,
      { headers },
    );

    if (!res.ok) continue;

    const files = await res.json();

    if (Array.isArray(files)) {
      return files
        .filter((f) => f.type === "file")
        .map((f) => `/${dir}/${f.name}`);
    }
  }

  return [];
}
