
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase'
import { runAI } from '@/app/api/ai/router'

/* ---------------- HELPERS (Ported from Legacy) ---------------- */

function extractSection(text: string, title: string) {
    const regex = new RegExp(`## ${title}[\\s\\S]*?(?=##|$)`, "i");
    const match = text.match(regex);
    return match ? match[0].replace(`## ${title}`, "").trim() : "";
}

function extractScore(text: string, label: string) {
    const regex = new RegExp(`${label}\\s*:?\\s*(\\d+(?:\\.\\d)?)\\/10`, "i");
    const match = text.match(regex);
    if (!match) return 7; // safe motivational default
    return Math.min(9, Math.max(6, Number(match[1])));
}

function parseBulletSections(text: string) {
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

function parseFixPlan(text: string) {
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

/* ---------------- WORKER API ---------------- */

export async function POST(req: Request) {
    // Verify Internal/Admin security (simple shared key check)
    // In Vercel, you'd use CRON_SECRET or specific headers.
    // For now, we trust the caller has the Service Key or we just run it.

    const { scanId } = await req.json()

    if (!scanId) {
        return NextResponse.json({ error: 'Scan ID required' }, { status: 400 })
    }

    console.log(`[Worker] Starting analysis for scan: ${scanId}`)

    const supabase = createAdminClient()

    try {
        // 1. Fetch Scan Details
        const { data: scan, error: fetchError } = await supabase
            .from('scans')
            .select('*')
            .eq('id', scanId)
            .single()

        if (fetchError || !scan) {
            console.error('Scan not found:', scanId)
            return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
        }

        // Update status to processing
        await supabase.from('scans').update({ status: 'processing' }).eq('id', scanId)

        // 2. Prepare AI Prompt
        // Note: In a real system, we'd fetch the file tree here. 
        // For now, we use the repo metadata from the scan record + fetch generic info if needed.
        // The legacy code used `repoDetails` passed in the body.
        // We only have `repo_owner` and `repo_name` in the DB.
        // We assume the prompt is mostly generic or relies on external knowledge if `repoDetails` aren't full.
        // Wait, the legacy prompt relied on `repoDetails.language`, `stars`, `forks`, `description`.
        // We strictly only saved owner/name in `scans` table (as per schema).
        // FETCH MISSING DATA from GitHub (Free API)

        const ghRes = await fetch(`https://api.github.com/repos/${scan.repo_owner}/${scan.repo_name}`)
        if (!ghRes.ok) throw new Error('Failed to fetch GitHub metadata')
        const repoDetails = await ghRes.json()

        const prompt = `
You are a Principal Engineer, Open Source Maintainer, and Hiring Manager.

Analyze this GitHub repository as if YOU are responsible for its success.

Repository:
- Name: ${repoDetails.name}
- Description: ${repoDetails.description || "No description"}
- Tech Stack: ${repoDetails.language || "Unknown"}
- Stars: ${repoDetails.stargazers_count || 0}
- Forks: ${repoDetails.forks_count || 0}

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

        // 3. Run AI
        const analysis = await runAI(prompt)

        // 4. Parse Results
        const scores = {
            maintainability: extractScore(analysis, "Maintainability"),
            security: extractScore(analysis, "Security"),
            documentation: extractScore(analysis, "Documentation"),
            scalability: extractScore(analysis, "Scalability"),
            codeQuality: extractScore(analysis, "Code Quality"),
        }

        const sections = {
            executiveVerdict: extractSection(analysis, "Overall Verdict"),
            strengths: parseBulletSections(extractSection(analysis, "Strengths Worth Preserving")),
            criticalGaps: parseBulletSections(extractSection(analysis, "What Is Blocking This Repo From Being Production-Grade")),
            areasForImprovement: parseBulletSections(extractSection(analysis, "High-Impact Improvements (No Feature Cuts)")),
            fixPlan48h: parseFixPlan(extractSection(analysis, "48-Hour Maintainer Fix Plan")),
            careerImpact: extractSection(analysis, "Career Impact"),
        }

        // 5. Store Results (Snapshot)
        const { error: snapError } = await supabase.from('scan_snapshots').insert({
            scan_id: scanId,
            full_analysis: {
                scores,
                sections,
                raw: analysis
            },
            raw_file_tree: null // We didn't fetch the tree in this lightweight version
        })

        if (snapError) throw snapError

        // 6. Complete Job
        await supabase.from('scans').update({
            status: 'completed',
            // result_summary can store the verdict or scores for quick access
            result_summary: { scores, verdict: sections.executiveVerdict }
        }).eq('id', scanId)

        console.log(`[Worker] Analysis completed for ${scanId}`)
        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('Worker failed:', error)
        await supabase.from('scans').update({
            status: 'failed',
            error_message: error.message
        }).eq('id', scanId)

        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
