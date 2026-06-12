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
        // Get user's scanned repos with scan counts
        const { data: scans } = await supabase
            .from('repo_scans')
            .select('repo_id, repositories(*), created_at')
            .eq('requested_by_user_id', userId)
            .order('created_at', { ascending: false });
        if (!scans || scans.length === 0) {
            return NextResponse.json({ repos: [] });
        }
        // Group by repo and count
        const repoMap = new Map();
        for (const scan of scans) {
            const repo = scan.repositories;
            // Handle both single object and array responses
            if (!repo || Array.isArray(repo))
                continue;
            if (!repoMap.has(repo.id)) {
                repoMap.set(repo.id, {
                    id: repo.id,
                    name: repo.name,
                    full_name: repo.full_name,
                    owner_username: repo.owner_username,
                    language: repo.language,
                    stars: repo.stars,
                    is_private: repo.is_private,
                    last_scanned: scan.created_at,
                    scan_count: 1
                });
            }
            else {
                const existing = repoMap.get(repo.id);
                if (existing)
                    existing.scan_count++;
            }
        }
        const repos = Array.from(repoMap.values());
        return NextResponse.json({ repos });
    }
    catch (error) {
        console.error('Repos list error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
