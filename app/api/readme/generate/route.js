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
import { scanRepository } from "@/app/lib/scanner/codeScanner.js";
import { getOrStartScan } from "@/app/lib/repositoryCache.js";
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

function buildReadmePrompt(scanResult) {
  return `You are a senior open-source maintainer and technical writer.

Your task is to generate a professional GitHub README.md
using ONLY the provided repository analysis data.

════════════════════════════════════
STRICT NON-NEGOTIABLE RULES
════════════════════════════════════
- Use ONLY the provided JSON data
- DO NOT invent features
- DO NOT guess setup steps
- DO NOT assume APIs or commands
- DO NOT use marketing language
- DO NOT add emojis
- DO NOT speculate
- Output GitHub-flavored Markdown only
- Accuracy > Completeness

If something is unclear or missing, explicitly state that.

════════════════════════════════════
SOURCE OF TRUTH (DO NOT IGNORE)
════════════════════════════════════
The following JSON represents:
- All scanned files
- All detected code smells
- All known APIs and UI routes
- All metrics and statistics

${JSON.stringify(scanResult, null, 2)}

════════════════════════════════════
README STRUCTURE (EXACT ORDER)
════════════════════════════════════

# 1. Project Title
Use:
- metadata.name

# 2. Overview
Write a concise technical overview using:
- metadata.description
- detected application purpose
- detected frontend + backend structure

Do NOT exaggerate.
Do NOT market.

# 3. Core Features
Derive features ONLY from:
- app/api routes
- app/repo/[owner]/[repo] pages
- detected UI flows
- detected AI analysis endpoints

List features like:
- Repository analysis
- Code smell detection
- Bug & reliability analysis
- Security checks
- README generation
ONLY if supported by data.

# 4. Architecture Overview
Explain:
- Frontend (Next.js app router structure)
- Backend API routes
- AI analysis pipeline
- Scan → Snapshot → Reuse model

Use file paths as evidence.

# 5. Tech Stack
Use ONLY:
- metadata.language
- detected dependencies (from files if present)
- framework usage inferred from file structure

If something is unknown, say so.

# 6. Code Quality & Analysis
Summarize:
- statistics.filesAnalyzed
- statistics.totalSmells
- smellsBySeverity
- averageComplexity

Mention that detailed results are available in the UI.

# 7. Repository Structure
Summarize key directories:
- app/
- app/api/
- app/components/
- app/lib/
Explain their purpose briefly.

# 8. Setup & Development
Include steps ONLY if they can be safely inferred.
If not, say:
"Setup instructions are not explicitly defined in the repository."

# 9. Limitations
Mention:
- Rate limits
- Scope of analysis
- Supported languages (JavaScript / Web)

# 10. Contribution
Provide a minimal, neutral contribution guideline.

════════════════════════════════════
FINAL CHECK
════════════════════════════════════
- No assumptions
- No hallucinations
- Markdown only
- Developer-first tone
- Trustworthy and factual

Generate the README now.
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

    // 🔬 INTELLIGENCE: Fetch comprehensive code analysis (Cached & Coalesced)
    // This ensures README uses the exact same data as the "Code Smells" page.
    const analysis = await getOrStartScan(owner, repo, defaultBranch, async () => {
      // Note: We use the same token and plan as the user's session
      return await scanRepository(owner, repo, {
        branch: defaultBranch,
        token: githubToken,
        planTier: plan,
      });
    });

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

    // 📦 MERGE: Combine Metadata (Snapshot) + Intelligence (Analysis)
    const promptContext = {
      metadata: {
        ...snapshot, // name, description, techStack, scripts
        defaultBranch,
      },
      statistics: analysis?.statistics || { filesAnalyzed: 0, totalSmells: 0 },
      smells: analysis?.smells || [],
      files: analysis?.files || [], // Actual analyzed files
      structure: snapshot.structure, // Folder structure
      // scanResult might contain errors, but we proceed with available data
      analysisParams: {
        plan,
        timestamp: new Date().toISOString()
      }
    };

    const prompt = buildReadmePrompt(promptContext);
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
      data: {
        markdown: readmeContent,
        scan: {
          filesAnalyzed: promptContext.files?.length || 0,
          totalSmells: promptContext.smells?.length || 0,
          featuresDetected: snapshot.structure?.length || 0
        },
        snapshotUsed: snapshot,
        analysisUsed: {
          files: promptContext.files.length,
          smells: promptContext.smells.length
        }
      }
    });
  } catch (err) {
    console.error("README GEN ERROR:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 },
    );
  }
}
