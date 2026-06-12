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
        // PRO feature check
        if (!hasFeatureAccess(plan, 'bug_detection')) {
            return NextResponse.json({ error: 'Upgrade to PRO for Bug Detection' }, { status: 403 });
        }
        await checkAndIncrementLimit(userId, plan, 'bug_detection', 'bug_detections');
        const { data: scan } = await supabase
            .from('repo_scans')
            .select('*, repositories(*)')
            .eq('id', scanId)
            .single();
        if (!scan || scan.requested_by_user_id !== userId) {
            return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
        }
        const repo = scan.repositories;
        const prompt = `Detect potential bugs in this repository:

Repository: ${repo.full_name}
Language: ${repo.language}

Find bugs like:
- Null pointer dereferences
- Race conditions
- Memory leaks
- Off-by-one errors
- Unhandled exceptions

Return JSON array:
[
  {
    "file_path": "src/api.ts",
    "description": "Potential null pointer access",
    "confidence_score": 0.85
  }
]`;
        const analysis = await runAI(prompt);
        let bugs = [];
        try {
            bugs = analysis ? JSON.parse(analysis) : [];
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'JSON parse error';
            console.warn(`[Bug Detection] Failed to parse AI response: ${message}`);
            bugs = [];
        }
        for (const bug of bugs) {
            await supabase.from('bugs').insert({
                repo_scan_id: scanId,
                file_path: bug.file_path,
                description: bug.description,
                confidence_score: bug.confidence_score
            });
        }
        return NextResponse.json({ success: true, bugsFound: bugs.length });
    }
    catch (error) {
        console.error('Bug detection error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
