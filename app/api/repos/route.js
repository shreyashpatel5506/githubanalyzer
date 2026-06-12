import { NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase';
import { getOctokitForCurrentUser } from '@/app/lib/github-server';
import { getSessionUser } from '@/app/lib/auth-server';
import { Octokit } from 'octokit';
async function resolveGithubUsername(supabase, userId, email) {
    const { data: identity } = await supabase
        .from('github_identities')
        .select('username')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (identity === null || identity === void 0 ? void 0 : identity.username)
        return identity.username;
    if (email === null || email === void 0 ? void 0 : email.includes('@'))
        return email.split('@')[0];
    return null;
}
export async function GET() {
    var _a, _b, _c;
    try {
        const github = await getOctokitForCurrentUser();
        if (!github.ok || !github.userId || !github.octokit) {
            return NextResponse.json({ error: github.error }, { status: github.status });
        }
        const { userId, octokit } = github;
        const user = await getSessionUser();
        const supabase = createAdminClient();
        let githubRepos = [];
        let authMode = 'authenticated';
        try {
            const { data } = await octokit.rest.repos.listForAuthenticatedUser({
                sort: 'updated',
                per_page: 100,
                affiliation: 'owner,collaborator,organization_member',
            });
            githubRepos = data;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : '';
            const status = typeof error === 'object' && error && 'status' in error ? Number(error.status) : undefined;
            const isBadCredentials = status === 401 || /bad credentials/i.test(message);
            if (!isBadCredentials) {
                throw error;
            }
            const githubUsername = await resolveGithubUsername(supabase, userId, user === null || user === void 0 ? void 0 : user.email);
            if (!githubUsername) {
                return NextResponse.json({
                    error: 'GitHub token expired. Please reconnect your GitHub account.',
                    repos: [],
                    requireReconnect: true,
                }, { status: 401 });
            }
            const publicOctokit = new Octokit();
            const { data } = await publicOctokit.rest.repos.listForUser({
                username: githubUsername,
                sort: 'updated',
                per_page: 100,
                type: 'owner',
            });
            githubRepos = data;
            authMode = 'public-fallback';
        }
        // Ensure profile exists for FK consistency (do not overwrite plan)
        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', userId)
            .maybeSingle();
        if (!existingProfile) {
            await supabase
                .from('profiles')
                .insert({
                id: userId,
                email: (user === null || user === void 0 ? void 0 : user.email) || `${userId}@placeholder.local`,
                full_name: (user === null || user === void 0 ? void 0 : user.fullName) || 'User',
                avatar_url: (user === null || user === void 0 ? void 0 : user.avatarUrl) || null,
                last_login_at: new Date().toISOString(),
                subscription_plan: 'free',
            });
        }
        const upsertPayload = githubRepos.map((repo) => ({
            owner_username: repo.owner.login,
            name: repo.name,
            full_name: repo.full_name,
            owner_user_id: userId,
            github_repo_id: String(repo.id),
            is_private: repo.private,
            language: repo.language || 'Unknown',
        }));
        if (upsertPayload.length > 0) {
            const { error: upsertError } = await supabase
                .from('repositories')
                .upsert(upsertPayload, { onConflict: 'github_repo_id' });
            if (upsertError)
                console.error('[REPOS API] Upsert warning:', upsertError);
        }
        const repoFullNames = githubRepos.map((r) => r.full_name);
        const { data: dbRepos, error: reposError } = await supabase
            .from('repositories')
            .select('id, full_name')
            .eq('owner_user_id', userId)
            .in('full_name', repoFullNames.length > 0 ? repoFullNames : ['__none__'])
            .order('id', { ascending: false });
        if (reposError) {
            return NextResponse.json({ error: reposError.message, repos: [] }, { status: 500 });
        }
        const dbRepoByFullName = new Map((dbRepos || []).map((r) => [r.full_name, r]));
        const dbRepoIds = (dbRepos || []).map((r) => r.id);
        // Batch fetch all scans for all repos in one query
        const { data: allScans } = await supabase
            .from('repo_scans')
            .select('id, repo_id, status, created_at')
            .eq('requested_by_user_id', userId)
            .in('repo_id', dbRepoIds.length > 0 ? dbRepoIds : ['__none__'])
            .order('created_at', { ascending: false });
        // Build map: repo_id -> latest completed scan
        const latestScanByRepoId = new Map();
        const completedScanIds = new Set();
        (allScans || []).forEach((scan) => {
            if (!latestScanByRepoId.has(scan.repo_id)) {
                latestScanByRepoId.set(scan.repo_id, scan);
                if (scan.status === 'completed') {
                    completedScanIds.add(scan.id);
                }
            }
        });
        // Batch fetch stats for all completed scans
        const [codeSmellsData, bugsData, securityData, readmeData, snapshotData] = await Promise.all([
            completedScanIds.size > 0 ? supabase.from('code_smells').select('repo_scan_id', { count: 'exact', head: true }).in('repo_scan_id', Array.from(completedScanIds)) : Promise.resolve({ data: [], count: {} }),
            completedScanIds.size > 0 ? supabase.from('bugs').select('repo_scan_id', { count: 'exact', head: true }).in('repo_scan_id', Array.from(completedScanIds)) : Promise.resolve({ data: [], count: {} }),
            completedScanIds.size > 0 ? supabase.from('security_issues').select('repo_scan_id', { count: 'exact', head: true }).in('repo_scan_id', Array.from(completedScanIds)) : Promise.resolve({ data: [], count: {} }),
            supabase.from('readme_generations').select('repo_id').in('repo_id', dbRepoIds.length > 0 ? dbRepoIds : ['__none__']),
            completedScanIds.size > 0 ? supabase.from('scan_snapshots').select('repo_scan_id, metrics').in('repo_scan_id', Array.from(completedScanIds)).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
        ]);
        // Build lookup maps
        const scanCountsByType = { smells: new Map(), bugs: new Map(), security: new Map() };
        const readmesByRepoId = new Map((readmeData.data || []).map((r) => [r.repo_id, true]));
        const snapshotsByRepoId = new Map();
        (_a = codeSmellsData.data) === null || _a === void 0 ? void 0 : _a.forEach((item) => scanCountsByType.smells.set(item.repo_scan_id, item));
        (_b = bugsData.data) === null || _b === void 0 ? void 0 : _b.forEach((item) => scanCountsByType.bugs.set(item.repo_scan_id, item));
        (_c = securityData.data) === null || _c === void 0 ? void 0 : _c.forEach((item) => scanCountsByType.security.set(item.repo_scan_id, item));
        (snapshotData.data || []).forEach((item) => {
            if (!snapshotsByRepoId.has(item.repo_scan_id)) {
                snapshotsByRepoId.set(item.repo_scan_id, item);
            }
        });
        const reposWithStats = githubRepos.map((ghRepo) => {
            var _a, _b, _c, _d, _e, _f;
            const dbRepo = dbRepoByFullName.get(ghRepo.full_name);
            if (!dbRepo) {
                return {
                    id: `gh-${ghRepo.id}`,
                    github_repo_id: String(ghRepo.id),
                    owner_username: ghRepo.owner.login,
                    name: ghRepo.name,
                    full_name: ghRepo.full_name,
                    is_private: ghRepo.private,
                    language: ghRepo.language || 'Unknown',
                    stars: ghRepo.stargazers_count,
                    forks: ghRepo.forks_count,
                    watchers: ghRepo.watchers_count,
                    open_issues: ghRepo.open_issues_count,
                    description: ghRepo.description,
                    default_branch: ghRepo.default_branch,
                    last_pushed_at: ghRepo.pushed_at,
                    scanned: false,
                    lastScanDate: null,
                    stats: null,
                };
            }
            const latestScan = latestScanByRepoId.get(dbRepo.id);
            if (!latestScan || latestScan.status !== 'completed') {
                return {
                    id: dbRepo.id,
                    github_repo_id: String(ghRepo.id),
                    owner_username: ghRepo.owner.login,
                    name: ghRepo.name,
                    full_name: ghRepo.full_name,
                    is_private: ghRepo.private,
                    language: ghRepo.language || 'Unknown',
                    stars: ghRepo.stargazers_count,
                    forks: ghRepo.forks_count,
                    watchers: ghRepo.watchers_count,
                    open_issues: ghRepo.open_issues_count,
                    description: ghRepo.description,
                    default_branch: ghRepo.default_branch,
                    last_pushed_at: ghRepo.pushed_at,
                    scanned: false,
                    lastScanDate: null,
                    scanStatus: (latestScan === null || latestScan === void 0 ? void 0 : latestScan.status) || null,
                    stats: null,
                };
            }
            const snapshot = snapshotsByRepoId.get(latestScan.id);
            const snapshotSmells = Array.isArray((_b = (_a = snapshot === null || snapshot === void 0 ? void 0 : snapshot.metrics) === null || _a === void 0 ? void 0 : _a.findings) === null || _b === void 0 ? void 0 : _b.code_smells) ? snapshot.metrics.findings.code_smells.length : 0;
            const snapshotBugs = Array.isArray((_d = (_c = snapshot === null || snapshot === void 0 ? void 0 : snapshot.metrics) === null || _c === void 0 ? void 0 : _c.findings) === null || _d === void 0 ? void 0 : _d.bugs) ? snapshot.metrics.findings.bugs.length : 0;
            const snapshotSecurity = Array.isArray((_f = (_e = snapshot === null || snapshot === void 0 ? void 0 : snapshot.metrics) === null || _e === void 0 ? void 0 : _e.findings) === null || _f === void 0 ? void 0 : _f.security_issues) ? snapshot.metrics.findings.security_issues.length : 0;
            return {
                id: dbRepo.id,
                github_repo_id: String(ghRepo.id),
                owner_username: ghRepo.owner.login,
                name: ghRepo.name,
                full_name: ghRepo.full_name,
                is_private: ghRepo.private,
                language: ghRepo.language || 'Unknown',
                stars: ghRepo.stargazers_count,
                forks: ghRepo.forks_count,
                watchers: ghRepo.watchers_count,
                open_issues: ghRepo.open_issues_count,
                description: ghRepo.description,
                default_branch: ghRepo.default_branch,
                last_pushed_at: ghRepo.pushed_at,
                scanned: true,
                lastScanDate: latestScan.created_at,
                scanStatus: latestScan.status,
                stats: {
                    code_smells: snapshotSmells || 0,
                    bugs: snapshotBugs || 0,
                    security_issues: snapshotSecurity || 0,
                    has_readme: !!readmesByRepoId.get(dbRepo.id),
                },
            };
        });
        return NextResponse.json({ repos: reposWithStats, authMode });
    }
    catch (error) {
        console.error('[REPOS API] Unexpected error:', error);
        return NextResponse.json({
            error: error.message || 'Internal server error',
            repos: []
        }, { status: 500 });
    }
}
