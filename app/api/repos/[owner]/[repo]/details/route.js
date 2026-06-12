import { NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase';
import { getOctokitForCurrentUser } from '@/app/lib/github-server';
import { getSessionUser } from '@/app/lib/auth-server';
import { getCommitAnalytics } from '@/app/lib/delivery/commitAnalytics';
import { dedupeFindings, findingsFromSnapshot } from '@/app/lib/repo-analysis';
export async function GET(req, { params }) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10;
    try {
        const sessionUser = await getSessionUser();
        const userId = sessionUser === null || sessionUser === void 0 ? void 0 : sessionUser.userId;
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { owner, repo } = await params;
        const supabase = createAdminClient();
        const github = await getOctokitForCurrentUser();
        if (!github.ok || !github.octokit) {
            return NextResponse.json({ error: github.error || 'GitHub OAuth required' }, { status: github.status || 403 });
        }
        const octokit = github.octokit;
        const [repoResponse, issuesResponse, pullsResponse, readmeResponse] = await Promise.all([
            octokit.rest.repos.get({ owner, repo }),
            octokit.rest.issues.listForRepo({ owner, repo, state: 'open', per_page: 10 }),
            octokit.rest.pulls.list({ owner, repo, state: 'all', per_page: 20 }),
            octokit.rest.repos.getReadme({ owner, repo }).catch(() => null),
        ]);
        const commitAnalytics = await getCommitAnalytics(octokit, owner, repo);
        const ghRepo = repoResponse.data;
        const { data: repository } = await supabase
            .from('repositories')
            .select('*')
            .eq('owner_username', owner)
            .eq('name', repo)
            .eq('owner_user_id', userId)
            .maybeSingle();
        let repositoryRow = repository;
        if (!repositoryRow) {
            const { data: inserted, error: upsertError } = await supabase
                .from('repositories')
                .upsert({
                owner_username: ghRepo.owner.login,
                name: ghRepo.name,
                full_name: ghRepo.full_name,
                owner_user_id: userId,
                github_repo_id: String(ghRepo.id),
                is_private: ghRepo.private,
                language: ghRepo.language || 'Unknown',
            }, { onConflict: 'github_repo_id' })
                .select('*')
                .single();
            if (upsertError) {
                console.error('[DETAILS API] Upsert warning:', upsertError);
            }
            repositoryRow = inserted;
        }
        if (!repositoryRow) {
            const { data: fallbackRepo } = await supabase
                .from('repositories')
                .select('id')
                .eq('full_name', ghRepo.full_name)
                .eq('owner_user_id', userId)
                .maybeSingle();
            if (fallbackRepo) {
                repositoryRow = fallbackRepo;
            }
        }
        let scan = null;
        let latestCompletedScan = null;
        if (repositoryRow === null || repositoryRow === void 0 ? void 0 : repositoryRow.id) {
            const { data: foundScans } = await supabase
                .from('repo_scans')
                .select('*')
                .eq('repo_id', repositoryRow.id)
                .eq('requested_by_user_id', userId)
                .order('created_at', { ascending: false })
                .limit(20);
            latestCompletedScan = (foundScans || []).find((s) => s.status === 'completed') || null;
            scan = latestCompletedScan || (foundScans || [])[0] || null;
        }
        const scanIds = latestCompletedScan ? [latestCompletedScan.id] : [];
        const [codeSmellsCount, bugsCount, securityCount] = await Promise.all([
            supabase.from('code_smells').select('*', { count: 'exact', head: true }).in('repo_scan_id', scanIds),
            supabase.from('bugs').select('*', { count: 'exact', head: true }).in('repo_scan_id', scanIds),
            supabase.from('security_issues').select('*', { count: 'exact', head: true }).in('repo_scan_id', scanIds),
        ]);
        const { data: snapshot } = await supabase
            .from('scan_snapshots')
            .select('metrics')
            .eq('repo_scan_id', (latestCompletedScan === null || latestCompletedScan === void 0 ? void 0 : latestCompletedScan.id) || '')
            .maybeSingle();
        const snapshotSmells = dedupeFindings(findingsFromSnapshot(snapshot === null || snapshot === void 0 ? void 0 : snapshot.metrics, 'code_smells')).length;
        const snapshotBugs = dedupeFindings(findingsFromSnapshot(snapshot === null || snapshot === void 0 ? void 0 : snapshot.metrics, 'bugs')).length;
        const snapshotSecurity = dedupeFindings(findingsFromSnapshot(snapshot === null || snapshot === void 0 ? void 0 : snapshot.metrics, 'security_issues')).length;
        const smellsTotal = (snapshot === null || snapshot === void 0 ? void 0 : snapshot.metrics) ? snapshotSmells : (codeSmellsCount.count || 0);
        const bugsTotal = (snapshot === null || snapshot === void 0 ? void 0 : snapshot.metrics) ? snapshotBugs : (bugsCount.count || 0);
        const securityTotal = (snapshot === null || snapshot === void 0 ? void 0 : snapshot.metrics) ? snapshotSecurity : (securityCount.count || 0);
        const hasReadme = Boolean((_a = readmeResponse === null || readmeResponse === void 0 ? void 0 : readmeResponse.data) === null || _a === void 0 ? void 0 : _a.content);
        const pullRequests = pullsResponse.data;
        const issues = issuesResponse.data.filter((issue) => !issue.pull_request);
        const weeklyCommits = commitAnalytics.weekly;
        const healthScore = Math.max(1, 100 - (bugsTotal * 8 + securityTotal * 12 + smellsTotal * 3));
        return NextResponse.json({
            id: (repositoryRow === null || repositoryRow === void 0 ? void 0 : repositoryRow.id) || `gh-${ghRepo.id}`,
            name: ghRepo.name,
            full_name: ghRepo.full_name,
            description: ghRepo.description,
            owner_username: ghRepo.owner.login,
            language: ghRepo.language || 'Unknown',
            is_private: ghRepo.private,
            stars: ghRepo.stargazers_count,
            forks: ghRepo.forks_count,
            watchers: ghRepo.watchers_count,
            open_issues: ghRepo.open_issues_count,
            homepage: ghRepo.homepage,
            topics: ghRepo.topics || [],
            created_at: ghRepo.created_at,
            last_pushed_at: ghRepo.pushed_at,
            default_branch: ghRepo.default_branch,
            size: ghRepo.size,
            additional_metadata: {
                archived: ghRepo.archived,
                disabled: ghRepo.disabled,
                has_wiki: ghRepo.has_wiki,
                has_discussions: ghRepo.has_discussions,
                license: ((_b = ghRepo.license) === null || _b === void 0 ? void 0 : _b.name) || null,
            },
            stats: {
                code_smells: smellsTotal,
                bugs: bugsTotal,
                security_issues: securityTotal,
                maintainability_concerns: smellsTotal,
                overall_score: healthScore,
                has_readme: hasReadme,
            },
            recent_commits: weeklyCommits,
            commit_analytics: {
                monthly: commitAnalytics.monthly,
                yearly: commitAnalytics.yearly,
                contributors: commitAnalytics.contributors,
                total_last_year: commitAnalytics.totalCommitsLastYear,
            },
            issues: issues.map((issue) => {
                var _a;
                return ({
                    id: issue.id,
                    number: issue.number,
                    title: issue.title,
                    state: issue.state,
                    url: issue.html_url,
                    created_at: issue.created_at,
                    updated_at: issue.updated_at,
                    user: ((_a = issue.user) === null || _a === void 0 ? void 0 : _a.login) || 'unknown',
                });
            }),
            pull_requests: {
                open: pullRequests.filter((p) => p.state === 'open').length,
                closed: pullRequests.filter((p) => p.state === 'closed').length,
                merged: pullRequests.filter((p) => Boolean(p.merged_at)).length,
            },
            pull_request_list: pullRequests.slice(0, 10).map((pr) => {
                var _a;
                return ({
                    id: pr.id,
                    number: pr.number,
                    title: pr.title,
                    state: pr.state,
                    merged_at: pr.merged_at,
                    url: pr.html_url,
                    created_at: pr.created_at,
                    user: ((_a = pr.user) === null || _a === void 0 ? void 0 : _a.login) || 'unknown',
                });
            }),
            aiAnalysis: {
                summary: ((_d = (_c = snapshot === null || snapshot === void 0 ? void 0 : snapshot.metrics) === null || _c === void 0 ? void 0 : _c.sections) === null || _d === void 0 ? void 0 : _d.executiveVerdict) || ((_e = snapshot === null || snapshot === void 0 ? void 0 : snapshot.metrics) === null || _e === void 0 ? void 0 : _e.raw) || 'No analysis available yet',
                healthScore,
                scores: {
                    maintainability: (_h = (_g = (_f = snapshot === null || snapshot === void 0 ? void 0 : snapshot.metrics) === null || _f === void 0 ? void 0 : _f.scores) === null || _g === void 0 ? void 0 : _g.maintainability) !== null && _h !== void 0 ? _h : 7,
                    security: (_l = (_k = (_j = snapshot === null || snapshot === void 0 ? void 0 : snapshot.metrics) === null || _j === void 0 ? void 0 : _j.scores) === null || _k === void 0 ? void 0 : _k.security) !== null && _l !== void 0 ? _l : 7,
                    performance: (_p = (_o = (_m = snapshot === null || snapshot === void 0 ? void 0 : snapshot.metrics) === null || _m === void 0 ? void 0 : _m.scores) === null || _o === void 0 ? void 0 : _o.scalability) !== null && _p !== void 0 ? _p : 7,
                    documentation: (_s = (_r = (_q = snapshot === null || snapshot === void 0 ? void 0 : snapshot.metrics) === null || _q === void 0 ? void 0 : _q.scores) === null || _r === void 0 ? void 0 : _r.documentation) !== null && _s !== void 0 ? _s : 7,
                    testing: (_v = (_u = (_t = snapshot === null || snapshot === void 0 ? void 0 : snapshot.metrics) === null || _t === void 0 ? void 0 : _t.scores) === null || _u === void 0 ? void 0 : _u.codeQuality) !== null && _v !== void 0 ? _v : 7,
                },
                sections: {
                    strengths: (_y = (_x = (_w = snapshot === null || snapshot === void 0 ? void 0 : snapshot.metrics) === null || _w === void 0 ? void 0 : _w.sections) === null || _x === void 0 ? void 0 : _x.strengths) !== null && _y !== void 0 ? _y : [],
                    criticalGaps: (_1 = (_0 = (_z = snapshot === null || snapshot === void 0 ? void 0 : snapshot.metrics) === null || _z === void 0 ? void 0 : _z.sections) === null || _0 === void 0 ? void 0 : _0.criticalGaps) !== null && _1 !== void 0 ? _1 : [],
                    areasForImprovement: (_4 = (_3 = (_2 = snapshot === null || snapshot === void 0 ? void 0 : snapshot.metrics) === null || _2 === void 0 ? void 0 : _2.sections) === null || _3 === void 0 ? void 0 : _3.areasForImprovement) !== null && _4 !== void 0 ? _4 : [],
                    fixPlan48h: (_7 = (_6 = (_5 = snapshot === null || snapshot === void 0 ? void 0 : snapshot.metrics) === null || _5 === void 0 ? void 0 : _5.sections) === null || _6 === void 0 ? void 0 : _6.fixPlan48h) !== null && _7 !== void 0 ? _7 : [],
                    careerImpact: (_10 = (_9 = (_8 = snapshot === null || snapshot === void 0 ? void 0 : snapshot.metrics) === null || _8 === void 0 ? void 0 : _8.sections) === null || _9 === void 0 ? void 0 : _9.careerImpact) !== null && _10 !== void 0 ? _10 : '',
                },
            },
            scan: {
                has_completed_scan: Boolean(latestCompletedScan),
                latest_status: (scan === null || scan === void 0 ? void 0 : scan.status) || null,
                latest_scan_id: (scan === null || scan === void 0 ? void 0 : scan.id) || null,
            },
        });
    }
    catch (error) {
        console.error('Details error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
