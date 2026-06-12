import { NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase';
import { checkAndIncrementLimit } from '@/app/lib/billing';
import { resolveUserPlan } from '@/app/lib/entitlements';
import { upsertRepository } from '@/app/lib/repository';
import { runAI } from '@/app/lib/ai-client';
import { getSessionUser } from '@/app/lib/auth-server';
import { getOctokitForCurrentUser } from '@/app/lib/github-server';
import { createReadmePullRequest } from '@/app/lib/delivery/githubAutomation';
function inferTechStack(filePaths) {
    const stack = new Set();
    const joined = filePaths.join('\n').toLowerCase();
    if (joined.includes('next.config'))
        stack.add('Next.js');
    if (joined.includes('package.json'))
        stack.add('Node.js');
    if (joined.includes('tsconfig'))
        stack.add('TypeScript');
    if (joined.includes('tailwind.config') || joined.includes('globals.css'))
        stack.add('Tailwind CSS');
    if (joined.includes('supabase'))
        stack.add('Supabase');
    if (joined.includes('clerk'))
        stack.add('Clerk');
    return [...stack];
}
function extractApiRoutes(filePaths) {
    return filePaths
        .filter((p) => p.startsWith('app/api/') && p.endsWith('/route.ts'))
        .map((p) => p.replace('app/api', '/api').replace('/route.ts', ''))
        .slice(0, 25);
}
export async function POST(req) {
    try {
        const { repoOwner, repoName, autoCreatePr = false } = await req.json();
        if (!repoOwner || !repoName) {
            return NextResponse.json({ error: 'Repository owner and name required' }, { status: 400 });
        }
        const sessionUser = await getSessionUser();
        const userId = sessionUser === null || sessionUser === void 0 ? void 0 : sessionUser.userId;
        if (!userId) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        const supabase = createAdminClient();
        const github = await getOctokitForCurrentUser();
        if (!github.ok || !github.octokit) {
            return NextResponse.json({ error: github.error || 'GitHub OAuth required' }, { status: github.status || 403 });
        }
        const plan = await resolveUserPlan(userId, supabase);
        // Check and increment README generation limit
        await checkAndIncrementLimit(userId, plan, 'readme_generation', 'readme_generations');
        // Upsert repository
        const repoId = await upsertRepository(repoOwner, repoName);
        const { data: repo } = await supabase
            .from('repositories')
            .select('*')
            .eq('id', repoId)
            .single();
        if (!repo) {
            throw new Error('Repository not found after upsert');
        }
        const treeResponse = await github.octokit.rest.git.getTree({
            owner: repoOwner,
            repo: repoName,
            tree_sha: repo.default_branch || 'main',
            recursive: '1',
        });
        const filePaths = (treeResponse.data.tree || [])
            .filter((item) => item.type === 'blob' && Boolean(item.path))
            .map((item) => String(item.path));
        const topFolders = [...new Set(filePaths.map((p) => p.split('/')[0]).filter(Boolean))].slice(0, 15);
        const apiRoutes = extractApiRoutes(filePaths);
        const techStack = inferTechStack(filePaths);
        const readmePrompt = `You are generating a production-grade README.md for a repository.

Repository metadata:
- Full name: ${repo.full_name}
- Primary language: ${repo.language || 'Unknown'}
- Stars: ${repo.stars || 0}
- Forks: ${repo.forks || 0}
- Private: ${repo.is_private}

Detected tech stack:
${techStack.map((t) => `- ${t}`).join('\n') || '- Unknown'}

Top-level folders:
${topFolders.map((f) => `- ${f}/`).join('\n') || '- Not available'}

Detected API endpoints:
${apiRoutes.map((r) => `- ${r}`).join('\n') || '- None detected'}

Instructions:
- Return ONLY markdown.
- Keep content accurate to the provided metadata.
- Include these sections in order:
  1) Overview
  2) Features
  3) Tech Stack
  4) Architecture
  5) Folder Structure
  6) Installation
  7) Usage
  8) API Documentation
  9) Contribution Guide
  10) License
- For commands, provide practical defaults for Node/Next.js projects.
- Keep tone professional and concise.
`;
        const readmeContent = await runAI(readmePrompt);
        await supabase
            .from('readme_generations')
            .insert({
            repo_id: repoId,
            generated_by_user_id: userId,
            content: readmeContent,
        });
        let prUrl = null;
        if (autoCreatePr) {
            const created = await createReadmePullRequest({
                octokit: github.octokit,
                owner: repoOwner,
                repo: repoName,
                readmeContent,
                body: 'Automated README generated from repository intelligence signals.',
            });
            prUrl = created.prUrl;
        }
        return NextResponse.json({
            content: readmeContent,
            prUrl,
            status: 'completed',
            message: autoCreatePr ? 'README generated and PR opened successfully.' : 'README generated successfully',
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        console.error('README generation error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
