import { NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase';
import { getOctokitForCurrentUser } from '@/app/lib/github-server';
import { getSessionUser } from '@/app/lib/auth-server';
import { getCommitAnalytics } from '@/app/lib/delivery/commitAnalytics';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ owner: string; repo: string }> }
) {
    try {
        const sessionUser = await getSessionUser();
        const userId = sessionUser?.userId;
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
            octokit.rest.repos.getReadme({ owner, repo }).catch(() => null as any),
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
                repositoryRow = fallbackRepo as any;
            }
        }

        let scan: any = null;
        if (repositoryRow?.id) {
            const { data: foundScans } = await supabase
                .from('repo_scans')
                .select('*')
                .eq('repo_id', repositoryRow.id)
                .eq('requested_by_user_id', userId)
                .order('created_at', { ascending: false })
                .limit(20);
            scan = (foundScans || []).find((s: any) => s.status === 'completed') || (foundScans || [])[0] || null;
        }

        const scanIds = scan ? [scan.id] : [];

        const [codeSmellsCount, bugsCount, securityCount] = await Promise.all([
            supabase.from('code_smells').select('*', { count: 'exact', head: true }).in('repo_scan_id', scanIds),
            supabase.from('bugs').select('*', { count: 'exact', head: true }).in('repo_scan_id', scanIds),
            supabase.from('security_issues').select('*', { count: 'exact', head: true }).in('repo_scan_id', scanIds),
        ]);

        const { data: snapshot } = await supabase
            .from('scan_snapshots')
            .select('metrics')
            .eq('repo_scan_id', scan?.id || '')
            .maybeSingle();

        const snapshotSmells = Array.isArray(snapshot?.metrics?.findings?.code_smells)
            ? snapshot.metrics.findings.code_smells.length
            : 0;
        const snapshotBugs = Array.isArray(snapshot?.metrics?.findings?.bugs)
            ? snapshot.metrics.findings.bugs.length
            : 0;
        const snapshotSecurity = Array.isArray(snapshot?.metrics?.findings?.security_issues)
            ? snapshot.metrics.findings.security_issues.length
            : 0;

        const smellsTotal = (codeSmellsCount.count || 0) > 0 ? (codeSmellsCount.count || 0) : snapshotSmells;
        const bugsTotal = (bugsCount.count || 0) > 0 ? (bugsCount.count || 0) : snapshotBugs;
        const securityTotal = (securityCount.count || 0) > 0 ? (securityCount.count || 0) : snapshotSecurity;
        const hasReadme = Boolean(readmeResponse?.data?.content);

        const pullRequests = pullsResponse.data;
        const issues = issuesResponse.data.filter((issue: any) => !issue.pull_request);

        const weeklyCommits = commitAnalytics.weekly;

        const healthScore = Math.max(
            1,
            100 - (bugsTotal * 8 + securityTotal * 12 + smellsTotal * 3)
        );

        return NextResponse.json({
            id: repositoryRow?.id || `gh-${ghRepo.id}`,
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
                license: ghRepo.license?.name || null,
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
            issues: issues.map((issue: any) => ({
                id: issue.id,
                number: issue.number,
                title: issue.title,
                state: issue.state,
                url: issue.html_url,
                created_at: issue.created_at,
                updated_at: issue.updated_at,
                user: issue.user?.login || 'unknown',
            })),
            pull_requests: {
                open: pullRequests.filter((p: any) => p.state === 'open').length,
                closed: pullRequests.filter((p: any) => p.state === 'closed').length,
                merged: pullRequests.filter((p: any) => Boolean(p.merged_at)).length,
            },
            pull_request_list: pullRequests.slice(0, 10).map((pr: any) => ({
                id: pr.id,
                number: pr.number,
                title: pr.title,
                state: pr.state,
                merged_at: pr.merged_at,
                url: pr.html_url,
                created_at: pr.created_at,
                user: pr.user?.login || 'unknown',
            })),
            aiAnalysis: {
                summary: snapshot?.metrics?.sections?.executiveVerdict || snapshot?.metrics?.raw || 'No analysis available yet',
                healthScore,
                scores: {
                    maintainability: snapshot?.metrics?.scores?.maintainability ?? 7,
                    security: snapshot?.metrics?.scores?.security ?? 7,
                    performance: snapshot?.metrics?.scores?.scalability ?? 7,
                    documentation: snapshot?.metrics?.scores?.documentation ?? 7,
                    testing: snapshot?.metrics?.scores?.codeQuality ?? 7,
                },
                sections: {
                    strengths: snapshot?.metrics?.sections?.strengths ?? [],
                    criticalGaps: snapshot?.metrics?.sections?.criticalGaps ?? [],
                    areasForImprovement: snapshot?.metrics?.sections?.areasForImprovement ?? [],
                    fixPlan48h: snapshot?.metrics?.sections?.fixPlan48h ?? [],
                    careerImpact: snapshot?.metrics?.sections?.careerImpact ?? '',
                },
            },
        });
    } catch (error: any) {
        console.error('Details error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
