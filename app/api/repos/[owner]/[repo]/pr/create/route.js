import { NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase';
import { checkAndIncrementLimit } from '@/app/lib/billing';
import { resolveUserPlan } from '@/app/lib/entitlements';
import { getSessionUser } from '@/app/lib/auth-server';
import { getGitHubAutomationOctokit } from '@/app/lib/github-automation';
import { createReadmePullRequest } from '@/app/lib/delivery/githubAutomation';
import { runAI } from '@/app/lib/ai-client';
function buildResolutionMarker(type, issueId) {
    if (!issueId || type === 'readme')
        return null;
    return `[[RESOLVED:${type}:${issueId}]]`;
}
function applyInlineFallbackPatch(baseContent, issue, filePath) {
    var _a;
    if (!(issue === null || issue === void 0 ? void 0 : issue.suggestedFix) && !(issue === null || issue === void 0 ? void 0 : issue.explanation))
        return baseContent;
    const extension = ((_a = filePath.split('.').pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || '';
    const commentPrefix = (() => {
        if (['ts', 'tsx', 'js', 'jsx', 'java', 'go', 'rs', 'c', 'cpp', 'cs', 'php', 'swift', 'kt'].includes(extension)) {
            return '//';
        }
        if (['py', 'rb', 'sh', 'yaml', 'yml', 'toml'].includes(extension)) {
            return '#';
        }
        if (['sql'].includes(extension)) {
            return '--';
        }
        if (['html', 'xml', 'md'].includes(extension)) {
            return '<!--';
        }
        return '//';
    })();
    const explanation = (issue.explanation || issue.suggestedFix || 'Applied automated remediation').replace(/\r?\n/g, ' ').trim();
    const line = Math.max(1, Number(issue.line || 1));
    const note = commentPrefix === '<!--'
        ? `<!-- ClarityCode fix note: ${explanation} -->`
        : `${commentPrefix} ClarityCode fix note: ${explanation}`;
    const lines = baseContent.split('\n');
    const index = Math.min(lines.length, Math.max(0, line - 1));
    lines.splice(index, 0, note);
    return lines.join('\n');
}
function resolveFindingTable(type) {
    if (type === 'bug')
        return 'bugs';
    if (type === 'security')
        return 'security_issues';
    if (type === 'code-smell')
        return 'code_smells';
    return null;
}
async function getExistingFileSha(octokit, owner, repo, path, branch) {
    if (!octokit)
        return undefined;
    try {
        const response = await octokit.rest.repos.getContent({ owner, repo, path, ref: branch });
        const data = response.data;
        if (Array.isArray(data))
            return undefined;
        return data === null || data === void 0 ? void 0 : data.sha;
    }
    catch (_a) {
        return undefined;
    }
}
async function getFileTextAtBranch(octokit, owner, repo, path, branch) {
    if (!octokit)
        return null;
    const response = await octokit.rest.repos.getContent({ owner, repo, path, ref: branch });
    const data = response.data;
    if (Array.isArray(data) || !data.content)
        return null;
    if ((data.encoding || 'base64') !== 'base64')
        return null;
    return Buffer.from(data.content, 'base64').toString('utf8');
}
function buildFixMarkdown(input) {
    const title = input.type.replace(/-/g, ' ');
    const issue = input.issue;
    const issueLabel = input.issueId || (issue === null || issue === void 0 ? void 0 : issue.fileName) || 'scan-finding';
    const fixText = input.content || (issue === null || issue === void 0 ? void 0 : issue.suggestedFix) || (issue === null || issue === void 0 ? void 0 : issue.explanation) || 'Apply the suggested remediation.';
    return [
        `# ClarityCode Fix Package`,
        '',
        `## Issue Type`,
        title,
        '',
        `## Reference`,
        `- Issue ID: ${issueLabel}`,
        (issue === null || issue === void 0 ? void 0 : issue.fileName) ? `- File: ${issue.fileName}` : '- File: not provided',
        typeof (issue === null || issue === void 0 ? void 0 : issue.line) === 'number' ? `- Line: ${issue.line}` : '- Line: not provided',
        (issue === null || issue === void 0 ? void 0 : issue.severity) ? `- Severity: ${issue.severity}` : '- Severity: not provided',
        '',
        `## Explanation`,
        (issue === null || issue === void 0 ? void 0 : issue.explanation) || 'No explanation provided.',
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
async function buildAIAssistedFixContent(input) {
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
    }
    catch (error) {
        console.warn('[PR CREATE] AI-assisted fix generation failed, using fallback content:', error);
    }
    return input.fallback;
}
async function isFindingStillActive(input) {
    if (input.type === 'readme')
        return true;
    const findingTable = resolveFindingTable(input.type);
    if (!findingTable || !input.issueId)
        return false;
    const { data: latestCompletedScan } = await input.supabase
        .from('repo_scans')
        .select('id')
        .eq('repo_id', input.repoId)
        .eq('requested_by_user_id', input.userId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (!(latestCompletedScan === null || latestCompletedScan === void 0 ? void 0 : latestCompletedScan.id)) {
        return false;
    }
    const { data: finding } = await input.supabase
        .from(findingTable)
        .select('id')
        .eq('repo_scan_id', latestCompletedScan.id)
        .eq('id', input.issueId)
        .maybeSingle();
    return Boolean(finding === null || finding === void 0 ? void 0 : finding.id);
}
export async function POST(req, { params }) {
    try {
        const sessionUser = await getSessionUser();
        const userId = sessionUser === null || sessionUser === void 0 ? void 0 : sessionUser.userId;
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { type, issueId, content, issue } = await req.json();
        const fixType = (type || 'readme');
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
        if (fixType !== 'readme' && !(issue === null || issue === void 0 ? void 0 : issue.fileName)) {
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
            return NextResponse.json({
                error: 'This finding is no longer active in the latest scan. Please run scan again and create PR for an active issue.',
            }, { status: 409 });
        }
        // Generate PR suggestion data
        let summary = '';
        let diffPatch = '';
        let filePath = (issue === null || issue === void 0 ? void 0 : issue.fileName) || `claritycode-fixes/${fixType}-${Date.now()}.md`;
        let baseBranch = '';
        let prBody = `Automated fix generated by ClarityCode.`;
        const branchName = `claritycode/${fixType}-fix-${Date.now()}`;
        switch (fixType) {
            case 'code-smell':
                summary = `ClarityCode: Fix code smell in ${issueId || (issue === null || issue === void 0 ? void 0 : issue.fileName) || 'scan finding'}`;
                diffPatch = buildFixMarkdown({ type: fixType, issueId, issue, content });
                break;
            case 'bug':
                summary = `ClarityCode: Fix bug in ${issueId || (issue === null || issue === void 0 ? void 0 : issue.fileName) || 'scan finding'}`;
                diffPatch = buildFixMarkdown({ type: fixType, issueId, issue, content });
                break;
            case 'security':
                summary = `ClarityCode: Security fix in ${issueId || (issue === null || issue === void 0 ? void 0 : issue.fileName) || 'scan finding'}`;
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
        const resolutionMarker = buildResolutionMarker(fixType, issueId);
        const persistedSummary = resolutionMarker ? `${summary} ${resolutionMarker}` : summary;
        // Store PR suggestion draft first so we always have a stable id
        const { data: pr } = await supabase
            .from('pull_request_suggestions')
            .insert({
            repo_id: repository.id,
            branch_name: branchName,
            summary: persistedSummary,
            diff_patch: diffPatch,
            status: 'draft',
        })
            .select()
            .single();
        if (fixType !== 'readme') {
            const botClient = await getGitHubAutomationOctokit();
            if (!botClient.ok || !botClient.octokit) {
                return NextResponse.json({
                    error: botClient.error || 'GitHub PR creator token is not configured.',
                }, { status: 500 });
            }
            const octokit = botClient.octokit;
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
            diffPatch = aiFixContent.trim() === baseFileContent.trim()
                ? applyInlineFallbackPatch(baseFileContent, issue, filePath)
                : aiFixContent;
            await supabase
                .from('pull_request_suggestions')
                .update({ diff_patch: diffPatch })
                .eq('id', pr === null || pr === void 0 ? void 0 : pr.id);
            prBody = [
                `Automated fix generated by ClarityCode.`,
                '',
                `### Summary`,
                summary,
                '',
                `### Fixed File`,
                `- ${filePath}`,
                typeof (issue === null || issue === void 0 ? void 0 : issue.line) === 'number' ? `- Line: ${issue.line}` : '- Line: not provided',
                (issue === null || issue === void 0 ? void 0 : issue.severity) ? `- Severity: ${issue.severity}` : '- Severity: not provided',
                '',
                `### Issue`,
                (issue === null || issue === void 0 ? void 0 : issue.explanation) || 'No explanation provided.',
                '',
                `### Suggested Fix`,
                (issue === null || issue === void 0 ? void 0 : issue.suggestedFix) || 'Apply the suggested remediation.',
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
                .eq('id', pr === null || pr === void 0 ? void 0 : pr.id);
            return NextResponse.json({
                success: true,
                pr_url: githubPR.html_url,
                message: 'Pull Request created successfully on GitHub!',
            });
        }
        const botClient = await getGitHubAutomationOctokit();
        if (!botClient.ok || !botClient.octokit) {
            return NextResponse.json({
                error: botClient.error || 'GitHub PR creator token is not configured.',
            }, { status: 500 });
        }
        const octokit = botClient.octokit;
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
            }
            else {
                prUrl = null;
            }
            await supabase
                .from('pull_request_suggestions')
                .update({ status: 'published', github_pr_url: prUrl })
                .eq('id', pr === null || pr === void 0 ? void 0 : pr.id);
            return NextResponse.json({
                success: true,
                pr_url: prUrl,
                message: 'Pull Request created successfully on GitHub!',
            });
        }
        catch (ghError) {
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
                        .eq('id', pr === null || pr === void 0 ? void 0 : pr.id);
                    return NextResponse.json({
                        success: true,
                        pr_url: existingPr.html_url,
                        message: 'Pull Request already existed; returning the existing PR.',
                    });
                }
            }
            catch (_a) {
                // ignore secondary lookup failure
            }
            const ghErrorMessage = ghError instanceof Error ? ghError.message : 'Unknown GitHub error';
            return NextResponse.json({
                success: true,
                pr_url: null,
                message: `Draft created, but GitHub PR failed: ${ghErrorMessage}`,
            });
        }
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('PR creation error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
