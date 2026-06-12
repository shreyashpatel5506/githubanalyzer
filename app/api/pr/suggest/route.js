import { NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase';
import { checkAndIncrementLimit } from '@/app/lib/billing';
import { resolveUserPlan } from '@/app/lib/entitlements';
import { runAI } from '@/app/lib/ai-client';
import { getSessionUser } from '@/app/lib/auth-server';
export async function POST(req) {
    try {
        const { repoId } = await req.json();
        const sessionUser = await getSessionUser();
        const userId = sessionUser === null || sessionUser === void 0 ? void 0 : sessionUser.userId;
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const supabase = createAdminClient();
        const plan = await resolveUserPlan(userId, supabase);
        await checkAndIncrementLimit(userId, plan, 'pr_suggestion', 'pr_suggestions_count');
        const { data: repo } = await supabase
            .from('repositories')
            .select('*')
            .eq('id', repoId)
            .single();
        if (!repo) {
            return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
        }
        const prompt = `Generate PR improvement suggestions for:

Repository: ${repo.full_name}
Language: ${repo.language}

Suggest 3-5 improvements as pull requests:
[
  {
    "branch_name": "fix/improve-error-handling",
    "summary": "Add comprehensive error handling",
    "diff_patch": "// Pseudo diff showing changes"
  }
]`;
        const analysis = await runAI(prompt);
        let suggestions = [];
        try {
            suggestions = analysis ? JSON.parse(analysis) : [];
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'JSON parse error';
            console.warn(`[PR Suggestions] Failed to parse AI response: ${message}`);
            suggestions = [];
        }
        const created = [];
        for (const sugg of suggestions) {
            const { data } = await supabase
                .from('pull_request_suggestions')
                .insert({
                repo_id: repoId,
                branch_name: sugg.branch_name,
                summary: sugg.summary,
                diff_patch: sugg.diff_patch,
                status: 'draft'
            })
                .select()
                .single();
            if (data)
                created.push(data);
        }
        return NextResponse.json({ success: true, suggestions: created });
    }
    catch (error) {
        console.error('PR suggestion error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
