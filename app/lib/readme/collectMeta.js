import { GITHUB_API } from "../github/constants";

export async function collectMeta({ owner, repo, headers }) {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, { headers });

  if (!res.ok) return null;

  const data = await res.json();

  return {
    name: data.name,
    fullName: data.full_name,
    description: data.description || "",
    homepage: data.homepage || "",
    visibility: data.visibility,
    defaultBranch: data.default_branch,
    topics: data.topics || [],
    owner: data.owner?.login || owner,
    stars: data.stargazers_count || 0,
    forks: data.forks_count || 0,
    language: data.language || null,
  };
}
