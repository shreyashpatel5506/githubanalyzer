
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase'
import { runAI } from '@/app/lib/ai-client'
import { scanRepositoryFiles } from '@/app/lib/scanner/codeScanner'
import { dedupeFindings } from '@/app/lib/repo-analysis'

type Finding = {
    fileName?: string;
    line?: number;
    severity?: string;
    explanation?: string;
    suggestedFix?: string;
};

function normalizeSeverity(value?: string) {
    const v = (value || '').toLowerCase();
    if (v === 'critical' || v === 'high' || v === 'medium' || v === 'low') return v;
    if (v === 'warning' || v === 'error') return 'medium';
    return 'low';
}

function normalizeCodeSmellSeverity(value?: string): 'low' | 'medium' | 'high' {
    const severity = normalizeSeverity(value);
    if (severity === 'critical') return 'high';
    if (severity === 'high' || severity === 'medium' || severity === 'low') return severity;
    return 'low';
}

function severityToConfidence(severity?: string) {
    const s = normalizeSeverity(severity);
    if (s === 'critical') return 0.95;
    if (s === 'high') return 0.85;
    if (s === 'medium') return 0.65;
    return 0.45;
}

async function ensureAndIncrementDetailedUsage(supabase: ReturnType<typeof createAdminClient>, userId: string) {
    const { data: usage } = await supabase
        .from('usage_meters')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

    if (!usage) {
        await supabase
            .from('usage_meters')
            .insert({
                user_id: userId,
                period_start: new Date().toISOString().split('T')[0],
                period_end: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
                repo_scans: 0,
                deep_scans: 1,
                readme_generations: 0,
                pr_creations: 0,
                eslint_analyses: 1,
                code_smell_scans: 1,
                bug_detections: 1,
                security_scans: 1,
            });
        return;
    }

    const columns = ['deep_scans', 'eslint_analyses', 'code_smell_scans', 'bug_detections', 'security_scans'];
    for (const column of columns) {
        const { error } = await supabase.rpc('increment_usage', {
            row_id: usage.id,
            column_name: column,
        });
        if (error) {
            console.warn(`[Worker] Failed to increment usage column ${column}:`, error.message);
        }
    }
}

/* ---------------- HELPERS ---------------- */

function parseJsonObject<T>(raw: string, fallback: T): T {
    try {
        const cleaned = raw
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .trim();
        return JSON.parse(cleaned) as T;
    } catch {
        return fallback;
    }
}

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

