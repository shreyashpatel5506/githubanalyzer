import OpenAI from "openai";
import { NextResponse } from "next/server";
import { runAI } from "../ai/router";

export async function POST(req) {
  try {
    const { profile, repos, pullRequests, recentActivity } = await req.json();

    if (!profile || !repos) {
      return NextResponse.json(
        { error: "Invalid profile data" },
        { status: 400 }
      );
    }

    /* ------------------ PROMPT ------------------ */

    const prompt = `
You are a Senior Open Source Maintainer, Tech Recruiter, and Career Mentor.
You are known for being brutally honest but highly practical.

Analyze a COMPLETE GitHub PROFILE (not a single repository).

Return MARKDOWN in the EXACT structure below.
Do NOT add extra headings.
Do NOT rename any section.
Do NOT include emojis.

---

## Overall Verdict
Give a concise, honest summary of this GitHub profile.
Mention:
- How this profile looks in a 30-second recruiter scan
- The biggest strength and biggest weakness
- Level: (Beginner / Junior / Intermediate / Strong / Hire-Ready)

## Health Scores (0–10)
Consistency:
Project Quality:
Open Source:
Documentation:
Personal Branding:
Hiring Readiness:

## What Is Missing
Use bullet points.

## 30-Day Improvement Plan
Week-by-week plan with exact GitHub actions.

## Recruiter Perspective
- Would you shortlist this profile today?
- For what role?
- ONE change that increases hiring chances most

---

GitHub Profile Data:
Username: ${profile.username}
Followers: ${profile.followers}
Following: ${profile.following}
Public Repos: ${profile.publicRepos}

Pull Requests:
Open: ${pullRequests?.open || 0}
Merged: ${pullRequests?.merged || 0}

Recent Activity:
Commits: ${recentActivity?.commits || 0}
Active Repos: ${recentActivity?.activeRepositories || 0}

Repositories Summary:
${repos
  .slice(0, 10)
  .map(
    (r) =>
      `- ${r.name}: ⭐ ${r.stars}, 🍴 ${r.forks}, ${
        r.description || "No description"
      }`
  )
  .join("\n")}
`;

    /* ------------------ OPENAI CALL ------------------ */
    const analysisText = await runAI(prompt);

    /* ------------------ HELPERS ------------------ */

    const extractSection = (title) => {
      const regex = new RegExp(`## ${title}[\\s\\S]*?(?=##|$)`, "i");
      const match = analysisText.match(regex);
      return match ? match[0].replace(`## ${title}`, "").trim() : "";
    };

    function extractScores(text) {
      const blockMatch = text.match(/## Health Scores[\s\S]*?(?=##|$)/i);

      if (!blockMatch) {
        return {
          consistency: 0,
          projectQuality: 0,
          openSource: 0,
          documentation: 0,
          branding: 0,
          hiringReadiness: 0,
        };
      }

      const block = blockMatch[0];

      const get = (label) => {
        const match = block.match(new RegExp(`${label}:\\s*(10|[0-9])`, "i"));
        return match ? Number(match[1]) : 0;
      };

      return {
        consistency: get("Consistency"),
        projectQuality: get("Project Quality"),
        openSource: get("Open Source"),
        documentation: get("Documentation"),
        branding: get("Personal Branding"),
        hiringReadiness: get("Hiring Readiness"),
      };
    }

    /* ------------------ BUILD RESPONSE ------------------ */

    const verdictRaw = extractSection("Overall Verdict");

    const levelMatch = verdictRaw.match(
      /(Beginner|Junior|Intermediate|Strong|Hire-Ready)/i
    );

    const analysis = {
      verdict: {
        level: levelMatch?.[0] || "Unknown",
        summary: verdictRaw,
      },
      scores: extractScores(analysisText),
      missing: extractSection("What Is Missing"),
      plan: extractSection("30-Day Improvement Plan"),
      recruiter: extractSection("Recruiter Perspective"),
      raw: analysisText,
    };

    return NextResponse.json({ analysis });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      {
        error: "Profile AI analysis failed",
        details: err.message,
      },
      { status: 500 }
    );
  }
}
