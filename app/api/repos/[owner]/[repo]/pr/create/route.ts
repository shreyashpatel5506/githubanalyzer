import { NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase';
import { checkAndIncrementLimit } from '@/app/lib/billing';
import { resolveUserPlan } from '@/app/lib/entitlements';
import { getSessionUser } from '@/app/lib/auth-server';
import { getOctokitForCurrentUser } from '@/app/lib/github-server';
import { createReadmePullRequest } from '@/app/lib/delivery/githubAutomation';
import { runAI } from '@/app/lib/ai-client';

type IssuePayload = {
    fileName?: string;
    line?: number;
    severity?: string;
    explanation?: string;
    suggestedFix?: string;
};

type FixType = 'code-smell' | 'bug' | 'security' | 'readme';

function resolveFindingTable(type: FixType) {
    if (type === 'bug') return 'bugs';
    if (type === 'security') return 'security_issues';
    if (type === 'code-smell') return 'code_smells';
    return null;
}

async function getExistingFileSha(
    octokit: Awaited<ReturnType<typeof getOctokitForCurrentUser>>['octokit'],
    owner: string,
    repo: string,
    path: string,
    branch: string
) {
    if (!octokit) return undefined;

    try {
        const response = await octokit.rest.repos.getContent({ owner, repo, path, ref: branch });
        const data = response.data as { sha?: string } | Array<unknown>;
        if (Array.isArray(data)) return undefined;
        return data?.sha;
    } catch {
        return undefined;
    }
}

async function getFileTextAtBranch(
    octokit: Awaited<ReturnType<typeof getOctokitForCurrentUser>>['octokit'],
    owner: string,
    repo: string,
    path: string,
    branch: string
) {
    if (!octokit) return null;

    const response = await octokit.rest.repos.getContent({ owner, repo, path, ref: branch });
    const data = response.data as { content?: string; encoding?: string } | Array<unknown>;

    if (Array.isArray(data) || !data.content) return null;
    if ((data.encoding || 'base64') !== 'base64') return null;

    return Buffer.from(data.content, 'base64').toString('utf8');
}

function buildFixMarkdown(input: {
    type: string;
    issueId?: string;
    issue?: IssuePayload;
    content?: string;
}) {
    const title = input.type.replace(/-/g, ' ');
    const issue = input.issue;
    const issueLabel = input.issueId || issue?.fileName || 'scan-finding';
    const fixText = input.content || issue?.suggestedFix || issue?.explanation || 'Apply the suggested remediation.';

    return [
        `# ClarityCode Fix Package`,
        '',
        `## Issue Type`,
        title,
        '',
        `## Reference`,
        `- Issue ID: ${issueLabel}`,
        issue?.fileName ? `- File: ${issue.fileName}` : '- File: not provided',
        typeof issue?.line === 'number' ? `- Line: ${issue.line}` : '- Line: not provided',
        issue?.severity ? `- Severity: ${issue.severity}` : '- Severity: not provided',
        '',
        `## Explanation`,
        issue?.explanation || 'No explanation provided.',
        '',
        `## Suggested Fix`,
        fixText,
        '',
        `## Notes`,
        '- This file is intentionally added by ClarityCode so the pull request includes a concrete repository change.',
        '- Replace this note with an in-place code patch generator when deeper source transforms are available.',
        '',
    ].join('\n');
}

async function buildAIAssistedFixContent(input: {
    type: FixType;
    owner: string;
    repo: string;
    issue?: IssuePayload;
    fallback: string;
    filePath?: string;
    baseFileContent?: string | null;
}) {
    if (!input.issue || input.type === 'readme') {
        return input.fallback;
    }

    if (!input.filePath || !input.baseFileContent) {
        return input.fallback;
    }

    const prompt = `You are a senior software engineer fixing a repository file.

Repository: ${input.owner}/${input.repo}
Issue type: ${input.type}
Target file: ${input.filePath}
Line: ${typeof input.issue.line === 'number' ? input.issue.line : 'unknown'}
Severity: ${input.issue.severity || 'unknown'}
Problem: ${input.issue.explanation || 'No explanation provided'}
Suggested fix: ${input.issue.suggestedFix || 'No suggested fix provided'}

Return ONLY the full updated file contents for the target file.
- Preserve the existing file structure and imports.
- Make the smallest safe change that fixes the issue.
- Do not include markdown, commentary, or code fences.
- Do not change unrelated logic.

Original file contents:
${input.baseFileContent}

`;

    try {
        const aiResponse = await runAI(prompt);
        if (aiResponse && aiResponse.trim().length > 0) {
            return aiResponse.trim();
        }
    } catch (error) {
        console.warn('[PR CREATE] AI-assisted fix generation failed, using fallback content:', error);
    }

    return input.fallback;
}

async function isFindingStillActive(input: {
    supabase: ReturnType<typeof createAdminClient>;
    repoId: string;
    userId: string;
    type: FixType;
    issueId?: string;
}) {
    if (input.type === 'readme') return true;

    const findingTable = resolveFindingTable(input.type);
    if (!findingTable || !input.issueId) return false;

    const { data: latestCompletedScan } = await input.supabase
        .from('repo_scans')
        .select('id')
        .eq('repo_id', input.repoId)
        .eq('requested_by_user_id', input.userId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (!latestCompletedScan?.id) {
        return false;
    }

    const { data: finding } = await input.supabase
        .from(findingTable)
        .select('id')
        .eq('repo_scan_id', latestCompletedScan.id)
        .eq('id', input.issueId)
        .maybeSingle();

    return Boolean(finding?.id);
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ owner: string; repo: string }> }
) {
    try {
        const sessionUser = await getSessionUser();
        const userId = sessionUser?.userId;
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { type, issueId, content, issue } = await req.json();
        const fixType = (type || 'readme') as FixType;
        const { owner, repo } = await params;

        const supabase = createAdminClient();

        const plan = await resolveUserPlan(userId, supabase);

        // Check PR creation limit
        await checkAndIncrementLimit(userId, plan, 'pr_suggestion', 'pr_suggestions_count');

        // Get repository
        const { data: repository } = await supabase
            .from('repositories')
            .select('*')
            .eq('owner_username', owner)
            .eq('name', repo)
            .single();

        if (!repository) {
            return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
        }

        if (fixType !== 'readme' && !issue?.fileName) {
            return NextResponse.json({ error: 'Issue file path is required to generate a real fix PR.' }, { status: 400 });
        }

        const isStillActive = await isFindingStillActive({
            supabase,
            repoId: repository.id,
            userId,
            type: fixType,
            issueId,
        });

        if (!isStillActive) {
            return NextResponse.json(
                {
                    error: 'This finding is no longer active in the latest scan. Please run scan again and create PR for an active issue.',
                },
                { status: 409 }
            );
        }

        // Generate PR suggestion data
        let summary = '';
        let diffPatch = '';
        let filePath = issue?.fileName || `claritycode-fixes/${fixType}-${Date.now()}.md`;
        let baseBranch = '';
        let prBody = `Automated fix generated by ClarityCode.`;
        const branchName = `claritycode/${fixType}-fix-${Date.now()}`;

        switch (fixType) {
            case 'code-smell':
                summary = `ClarityCode: Fix code smell in ${issueId || issue?.fileName || 'scan finding'}`;
                diffPatch = buildFixMarkdown({ type: fixType, issueId, issue, content });
                break;
            case 'bug':
                summary = `ClarityCode: Fix bug in ${issueId || issue?.fileName || 'scan finding'}`;
                diffPatch = buildFixMarkdown({ type: fixType, issueId, issue, content });
                break;
            case 'security':
                summary = `ClarityCode: Security fix in ${issueId || issue?.fileName || 'scan finding'}`;
                diffPatch = buildFixMarkdown({ type: fixType, issueId, issue, content });
                break;
            case 'readme':
                summary = 'ClarityCode: Add/Update README.md';
                diffPatch = content || '// README content';
                filePath = 'README.md';
                break;
            default:
                summary = 'ClarityCode: Automated improvement';
                diffPatch = content || '// Generated by ClarityCode';
        }

        // Store PR suggestion draft first so we always have a stable id
        const { data: pr } = await supabase
            .from('pull_request_suggestions')
            .insert({
                repo_id: repository.id,
                branch_name: branchName,
                summary,
                diff_patch: diffPatch,
                status: 'draft',
            })
            .select()
            .single();

        if (fixType !== 'readme') {
            const github = await getOctokitForCurrentUser();
            if (!github.ok || !github.octokit) {
                return NextResponse.json({
                    success: true,
                    pr_url: null,
                    message: 'GitHub OAuth required to publish the pull request automatically.',
                });
            }

            const octokit = github.octokit;
            const repoInfo = await octokit.rest.repos.get({ owner, repo });
            baseBranch = repoInfo.data.default_branch;
            const baseFileContent = await getFileTextAtBranch(octokit, owner, repo, filePath, baseBranch);

            if (!baseFileContent) {
                return NextResponse.json({
                    error: `Could not read ${filePath} from the repository.`,
                }, { status: 404 });
            }

            const aiFixContent = await buildAIAssistedFixContent({
                type: fixType,
                owner,
                repo,
                issue,
                filePath,
                baseFileContent,
                fallback: baseFileContent,
            });

            diffPatch = aiFixContent;

            await supabase
                .from('pull_request_suggestions')
                .update({ diff_patch: diffPatch })
                .eq('id', pr?.id);

            prBody = [
                `Automated fix generated by ClarityCode.`,
                '',
                `### Summary`,
                summary,
                '',
                `### Fixed File`,
                `- ${filePath}`,
                typeof issue?.line === 'number' ? `- Line: ${issue.line}` : '- Line: not provided',
                issue?.severity ? `- Severity: ${issue.severity}` : '- Severity: not provided',
                '',
                `### Issue`,
                issue?.explanation || 'No explanation provided.',
                '',
                `### Suggested Fix`,
                issue?.suggestedFix || 'Apply the suggested remediation.',
            ].join('\n');

            const targetBranchName = `claritycode/${fixType}-fix-${Date.now()}`;
            const existingSha = await getExistingFileSha(octokit, owner, repo, filePath, baseBranch);

            await octokit.rest.git.createRef({
                owner,
                repo,
                ref: `refs/heads/${targetBranchName}`,
                sha: (await octokit.rest.git.getRef({ owner, repo, ref: `heads/${baseBranch}` })).data.object.sha,
            });

            await octokit.rest.repos.createOrUpdateFileContents({
                owner,
                repo,
                path: filePath,
                message: summary,
                content: Buffer.from(diffPatch, 'utf8').toString('base64'),
                branch: targetBranchName,
                sha: existingSha,
            });

            const { data: githubPR } = await octokit.rest.pulls.create({
                owner,
                repo,
                title: summary,
                head: targetBranchName,
                base: baseBranch,
                body: prBody,
            });

            await supabase
                .from('pull_request_suggestions')
                .update({ status: 'published', github_pr_url: githubPR.html_url })
                .eq('id', pr?.id);

            return NextResponse.json({
                success: true,
                pr_url: githubPR.html_url,
                message: 'Pull Request created successfully on GitHub!',
            });
        }

        const github = await getOctokitForCurrentUser();
        const githubToken = github.ok ? github.token : null;

        if (!githubToken || !github.ok || !github.octokit) {
            return NextResponse.json({
                success: true,
                pr_url: null,
                message: 'Draft created. Connect GitHub to publish the pull request automatically.'
            });
        }

        const octokit = github.octokit;

        try {
            let prUrl = '';
            if (fixType === 'readme') {
                const readmePR = await createReadmePullRequest({
                    octokit,
                    owner,
                    repo,
                    readmeContent: diffPatch,
                    title: summary,
                    body: `Automated README update from ClarityCode.\n\n### Summary\n${summary}`,
                    branchPrefix: 'claritycode/readme',
                });
                prUrl = readmePR.prUrl;
            } else {
                prUrl = null as unknown as string;
            }

            await supabase
                .from('pull_request_suggestions')
                .update({ status: 'published', github_pr_url: prUrl })
                .eq('id', pr?.id);

            return NextResponse.json({
                success: true,
                pr_url: prUrl,
                message: 'Pull Request created successfully on GitHub!',
            });
        } catch (ghError: unknown) {
            console.error('[GITHUB PR ERROR]:', ghError);

            // If a PR already exists for this branch, return it instead of failing.
            try {
                const existing = await octokit.rest.pulls.list({
                    owner,
                    repo,
                    state: 'open',
                    head: `${owner}:${branchName}`,
                    per_page: 10,
                });

                const existingPr = existing.data[0];
                if (existingPr) {
                    await supabase
                        .from('pull_request_suggestions')
                        .update({ status: 'published', github_pr_url: existingPr.html_url })
                        .eq('id', pr?.id);

                    return NextResponse.json({
                        success: true,
                        pr_url: existingPr.html_url,
                        message: 'Pull Request already existed; returning the existing PR.',
                    });
                }
            } catch {
                // ignore secondary lookup failure
            }

            const ghErrorMessage = ghError instanceof Error ? ghError.message : 'Unknown GitHub error';
            return NextResponse.json({
                success: true,
                pr_url: null,
                message: `Draft created, but GitHub PR failed: ${ghErrorMessage}`,
            });
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('PR creation error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
