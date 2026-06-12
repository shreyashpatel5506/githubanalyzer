import { NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase';
import { hasFeatureAccess } from '@/app/lib/billing';
import { resolveUserPlan } from '@/app/lib/entitlements';
import { dedupeFindings, findingsFromSnapshot, normalizeBugRow, sortBySeverity } from '@/app/lib/repo-analysis';
import { getSessionUser } from '@/app/lib/auth-server';
export async function GET(req, { params }) {
    var _a;
    try {
        const sessionUser = await getSessionUser();
        const userId = sessionUser === null || sessionUser === void 0 ? void 0 : sessionUser.userId;
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const supabase = createAdminClient();
        const plan = await resolveUserPlan(userId, supabase);
        if (!hasFeatureAccess(plan, 'bug_detection')) {
            return NextResponse.json({ error: 'Upgrade to PRO for Bug Detection' }, { status: 403 });
        }
        const { owner, repo } = await params;
        const { data: repository } = await supabase
            .from('repositories')
            .select('id')
            .eq('owner_username', owner)
            .eq('name', repo)
            .single();
        if (!repository) {
            return NextResponse.json({ bugs: [] });
        }
        const { data: latestCompletedScan } = await supabase
            .from('repo_scans')
            .select('id, created_at')
            .eq('repo_id', repository.id)
            .eq('requested_by_user_id', userId)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (!(latestCompletedScan === null || latestCompletedScan === void 0 ? void 0 : latestCompletedScan.id)) {
            return NextResponse.json({ bugs: [] });
        }
        const { data: latestSnapshot } = await supabase
            .from('scan_snapshots')
            .select('metrics, file_tree')
            .eq('repo_scan_id', latestCompletedScan.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        const scannedBranch = ((_a = latestSnapshot === null || latestSnapshot === void 0 ? void 0 : latestSnapshot.file_tree) === null || _a === void 0 ? void 0 : _a.branch) ||
            'main';
        const { data: bugs } = await supabase
            .from('bugs')
            .select('*')
            .eq('repo_scan_id', latestCompletedScan.id)
            .order('confidence_score', { ascending: false });
        let normalized = dedupeFindings((bugs || []).map(normalizeBugRow));
        if (normalized.length === 0) {
            normalized = dedupeFindings(findingsFromSnapshot(latestSnapshot === null || latestSnapshot === void 0 ? void 0 : latestSnapshot.metrics, 'bugs'));
        }
        const { data: publishedSuggestions } = await supabase
            .from('pull_request_suggestions')
            .select('summary')
            .eq('repo_id', repository.id)
            .eq('status', 'published');
        const resolvedIds = new Set();
        for (const suggestion of publishedSuggestions || []) {
            const summary = (suggestion === null || suggestion === void 0 ? void 0 : suggestion.summary) || '';
            const matches = summary.match(/\[\[RESOLVED:bug:([^\]]+)\]\]/g) || [];
            for (const marker of matches) {
                const idMatch = marker.match(/\[\[RESOLVED:bug:([^\]]+)\]\]/);
                if (idMatch === null || idMatch === void 0 ? void 0 : idMatch[1])
                    resolvedIds.add(idMatch[1]);
            }
        }
        const filtered = normalized.filter((finding) => !resolvedIds.has(String(finding.id)));
        return NextResponse.json({ bugs: sortBySeverity(filtered), scannedBranch });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Bugs fetch error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
