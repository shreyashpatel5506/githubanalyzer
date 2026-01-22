import { NextResponse } from "next/server";

/* 🧠 READ-ME PIPELINE */
import connectMongo from "@/app/config/db";
import { getGitHubHeaders } from "@/app/lib/github/headers";

import User from "@/app/models/user";
import Usage from "@/app/models/Usage";
import { runAI } from "../../ai/router";
import { commitReadmeToGitHub } from "@/app/lib/github/commitReadme.js";
import { collectMeta } from "@/app/lib/readme/collectMeta";
import { collectStructure } from "@/app/lib/readme/collectStructure";
import { collectPackage } from "@/app/lib/readme/collectPackage";
import { collectAssets } from "@/app/lib/readme/collectAssets";
import { buildSnapshot } from "@/app/lib/readme/buildSnapshot";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const DAILY_LIMIT = {
  free: 3,
  pro: 20,
  pro_plus: 100,
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

/* ================== PROMPT ================== */

function buildReadmePrompt(snapshot) {
  // Helper: infer features from dependencies, folders, and scripts
  const inferredFeatures = [];

  // Infer from dependencies
  if (snapshot.techStack.dependencies.length > 0) {
    const deps = snapshot.techStack.dependencies.join(" ").toLowerCase();
    if (deps.includes("react")) inferredFeatures.push("React-based UI");
    if (deps.includes("express")) inferredFeatures.push("Express server");
    if (deps.includes("mongodb")) inferredFeatures.push("MongoDB integration");
    if (deps.includes("postgres") || deps.includes("postgresql"))
      inferredFeatures.push("PostgreSQL database");
    if (deps.includes("axios")) inferredFeatures.push("HTTP client");
    if (deps.includes("jwt")) inferredFeatures.push("JWT authentication");
    if (
      deps.includes("tailwind") ||
      deps.includes("bootstrap") ||
      deps.includes("styled")
    )
      inferredFeatures.push("Styling solution");
  }

  // Infer from folder structure
  if (snapshot.structure.length > 0) {
    const folders = snapshot.structure.join(" ").toLowerCase();
    if (folders.includes("test")) inferredFeatures.push("Test suite");
    if (folders.includes("docker")) inferredFeatures.push("Docker support");
    if (folders.includes("api")) inferredFeatures.push("API endpoints");
    if (folders.includes("components"))
      inferredFeatures.push("Reusable components");
    if (folders.includes("middleware"))
      inferredFeatures.push("Middleware architecture");
  }

  // Infer from scripts
  const scriptKeys = Object.keys(snapshot.scripts).join(" ").toLowerCase();
  if (scriptKeys.includes("dev")) inferredFeatures.push("Development mode");
  if (scriptKeys.includes("build")) inferredFeatures.push("Production build");
  if (scriptKeys.includes("test")) inferredFeatures.push("Automated tests");
  if (scriptKeys.includes("lint")) inferredFeatures.push("Code linting");
  if (scriptKeys.includes("deploy"))
    inferredFeatures.push("Deployment automation");

  const featuresSection =
    inferredFeatures.length > 0
      ? inferredFeatures.map((f) => `- ${f}`).join("\n")
      : "- Feature detection requires code analysis";

  const depsStr =
    snapshot.techStack.dependencies.length > 0
      ? snapshot.techStack.dependencies.map((d) => `- ${d}`).join("\n")
      : "- No external dependencies detected";

  const devDepsStr =
    snapshot.techStack.devDependencies.length > 0
      ? snapshot.techStack.devDependencies.map((d) => `- ${d}`).join("\n")
      : "- No dev dependencies";

  const scriptsStr =
    Object.keys(snapshot.scripts).length > 0
      ? Object.entries(snapshot.scripts)
          .slice(0, 8)
          .map(([name, cmd]) => `- npm run ${name} - ${cmd}`)
          .join("\n")
      : "No scripts defined";

  const structureStr =
    snapshot.structure.length > 0
      ? snapshot.structure.map((f) => f).join("\n")
      : "Folder structure was not detectable from the repository.";

  const assetsStr =
    snapshot.assets.length > 0
      ? snapshot.assets.map((a) => `- ${a}`).join("\n")
      : "No screenshot or asset directories detected.";

  return `You are a senior open-source maintainer generating a professional GitHub README.

STRICT RULES (NON-NEGOTIABLE):
- Use ONLY the provided repository snapshot data.
- DO NOT invent features, commands, APIs, or scripts not in the snapshot.
- DO NOT assume technologies or patterns without explicit code signals.
- Output VALID GitHub-flavored Markdown ONLY.
- No emojis, marketing language, hype, or speculation.
- Be technical, accurate, and developer-focused.
- If data is missing, state that it is not available rather than inventing it.

REPOSITORY SNAPSHOT (SOURCE OF TRUTH):
${JSON.stringify(snapshot, null, 2)}

INFERRED FEATURES (from code signals):
${featuresSection}

GENERATE A README.md WITH THESE SECTIONS IN ORDER:

# ${snapshot.name}
Repository: ${snapshot.owner}/${snapshot.name}

## Overview
${snapshot.description || "A repository without an explicit description. Review the code to understand its purpose."}

Stats: ${snapshot.stars} stars | ${snapshot.forks} forks | Language: ${snapshot.language || "Not specified"}

## Key Features
Based on code analysis:
${featuresSection}

## Tech Stack
**Language:** ${snapshot.language || "Not specified"}

**Dependencies:**
${depsStr}

**Dev Dependencies:**
${devDepsStr}

**Topics:** ${snapshot.topics.length > 0 ? snapshot.topics.join(", ") : "Not specified"}

## Setup Instructions
${
  Object.keys(snapshot.scripts).length > 0
    ? `### Available Scripts

${scriptsStr}

### Installation & Running
If a package.json is detected, install dependencies and run the project:
\`\`\`bash
npm install
npm start  # or appropriate start script
\`\`\``
    : "Setup instructions are not clearly defined in the repository. Review package.json or build configuration files for specific instructions."
}

## Folder Structure
\`\`\`
${structureStr}
\`\`\`

## Assets & Visuals
${assetsStr}

## Contributing
Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License
Check the LICENSE file for details.

---

**Note:** This README was generated from repository metadata and code signals. For detailed setup or advanced features, review the documentation or code comments.
`;
}

