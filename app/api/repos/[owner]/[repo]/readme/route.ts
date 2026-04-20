import { NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase';
import { getSessionUser } from '@/app/lib/auth-server';
import { getOctokitForCurrentUser } from '@/app/lib/github-server';

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
        if (github.ok && github.octokit) {
            try {
                const ghReadme = await github.octokit.rest.repos.getReadme({ owner, repo });
                const content = Buffer.from(ghReadme.data.content || '', 'base64').toString('utf-8');
                if (content?.trim()) {
                    return NextResponse.json({ readme: content });
                }
            } catch {
                // Fall back to generated README from DB.
            }
        }

        const { data: repository } = await supabase
            .from('repositories')
            .select('id')
            .eq('owner_username', owner)
            .eq('name', repo)
            .single();

        if (!repository) {
            return NextResponse.json({ readme: null });
        }

        const { data: readme } = await supabase
            .from('readme_generations')
            .select('content')
            .eq('repo_id', repository.id)
            .eq('generated_by_user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        return NextResponse.json({ readme: readme?.content || null });
    } catch (error: any) {
        console.error('README fetch error:', error);
        return NextResponse.json({ readme: null });
    }
}
