import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/app/lib/supabase';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function appUrl(reqUrl: string): string {
  const requestOrigin = new URL(reqUrl).origin;
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!configured) return requestOrigin;

  try {
    const requestUrl = new URL(reqUrl);
    const configuredUrl = new URL(configured);
    const inProduction = process.env.NODE_ENV === 'production';
    const localhostHostnames = new Set(['localhost', '127.0.0.1']);
    const allowCrossOrigin = process.env.ALLOW_CROSS_ORIGIN_OAUTH === 'true';

    if (inProduction && localhostHostnames.has(configuredUrl.hostname)) {
      return requestOrigin;
    }

    // In production, prefer the explicitly configured live app domain.
    // if (inProduction) {
    //   return configuredUrl.origin;
    // }

    if (!allowCrossOrigin && configuredUrl.hostname !== requestUrl.hostname) {
      return requestOrigin;
    }

    return configuredUrl.origin;
  } catch {
    return requestOrigin;
  }
}

function safeNextPath(candidate: string | null): string {
  if (!candidate || !candidate.startsWith('/')) return '/repos';
  if (candidate.startsWith('//')) return '/repos';
  return candidate;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const next = safeNextPath(url.searchParams.get('next'));

    if (!code) {
      return NextResponse.redirect(`${appUrl(req.url)}/?auth=missing_code`);
    }

    const supabase = await createClient();
    const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      return NextResponse.redirect(`${appUrl(req.url)}/?auth=exchange_failed`);
    }

    const { data: userResult, error: userError } = await supabase.auth.getUser();
    if (userError || !userResult?.user) {
      return NextResponse.redirect(`${appUrl(req.url)}/?auth=user_fetch_failed`);
    }

    const user = userResult.user;
    const email = user.email || `${user.id}@placeholder.local`;
    const fullName =
      (user.user_metadata?.full_name as string | undefined) ||
      (user.user_metadata?.user_name as string | undefined) ||
      email.split('@')[0] ||
      'User';
    const avatarUrl = user.user_metadata?.avatar_url as string | undefined;

    const providerToken =
      exchangeData?.session?.provider_token ||
      exchangeData?.session?.access_token ||
      null;

    const identities = Array.isArray(user.identities) ? user.identities : [];
    const githubIdentity = identities.find((identity: any) => identity?.provider === 'github') as any;
    const githubUserId = githubIdentity?.id || githubIdentity?.identity_id || null;
    const githubUsername =
      (user.user_metadata?.user_name as string | undefined) ||
      (user.user_metadata?.preferred_username as string | undefined) ||
      (user.user_metadata?.name as string | undefined) ||
      email.split('@')[0];

    if (providerToken && githubUserId && githubUsername) {
      try {
        const admin = createAdminClient();
        await admin.from('github_identities').upsert(
          {
            user_id: user.id,
            github_user_id: String(githubUserId),
            username: githubUsername,
            access_token: providerToken,
            scope: 'read:user user:email repo',
            created_at: new Date().toISOString(),
          },
          { onConflict: 'github_user_id' },
        );
      } catch {
        // Non-fatal: user session is already established; token can be refreshed on next login.
      }
    }

    const redirectResponse = NextResponse.redirect(`${appUrl(req.url)}${next}`);

    redirectResponse.cookies.set('cc_user_id', user.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    });

    redirectResponse.cookies.set('cc_user_email', email, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    });

    redirectResponse.cookies.set('cc_user_name', fullName, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    });

    if (avatarUrl) {
      redirectResponse.cookies.set('cc_user_avatar', avatarUrl, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: COOKIE_MAX_AGE,
      });
    }

    return redirectResponse;
  } catch {
    return NextResponse.redirect(`${appUrl(req.url)}/?auth=callback_exception`);
  }
}
