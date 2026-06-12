import { NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase';
import { getSessionUser } from '@/app/lib/auth-server';
export async function GET() {
    try {
        const sessionUser = await getSessionUser();
        const userId = sessionUser === null || sessionUser === void 0 ? void 0 : sessionUser.userId;
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const supabase = createAdminClient();
        // Get usage stats
        const { data: usage } = await supabase
            .from('usage_meters')
            .select('*')
            .eq('user_id', userId)
            .single();
        // Get all scans for this user once
        const { data: scans } = await supabase
            .from('repo_scans')
            .select('id')
            .eq('requested_by_user_id', userId);
        const scanIds = (scans === null || scans === void 0 ? void 0 : scans.map((s) => s.id)) || [];
        // Batch fetch all counts in parallel
        let bugsCount = 0;
        let securityCount = 0;
        let smellsCount = 0;
        if (scanIds.length > 0) {
            const [{ count: bugs }, { count: security }, { count: smells }] = await Promise.all([
                supabase
                    .from('bugs')
                    .select('*', { count: 'exact', head: true })
                    .in('repo_scan_id', scanIds),
                supabase
                    .from('security_issues')
                    .select('*', { count: 'exact', head: true })
                    .in('repo_scan_id', scanIds),
                supabase
                    .from('code_smells')
                    .select('*', { count: 'exact', head: true })
                    .in('repo_scan_id', scanIds),
            ]);
            bugsCount = bugs || 0;
            securityCount = security || 0;
            smellsCount = smells || 0;
        }
        return NextResponse.json({
            repoScans: (usage === null || usage === void 0 ? void 0 : usage.repo_scans) || 0,
            readmeGens: (usage === null || usage === void 0 ? void 0 : usage.readme_generations) || 0,
            eslintAnalyses: (usage === null || usage === void 0 ? void 0 : usage.eslint_analyses) || 0,
            codeSmellScans: (usage === null || usage === void 0 ? void 0 : usage.code_smell_scans) || 0,
            bugDetections: (usage === null || usage === void 0 ? void 0 : usage.bug_detections) || 0,
            securityScans: (usage === null || usage === void 0 ? void 0 : usage.security_scans) || 0,
            bugsFound: bugsCount,
            securityIssues: securityCount,
            codeSmellsFound: smellsCount,
        });
    }
    catch (error) {
        console.error('Stats error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
