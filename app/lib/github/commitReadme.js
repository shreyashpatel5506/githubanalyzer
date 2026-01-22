export async function commitReadmeToGitHub({
  githubToken,
  repoFullName,
  content,
}) {
  const apiBase = "https://api.github.com";

  const headers = {
    Authorization: `Bearer ${githubToken}`,
    Accept: "application/vnd.github+json",
  };

  // 1️⃣ Check existing README
  let sha = null;

  const readmeRes = await fetch(
    `${apiBase}/repos/${repoFullName}/contents/README.md`,
    { headers },
  );

  if (readmeRes.ok) {
    const json = await readmeRes.json();
    sha = json.sha;
  }

  // 2️⃣ Commit README
  const commitRes = await fetch(
    `${apiBase}/repos/${repoFullName}/contents/README.md`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message: "docs: auto-generate README via GitProfileAI",
        content: Buffer.from(content).toString("base64"),
        sha,
      }),
    },
  );

  if (!commitRes.ok) {
    const err = await commitRes.text();
    throw new Error("GitHub commit failed: " + err);
  }
}
