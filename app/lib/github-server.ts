import { Octokit } from 'octokit';
import { createAdminClient } from '@/app/lib/supabase';
import { getSessionUser } from '@/app/lib/auth-server';
import { createClient } from '@/lib/supabase/server';

export async function getGitHubTokenForCurrentUser() {
  const sessionUser = await getSessionUser();
  const userId = sessionUser?.userId || null;

  if (!userId) {
    return { userId: null, token: null, error: 'Unauthorized' as const };
  }

  const admin = createAdminClient();

  const { data: identity } = await admin
    .from('github_identities')
    .select('access_token')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let token = identity?.access_token || null;

  if (!token) {
    try {
      const supabase = await createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      token = (sessionData.session as any)?.provider_token || null;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.warn(`[GitHub] Failed to get session token: ${message}`);
      token = null;
    }
  }

  if (!token) {
    return {
      userId,
      token: null,
      error: 'GitHub account not connected. Please sign in with GitHub OAuth.' as const,
    };
  }

  return { userId, token, error: null as null };
}

export async function getOctokitForCurrentUser() {
  const tokenResult = await getGitHubTokenForCurrentUser();

  if (!tokenResult.userId) {
    return {
      ok: false as const,
      status: 401,
      error: tokenResult.error || 'Unauthorized',
      userId: null,
      octokit: null,
      token: null,
    };
  }

  if (!tokenResult.token) {
    return {
      ok: false as const,
      status: 403,
      error: tokenResult.error || 'GitHub token unavailable',
      userId: tokenResult.userId,
      octokit: null,
      token: null,
    };
  }

  return {
    ok: true as const,
    status: 200,
    error: null,
    userId: tokenResult.userId,
    token: tokenResult.token,
    octokit: new Octokit({ auth: tokenResult.token }),
  };
}