export async function POST(req) {
  try {
    // Ensure MongoDB connection
    await connectMongo();

    const session = await getServerSession(authOptions);

    if (!session?.user?.githubId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findOne({ githubId: session.user.githubId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const {
      owner,
      repo,
      repoSnapshot,
      commitToRepo = false,
      githubToken,
    } = body;

    if (!owner || !repo) {
      return NextResponse.json(
        { error: "Owner and repo are required" },
        { status: 400 },
      );
    }

    const plan = user.plan || "free";

    /* 🔐 PLAN GUARD */
    if (commitToRepo && plan !== "pro_plus") {
      return NextResponse.json(
        { error: "Direct commit is Pro++ only" },
        { status: 403 },
      );
    }

    /* 📊 USAGE */
    const date = today();
    const usage = await Usage.findOneAndUpdate(
      { userId: user.id, date },
      { $setOnInsert: { userId: user.id, date, readmeGenerateCount: 0 } },
      { upsert: true, new: true },
    );

    if (usage.readmeGenerateCount >= DAILY_LIMIT[plan]) {
      return NextResponse.json(
        { error: "Daily README limit reached" },
        { status: 429 },
      );
    }

    const headers = getGitHubHeaders(githubToken);

    // Collect data from GitHub API (single pass - no double fetching)
    const [apiMeta, pkg, assets] = await Promise.all([
      collectMeta({ owner, repo, headers }).catch(() => null),
      collectPackage({ owner, repo, headers }).catch(() => null),
      collectAssets({ owner, repo, headers }).catch(() => []),
    ]);

    // Get default branch from meta before fetching structure
    const defaultBranch = apiMeta?.defaultBranch || "main";
    const structure = await collectStructure({
      owner,
      repo,
      branch: defaultBranch,
      headers,
    }).catch(() => []);

    // Fallback to provided snapshot if API fails (respects user-provided data)
    const meta = apiMeta || {
      name: repoSnapshot?.name || repo,
      description: repoSnapshot?.description || "",
      topics: repoSnapshot?.topics || [],
      stars: repoSnapshot?.stars || 0,
      forks: repoSnapshot?.forks || 0,
      language: repoSnapshot?.language || null,
      owner,
      visibility: "public",
    };

    // Build snapshot with proper schema
    const snapshot = buildSnapshot({
      meta,
      structure,
      packageInfo: pkg || {},
      assets,
    });

    const prompt = buildReadmePrompt(snapshot);
    const readmeContent = await runAI(prompt);

    if (!readmeContent || readmeContent.length < 80) {
      throw new Error("README generation produced insufficient content");
    }

    /* 📈 USAGE++ */
    usage.readmeGenerateCount += 1;
    await usage.save();

    /* 🚀 PRO++ COMMIT */
    if (commitToRepo) {
      await commitReadmeToGitHub({
        githubToken,
        repoFullName: `${owner}/${repo}`,
        content: readmeContent,
      });
    }

    return NextResponse.json({
      success: true,
      readme: readmeContent,
      committed: commitToRepo,
      snapshotUsed: snapshot,
    });
  } catch (err) {
    console.error("README GEN ERROR:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 },
    );
  }
}
