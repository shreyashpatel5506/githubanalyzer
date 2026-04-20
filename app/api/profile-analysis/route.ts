import { NextResponse } from "next/server";
import { callGroqWithRetry } from "@/app/lib/ai/groq";

export async function POST(req: Request) {
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

IMPORTANT RULES:
- Use clear, professional English
- No emojis
- No filler
- Follow the structure EXACTLY
- Do not rename or add sections

Return MARKDOWN in the EXACT structure below:

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
                    (r: any) =>
                        `- ${r.name}: ⭐ ${r.stars}, 🍴 ${r.forks}, ${r.description || "No description"
                        }`
                )
                .join("\n")}
`;

        /* ------------------ AI CALL (Groq) ------------------ */
        const analysisText = await callGroqWithRetry(prompt);

        /* ------------------ HELPERS ------------------ */

        const extractSection = (title: string) => {
            const regex = new RegExp(`## ${title}[\\s\\S]*?(?=##|$)`, "i");
            const match = analysisText.match(regex);
            return match ? match[0].replace(new RegExp(`## ${title}`, "i"), "").trim() : "";
        };

        const extractScores = (text: string) => {
            const blockMatch = text.match(/## Health Scores[\\s\\S]*?(?=##|$)/i);

            // helper → clamp score
            const normalize = (val: number) => {
                if (Number.isNaN(val)) return 6; // safe neutral
                if (val < 4) return 4; // floor
                if (val > 9) return 9; // ceiling
                return val;
            };

            const safeGet = (block: string, label: string) => {
                const m = block.match(new RegExp(`${label}:\\s*(10|[0-9])`, "i"));
                return normalize(m ? Number(m[1]) : 6);
            };

            if (!blockMatch) {
                // AI failed → still return positive-looking scores
                return {
                    consistency: 6,
                    projectQuality: 6,
                    openSource: 5,
                    documentation: 5,
                    branding: 5,
                    hiringReadiness: 6,
                };
            }

            const block = blockMatch[0];

            return {
                consistency: safeGet(block, "Consistency"),
                projectQuality: safeGet(block, "Project Quality"),
                openSource: safeGet(block, "Open Source"),
                documentation: safeGet(block, "Documentation"),
                branding: safeGet(block, "Personal Branding"),
                hiringReadiness: safeGet(block, "Hiring Readiness"),
            };
        };

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
            raw: analysisText, // debug / audit
        };

        return NextResponse.json({ analysis });
    } catch (err: any) {
        console.error("PROFILE AI ERROR:", err);
        return NextResponse.json(
            {
                error: "Profile AI analysis failed",
                details: err.message,
            },
            { status: 500 }
        );
    }
}
