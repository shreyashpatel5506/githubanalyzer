import { NextResponse } from "next/server";
import { runAI } from "../ai/router";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectMongo from "@/app/config/db";
import User from "@/app/models/user";
import Usage from "@/app/models/Usage";

const FREE_DAILY_SCAN_LIMIT = 5;

/* ---------------- HELPERS ---------------- */

function extractSection(text, title) {
  const regex = new RegExp(`## ${title}[\\s\\S]*?(?=##|$)`, "i");
  const match = text.match(regex);
  return match ? match[0].replace(`## ${title}`, "").trim() : "";
}

function extractScore(text, label) {
  const regex = new RegExp(`${label}\\s*:?\\s*(\\d+(?:\\.\\d)?)\\/10`, "i");
  const match = text.match(regex);
  if (!match) return 7; // safe motivational default
  return Math.min(9, Math.max(6, Number(match[1])));
}

function parseBulletSections(text) {
  if (!text) return [];
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/\*\*(.+?)\*\*:?\\s*(.*)/);
      return m
        ? { title: m[1], description: m[2] }
        : { title: "Observation", description: line };
    });
}

function parseFixPlan(text) {
  if (!text) return [];
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const time = line.match(/Hour[s]?\\s*(.*?)(?:\\(|—|-))/i)?.[1] || "Phase";
      return {
        phase: time,
        goal: line,
        deliverables: [],
      };
    });
}

/* ---------------- API ---------------- */

export async function POST(req) {
  try {
    await connectMongo();

    // 1️⃣ Get session
    const session = await getServerSession(authOptions);

    if (!session?.user?.githubId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2️⃣ Get user
    const user = await User.findOne({ githubId: session.user.githubId });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 3️⃣ Pro users = no limits
    if (user.plan !== "pro") {
      const today = new Date().toISOString().split("T")[0];

      let usage = await Usage.findOne({
        userId: user._id,
        date: today,
      });

      if (!usage) {
        usage = await Usage.create({
          userId: user._id,
          date: today,
          repoScansUsed: 0,
        });
      }

      if (usage.repoScansUsed >= FREE_DAILY_SCAN_LIMIT) {
        return NextResponse.json(
          {
            error: "Daily limit reached",
            message: "Free users can scan only 5 repositories per day.",
            limit: FREE_DAILY_SCAN_LIMIT,
          },
          { status: 403 }
        );
      }
    }

    const { repoDetails } = await req.json();
    if (!repoDetails) {
      return NextResponse.json(
        { error: "Repo details missing" },
        { status: 400 }
      );
    }

    const prompt = `
You are a Principal Engineer, Open Source Maintainer, and Hiring Manager.

Analyze this GitHub repository as if YOU are responsible for its success.

Repository:
- Name: ${repoDetails.name}
- Description: ${repoDetails.description || "No description"}
- Tech Stack: ${repoDetails.language || "Unknown"}
- Stars: ${repoDetails.stars || 0}
- Forks: ${repoDetails.forks || 0}

CRITICAL RULES:
- Speak with ownership ("If I were maintaining this repo...")
- No AI fluff, no generic praise
- Scores represent readiness & trajectory (6–9 range only)
- Do NOT judge — guide like a mentor
- Simple English + light Hinglish allowed
- No JSON, ONLY markdown

RETURN IN THIS EXACT FORMAT:

## Overall Verdict

## Project Trajectory Scores
Maintainability: X/10
Security: X/10
Documentation: X/10
Scalability: X/10
Code Quality: X/10

## What Is Blocking This Repo From Being Production-Grade
- **Title**: explanation
- **Title**: explanation

## Strengths Worth Preserving
- **Title**: explanation
- **Title**: explanation

## High-Impact Improvements (No Feature Cuts)
- **Title**: explanation
- **Title**: explanation

## 48-Hour Maintainer Fix Plan
Hour 0–6 (Critical)
Hour 6–12 (High)
Hour 12–24 (Medium)
Hour 24–48 (Polish)

## Career Impact
`;

    const analysis = await runAI(prompt);
    // ✅ Increment usage AFTER successful scan
    if (user.plan !== "pro") {
      const today = new Date().toISOString().split("T")[0];

      await Usage.findOneAndUpdate(
        { userId: user._id, date: today },
        { $inc: { repoScansUsed: 1 } },
        { upsert: true }
      );
    }

    /* -------- SCORES (LABEL BASED) -------- */
    const scores = {
      maintainability: extractScore(analysis, "Maintainability"),
      security: extractScore(analysis, "Security"),
      documentation: extractScore(analysis, "Documentation"),
      scalability: extractScore(analysis, "Scalability"),
      codeQuality: extractScore(analysis, "Code Quality"),
    };

    /* -------- SECTIONS -------- */
    const verdict = extractSection(analysis, "Overall Verdict");
    const blockersRaw = extractSection(
      analysis,
      "What Is Blocking This Repo From Being Production-Grade"
    );
    const strengthsRaw = extractSection(analysis, "Strengths Worth Preserving");
    const improvementsRaw = extractSection(
      analysis,
      "High-Impact Improvements (No Feature Cuts)"
    );
    const fixPlanRaw = extractSection(analysis, "48-Hour Maintainer Fix Plan");
    const career = extractSection(analysis, "Career Impact");

    return NextResponse.json({
      scores,
      sections: {
        executiveVerdict: verdict,
        strengths: parseBulletSections(strengthsRaw),
        criticalGaps: parseBulletSections(blockersRaw),
        areasForImprovement: parseBulletSections(improvementsRaw),
        fixPlan48h: parseFixPlan(fixPlanRaw),
        careerImpact: career,
      },
      rawAnalysis: analysis, // debug / future-proofing
    });
  } catch (error) {
    console.error("AI ERROR:", error);
    return NextResponse.json(
      {
        error: "AI analysis failed",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
