import { GITHUB_API } from "../github/constants";

export async function collectPackage({ owner, repo, headers }) {
  try {
    const res = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/package.json`,
      { headers },
    );

    if (!res.ok) return null;

    const data = await res.json();
    const pkg = JSON.parse(
      Buffer.from(data.content, "base64").toString("utf8"),
    );

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
