import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

Analyze this GitHub repository for:
- Open Source readiness
- Resume value
- Production quality

Repository:
Name: ${repoDetails.name}
Description: ${repoDetails.description || "No description"}
Tech Stack: ${repoDetails.language || "Unknown"}
Stars: ${repoDetails.stars || 0}
Forks: ${repoDetails.forks || 0}

RULES:
- No sugar coating
- Use simple English + Hinglish ("ye missing hai", "ye karo")
- Be practical

Return MARKDOWN in this EXACT structure:

## Overall Verdict
(Strong / Average / Weak + one line)

## Health Scores (0–10)
Maintainability:
Security:
Documentation:
Scalability:
Code Quality:

## What Is MISSING
(bullet list)

## 48-Hour Fix Plan
Day 1:
Day 2:

## Career Impact Advice
(Resume + recruiter POV)
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
    });

    const analysis = completion.choices[0].message.content;

    // 🔥 SCORE EXTRACTION (SAFE)
    const nums = analysis.match(/\b([0-9]|10)\b/g)?.map(Number) || [];

    const scores = {
      maintainability: nums[0] ?? 0,
      security: nums[1] ?? 0,
      documentation: nums[2] ?? 0,
      scalability: nums[3] ?? 0,
      codeQuality: nums[4] ?? 0,
    };

    return NextResponse.json({
      analysis,
      scores,
    });
  } catch (error) {
    console.error("OpenAI Error:", error);

    return NextResponse.json(
      {
        error: "AI analysis failed",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
