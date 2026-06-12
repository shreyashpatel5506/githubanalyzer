import { NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase';
import { checkAndIncrementLimit, hasFeatureAccess } from '@/app/lib/billing';
import { resolveUserPlan } from '@/app/lib/entitlements';
import { runAI } from '@/app/lib/ai-client';
import { getSessionUser } from '@/app/lib/auth-server';
export async function POST(req) {
    try {
        const { scanId } = await req.json();
        const sessionUser = await getSessionUser();
        const userId = sessionUser === null || sessionUser === void 0 ? void 0 : sessionUser.userId;
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const supabase = createAdminClient();
        const plan = await resolveUserPlan(userId, supabase);
        if (!hasFeatureAccess(plan, 'security_scan')) {
            return NextResponse.json({ error: 'Upgrade to PRO for Security Scanning' }, { status: 403 });
        }
        await checkAndIncrementLimit(userId, plan, 'security_scan', 'security_scans');
        const { data: scan } = await supabase
            .from('repo_scans')
            .select('*, repositories(*)')
            .eq('id', scanId)
            .single();
        if (!scan || scan.requested_by_user_id !== userId) {
            return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
        }
        const repo = scan.repositories;
        const prompt = `Perform security vulnerability scanning:

Repository: ${repo.full_name}
Language: ${repo.language}

Find vulnerabilities:
- SQL injection risks
- XSS vulnerabilities
- Hardcoded secrets
- Insecure dependencies
- Authentication issues

Return JSON array:
[
  {
    "severity": "critical",
    "issue_type": "sql-injection",
    "description": "User input not sanitized",
    "remediation": "Use parameterized queries"
  }
]`;
        const analysis = await runAI(prompt);
        let issues = [];
        try {
            issues = analysis ? JSON.parse(analysis) : [];
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'JSON parse error';
            console.warn(`[Security Scan] Failed to parse AI response: ${message}`);
            issues = [];
        }
        for (const issue of issues) {
            await supabase.from('security_issues').insert({
                repo_scan_id: scanId,
                severity: issue.severity,
                issue_type: issue.issue_type,
                description: issue.description,
                remediation: issue.remediation
            });
        }
        return NextResponse.json({ success: true, issuesFound: issues.length });
    }
    catch (error) {
        console.error('Security scan error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
