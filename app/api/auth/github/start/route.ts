import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // // In production, prefer the explicitly configured live app domain.
    // if (inProduction) {
    //   return configuredUrl.origin;
    // }

    // Prevent accidental redirect to a different host (e.g., protected Vercel URL)
    // unless explicitly allowed.
    if (!allowCrossOrigin && configuredUrl.hostname !== requestUrl.hostname) {
      return requestOrigin;
    }

    return configuredUrl.origin;
  } catch {
    return requestOrigin;
  }
}

function normalizePathname(pathname: string): string {
  const collapsed = pathname.replace(/\/{2,}/g, '/');
  return collapsed.startsWith('/') ? collapsed : `/${collapsed}`;
}

function redirectUrl(reqUrl: string, next: string): string {
  const configuredRedirect = process.env.SUPABASE_OAUTH_REDIRECT_URL?.trim();
  const requestUrl = new URL(reqUrl);
  const requestOrigin = requestUrl.origin;
  const target = (() => {
    if (!configuredRedirect) {
      return new URL('/api/auth/github/callback', appUrl(reqUrl));
    }

    try {
      const candidate = new URL(configuredRedirect);
      const inProduction = process.env.NODE_ENV === 'production';
      const localhostHostnames = new Set(['localhost', '127.0.0.1']);
      const allowCrossOrigin = process.env.ALLOW_CROSS_ORIGIN_OAUTH === 'true';

      if (inProduction && localhostHostnames.has(candidate.hostname)) {
        return new URL('/api/auth/github/callback', requestOrigin);
      }

      // if (inProduction) {
      //   candidate.pathname = normalizePathname(candidate.pathname);
      //   return candidate;
      // }

      if (!allowCrossOrigin && candidate.hostname !== requestUrl.hostname) {
        return new URL('/api/auth/github/callback', requestOrigin);
      }

      candidate.pathname = normalizePathname(candidate.pathname);

      return candidate;
    } catch {
      return new URL('/api/auth/github/callback', requestOrigin);
    }
  })();

  target.searchParams.set('next', next);
  return target.toString();
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const next = url.searchParams.get('next') || '/repos';

    const supabase = await createClient();
    const redirectTo = redirectUrl(req.url, next);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo,
        scopes: 'read:user user:email repo',
      },
    });

    if (error || !data?.url) {
      return NextResponse.redirect(`${appUrl(req.url)}/?auth=oauth_error`);
    }

    return NextResponse.redirect(data.url);
  } catch {
    return NextResponse.redirect(`${appUrl(req.url)}/?auth=oauth_exception`);
  }
}
