import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/app/lib/supabase';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
function appUrl(reqUrl) {
    var _a, _b;
    const requestOrigin = new URL(reqUrl).origin;
    const configured = ((_a = process.env.NEXT_PUBLIC_SITE_URL) === null || _a === void 0 ? void 0 : _a.trim()) || ((_b = process.env.NEXT_PUBLIC_APP_URL) === null || _b === void 0 ? void 0 : _b.trim());
    if (!configured)
        return requestOrigin;
    try {
        const requestUrl = new URL(reqUrl);
        const configuredUrl = new URL(configured);
        const inProduction = process.env.NODE_ENV === 'production';
        const localhostHostnames = new Set(['localhost', '127.0.0.1']);
        const allowCrossOrigin = process.env.ALLOW_CROSS_ORIGIN_OAUTH === 'true';
        if (inProduction && localhostHostnames.has(configuredUrl.hostname)) {
            return requestOrigin;
        }
        if (!allowCrossOrigin && configuredUrl.hostname !== requestUrl.hostname) {
            return requestOrigin;
        }
        return configuredUrl.origin;
    }
    catch (_c) {
        return requestOrigin;
    }
}
function safeNextPath(candidate) {
    if (!candidate || !candidate.startsWith('/'))
        return '/repos';
    if (candidate.startsWith('//'))
        return '/repos';
    return candidate;
}
export async function GET(req) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
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
        if (userError || !(userResult === null || userResult === void 0 ? void 0 : userResult.user)) {
            return NextResponse.redirect(`${appUrl(req.url)}/?auth=user_fetch_failed`);
        }
        const user = userResult.user;
        const email = user.email || `${user.id}@placeholder.local`;
        const fullName = ((_a = user.user_metadata) === null || _a === void 0 ? void 0 : _a.full_name) ||
            ((_b = user.user_metadata) === null || _b === void 0 ? void 0 : _b.user_name) ||
            email.split('@')[0] ||
            'User';
        const avatarUrl = (_c = user.user_metadata) === null || _c === void 0 ? void 0 : _c.avatar_url;
        const providerToken = ((_d = exchangeData === null || exchangeData === void 0 ? void 0 : exchangeData.session) === null || _d === void 0 ? void 0 : _d.provider_token) ||
            ((_e = exchangeData === null || exchangeData === void 0 ? void 0 : exchangeData.session) === null || _e === void 0 ? void 0 : _e.access_token) ||
            null;
        const identities = Array.isArray(user.identities) ? user.identities : [];
        const githubIdentity = identities.find((identity) => (identity === null || identity === void 0 ? void 0 : identity.provider) === 'github');
        const githubUserId = (githubIdentity === null || githubIdentity === void 0 ? void 0 : githubIdentity.id) || (githubIdentity === null || githubIdentity === void 0 ? void 0 : githubIdentity.identity_id) || null;
        const githubUsername = ((_f = user.user_metadata) === null || _f === void 0 ? void 0 : _f.user_name) ||
            ((_g = user.user_metadata) === null || _g === void 0 ? void 0 : _g.preferred_username) ||
            ((_h = user.user_metadata) === null || _h === void 0 ? void 0 : _h.name) ||
            email.split('@')[0];
        if (providerToken && githubUserId && githubUsername) {
            try {
                const admin = createAdminClient();
                await admin.from('github_identities').upsert({
                    user_id: user.id,
                    github_user_id: String(githubUserId),
                    username: githubUsername,
                    access_token: providerToken,
                    scope: 'read:user user:email repo',
                    created_at: new Date().toISOString(),
                }, { onConflict: 'github_user_id' });
            }
            catch (_j) {
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
    }
    catch (_k) {
        return NextResponse.redirect(`${appUrl(req.url)}/?auth=callback_exception`);
    }
}
