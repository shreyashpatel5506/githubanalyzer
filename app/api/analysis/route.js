import { NextResponse } from "next/server";
import { runAI } from "../ai/router";

function getSection(text, title) {
  const regex = new RegExp(`## ${title}[\\s\\S]*?(?=##|$)`, "i");
  const match = text.match(regex);
  return match ? match[0].replace(`## ${title}`, "").trim() : "";
}

export async function POST(req) {
  try {
    const { repoDetails } = await req.json();

    if (!repoDetails) {
      return NextResponse.json(
        { error: "Repo details missing" },
        { status: 400 }
      );
    }

    const prompt = `
You are a brutally honest Senior Open Source Maintainer and Career Mentor.

Analyze this GitHub repository:

Name: ${repoDetails.name}
Description: ${repoDetails.description || "No description"}
Tech Stack: ${repoDetails.language || "Unknown"}
Stars: ${repoDetails.stars || 0}
Forks: ${repoDetails.forks || 0}

RULES:
- No sugar coating
- Simple English + Hinglish
- Practical advice only

Return MARKDOWN in this EXACT structure:

## Overall Verdict

## Health Scores (0–10)
Maintainability:
Security:
Documentation:
Scalability:
Code Quality:

## What Is MISSING

## 48-Hour Fix Plan

## Career Impact Advice
`;

    const analysis = await runAI(prompt);

    // 🔢 Extract numbers safely
    const nums = analysis.match(/\b(10|[0-9])\b/g)?.map(Number) || [];

    const scores = {
      maintainability: nums[0] ?? 0,
      security: nums[1] ?? 0,
      documentation: nums[2] ?? 0,
      scalability: nums[3] ?? 0,
      codeQuality: nums[4] ?? 0,
    };

    const sections = {
      verdict: getSection(analysis, "Overall Verdict"),
      missing: getSection(analysis, "What Is MISSING"),
      fixPlan: getSection(analysis, "48-Hour Fix Plan"),
      career: getSection(analysis, "Career Impact Advice"),
    };

    return NextResponse.json({
      scores,
      sections,
      rawAnalysis: analysis,
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