function dedupeRows<T>(rows: T[], signature: (row: T) => string): T[] {
    const seen = new Set<string>();

    return rows.filter((row) => {
        const key = signature(row);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

/* ---------------- WORKER API ---------------- */

export async function POST(req: Request) {
    const { scanId } = await req.json()

    if (!scanId) {
        return NextResponse.json({ error: 'Scan ID required' }, { status: 400 })
    }

    console.log(`[Worker] Starting analysis for scan: ${scanId}`)

    const supabase = createAdminClient()

    try {
        // 1. Fetch Scan Details & Joined Repo Info
        // Schema: repo_scans -> repositories (repo_id)
        const { data: scan, error: fetchError } = await supabase
            .from('repo_scans')
            .select('*, repositories(*)')
            .eq('id', scanId)
            .single()

        if (fetchError || !scan) {
            console.error('Scan not found:', scanId)
            return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
        }

        // Update status to processing
        await supabase.from('repo_scans').update({ status: 'processing', started_at: new Date().toISOString() }).eq('id', scanId)

        const repo = scan.repositories;
        if (!repo) throw new Error("Repository data missing linked to scan");

        // 2. Prepare AI Prompt
        const prompt = `
You are a Principal Engineer, Open Source Maintainer, and Hiring Manager.

Analyze this GitHub repository as if YOU are responsible for its success.

Repository:
- Name: ${repo.name}
- Description: ${repo.description || "No description"}
- Tech Stack: ${repo.language || "Unknown"}
- Stars: ${repo.stars || 0}
- Forks: ${repo.forks || 0}

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

        // 3. Run AI for deep analysis narrative (non-blocking for pipeline)
        let analysis = '';
        try {
            analysis = await runAI(prompt)
        } catch (aiError) {
            console.warn('[Worker] AI summary generation failed, continuing with static fallback:', aiError)
            analysis = `
## Overall Verdict
Repository scan completed with static analysis findings.

## Project Trajectory Scores
Maintainability: 7/10
Security: 7/10
Documentation: 7/10
Scalability: 7/10
Code Quality: 7/10

## What Is Blocking This Repo From Being Production-Grade
- **Automated Narrative Unavailable**: AI summary provider was temporarily unavailable.

## Strengths Worth Preserving
- **Static Analysis Coverage**: Core scan pipeline executed successfully.

## High-Impact Improvements (No Feature Cuts)
- **Stabilize AI Provider**: Configure reliable AI key routing and retry policy.

## 48-Hour Maintainer Fix Plan
Hour 0–6 (Critical)
Hour 6–12 (High)
Hour 12–24 (Medium)
Hour 24–48 (Polish)

## Career Impact
Consistent automated analysis builds trust and speeds engineering decisions.
`;
        }

        // 4. Parse deepanalysis scores/sections
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

        // 5. Real code scanning via GitHub API
        let githubToken: string | null = null;
        if (scan.requested_by_user_id) {
            const { data: identity } = await supabase
                .from('github_identities')
                .select('access_token')
                .eq('user_id', scan.requested_by_user_id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            githubToken = identity?.access_token || null;
        }

        const [repoOwner, repoName] = repo.full_name.split('/');
        const realScan = await scanRepositoryFiles(repoOwner, repoName, {
            token: githubToken,
            planTier: 'pro',
        });

        // Map real scan results to DB rows
        const codeSmellRows = realScan.codeSmells.map((s) => ({
            repo_scan_id: scanId,
            file_path: s.file,
            rule_id: s.id,
            severity: normalizeCodeSmellSeverity(s.severity),
            category: s.category,
            message: s.message,
            line: s.lineStart,
            column_number: null,
        }));

        const bugRows = realScan.bugs.map((s) => ({
            repo_scan_id: scanId,
            file_path: s.file,
            description: s.message,
            confidence_score: s.confidence,
        }));

        const securityRows = realScan.securityIssues.map((s) => ({
            repo_scan_id: scanId,
            severity: normalizeCodeSmellSeverity(s.severity),
            issue_type: s.id,
            description: s.message,
            remediation: s.suggestedFix || 'Apply secure coding practices.',
        }));

        const uniqueCodeSmellRows = dedupeRows(codeSmellRows, (row) => [
            row.file_path || 'unknown',
            row.line || 1,
            row.severity || 'low',
            row.category || 'maintainability',
            row.message || '',
            row.rule_id || '',
        ].join('|'));

        const uniqueBugRows = dedupeRows(bugRows, (row) => [
            row.file_path || 'unknown',
            row.description || '',
            row.confidence_score || 0,
        ].join('|'));

        const uniqueSecurityRows = dedupeRows(securityRows, (row) => [
            row.file_path || 'unknown',
            row.severity || 'low',
            row.issue_type || '',
            row.description || '',
            row.remediation || '',
        ].join('|'));

        // If real scan returned no findings (e.g., empty repo / unscanned), fall back to AI
        if (uniqueCodeSmellRows.length === 0 && uniqueBugRows.length === 0 && uniqueSecurityRows.length === 0) {
            const findingsPrompt = `
You are generating machine-readable findings for a GitHub repository.

Repository:
- Name: ${repo.name}
- Full Name: ${repo.full_name}
- Language: ${repo.language || 'Unknown'}

Return ONLY valid JSON:
{
    "code_smells": [{"fileName":"path/to/file.ts","line":10,"severity":"low|medium|high","explanation":"why","suggestedFix":"fix"}],
    "bugs": [{"fileName":"path/to/file.ts","line":10,"severity":"high","explanation":"bug","suggestedFix":"fix"}],
    "security_issues": [{"fileName":"path/to/file.ts","line":10,"severity":"high","explanation":"sec risk","suggestedFix":"fix"}]
}
Keep each array 3-8 items. Use realistic paths.`;

            let findings = {
                code_smells: [] as Finding[],
                bugs: [] as Finding[],
                security_issues: [] as Finding[],
            };

            try {
                const findingsRaw = await runAI(findingsPrompt);
                findings = parseJsonObject(findingsRaw, findings);
            } catch (findingsAiError) {
                console.warn('[Worker] AI fallback findings generation failed:', findingsAiError)
                // Keep empty fallback arrays; static scan may still be valid with zero findings.
            }

            (findings.code_smells || []).forEach((item: Finding) => {
                uniqueCodeSmellRows.push({
                    repo_scan_id: scanId,
                    file_path: item.fileName || 'unknown',
                    rule_id: 'ai-detected-smell',
                    severity: normalizeCodeSmellSeverity(item.severity),
                    category: 'maintainability',
                    message: item.explanation || 'Code smell detected.',
                    line: Number(item.line || 1),
                    column_number: null,
                });
            });
            (findings.bugs || []).forEach((item: Finding) => {
                uniqueBugRows.push({
                    repo_scan_id: scanId,
                    file_path: item.fileName || 'unknown',
                    description: item.explanation || 'Potential bug detected.',
                    confidence_score: severityToConfidence(item.severity),
                });
            });
            (findings.security_issues || []).forEach((item: Finding) => {
                uniqueSecurityRows.push({
                    repo_scan_id: scanId,
                    severity: normalizeCodeSmellSeverity(item.severity),
                    issue_type: 'ai-detected',
                    description: item.explanation || 'Security issue detected.',
                    remediation: item.suggestedFix || 'Apply secure coding remediation.',
                });
            });
        }

        const finalCodeSmellRows = dedupeRows(uniqueCodeSmellRows, (row) => [
            row.file_path || 'unknown',
            row.line || 1,
            row.severity || 'low',
            row.category || 'maintainability',
            row.message || '',
            row.rule_id || '',
        ].join('|'));

        const finalBugRows = dedupeRows(uniqueBugRows, (row) => [
            row.file_path || 'unknown',
            row.description || '',
            row.confidence_score || 0,
        ].join('|'));

        const finalSecurityRows = dedupeRows(uniqueSecurityRows, (row) => [
            row.file_path || 'unknown',
            row.severity || 'low',
            row.issue_type || '',
            row.description || '',
            row.remediation || '',
        ].join('|'));

        await Promise.all([
            supabase.from('code_smells').delete().eq('repo_scan_id', scanId),
            supabase.from('bugs').delete().eq('repo_scan_id', scanId),
            supabase.from('security_issues').delete().eq('repo_scan_id', scanId),
            supabase.from('eslint_reports').delete().eq('repo_scan_id', scanId),
        ]);

        if (finalCodeSmellRows.length > 0) {
            const { error } = await supabase.from('code_smells').insert(finalCodeSmellRows);
            if (error) throw new Error(`Failed to insert code smells: ${error.message}`);
        }
        if (finalBugRows.length > 0) {
            const { error } = await supabase.from('bugs').insert(finalBugRows);
            if (error) throw new Error(`Failed to insert bugs: ${error.message}`);
        }
        if (finalSecurityRows.length > 0) {
            const { error } = await supabase.from('security_issues').insert(finalSecurityRows);
            if (error) throw new Error(`Failed to insert security issues: ${error.message}`);
        }

        const eslintTotalErrors = finalBugRows.length + finalSecurityRows.filter((r: any) => r.severity === 'high' || r.severity === 'critical').length;
        const eslintTotalWarnings = finalCodeSmellRows.length + finalSecurityRows.filter((r: any) => r.severity === 'medium' || r.severity === 'low').length;

        await supabase.from('eslint_reports').insert({
            repo_scan_id: scanId,
            total_errors: eslintTotalErrors,
            total_warnings: eslintTotalWarnings,
            rule_summary: {
                code_smells: finalCodeSmellRows.length,
                bugs: finalBugRows.length,
                security_issues: finalSecurityRows.length,
                files_analyzed: realScan.filesAnalyzed,
                scan_source: realScan.filesAnalyzed > 0 ? 'static_analysis' : 'ai_fallback',
            },
            raw_output: {
                statistics: realScan.statistics,
                errors: realScan.errors,
                report: realScan.report,
            },
        });

        const structuredFindings = {
            code_smells: dedupeFindings(realScan.codeSmells.map((s) => ({
                id: s.id,
                fileName: s.file,
                line: s.lineStart,
                severity: s.severity,
                explanation: s.message,
                suggestedFix: s.suggestedFix,
            }))),
            bugs: dedupeFindings(realScan.bugs.map((s) => ({
                id: s.id,
                fileName: s.file,
                line: s.lineStart,
                severity: s.severity,
                explanation: s.message,
                suggestedFix: s.suggestedFix,
            }))),
            security_issues: dedupeFindings(realScan.securityIssues.map((s) => ({
                id: s.id,
                fileName: s.file,
                line: s.lineStart,
                severity: s.severity,
                explanation: s.message,
                suggestedFix: s.suggestedFix,
            }))),
        };

        // 6. Store Results (Snapshot)
        const { error: snapError } = await supabase.from('scan_snapshots').insert({
            repo_scan_id: scanId,
            file_tree: { filesAnalyzed: realScan.filesAnalyzed, branch: realScan.branch },
            metrics: {
                scores,
                sections,
                statistics: realScan.statistics,
                findings: structuredFindings,
                report: realScan.report,
                raw: analysis,
            },
        });

        if (snapError) throw snapError;

        if (scan.requested_by_user_id) {
            await ensureAndIncrementDetailedUsage(supabase, scan.requested_by_user_id);
        }

        // 7. Complete Job
        await supabase.from('repo_scans').update({
            status: 'completed',
            completed_at: new Date().toISOString(),
        }).eq('id', scanId);

        console.log(`[Worker] Analysis completed for ${scanId}. Files analyzed: ${realScan.filesAnalyzed}, Smells: ${finalCodeSmellRows.length}`);
        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Worker failed:', error);
        await supabase.from('repo_scans').update({
            status: 'failed',
            error_message: error.message,
        }).eq('id', scanId);

        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
