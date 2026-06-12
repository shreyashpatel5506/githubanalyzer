import { NextResponse } from 'next/server';
import { getSessionUser } from '@/app/lib/auth-server';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
export async function GET() {
    const user = await getSessionUser();
    if (!user) {
        return NextResponse.json({ authenticated: false }, { status: 200 });
    }
    return NextResponse.json({
        authenticated: true,
        user,
    });
}
export async function POST(req) {
    try {
        const body = (await req.json().catch(() => ({})));
        const { userId, email, fullName, avatarUrl } = body;
        if (!userId || !email) {
            return NextResponse.json({ error: 'userId and email are required' }, { status: 400 });
        }
        const expectedToken = process.env.SESSION_BOOTSTRAP_TOKEN;
        if (!expectedToken) {
            return NextResponse.json({
                error: 'SESSION_BOOTSTRAP_TOKEN is not configured',
            }, { status: 500 });
        }
        const providedToken = req.headers.get('x-session-bootstrap-token');
        if (!providedToken || providedToken !== expectedToken) {
            return NextResponse.json({ error: 'Invalid bootstrap token' }, { status: 401 });
        }
        const res = NextResponse.json({
            success: true,
            message: 'Session established',
        });
        res.cookies.set('cc_user_id', userId, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: COOKIE_MAX_AGE,
        });
        res.cookies.set('cc_user_email', email, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: COOKIE_MAX_AGE,
        });
        if (fullName) {
            res.cookies.set('cc_user_name', fullName, {
                httpOnly: true,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                path: '/',
                maxAge: COOKIE_MAX_AGE,
            });
        }
        if (avatarUrl) {
            res.cookies.set('cc_user_avatar', avatarUrl, {
                httpOnly: true,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                path: '/',
                maxAge: COOKIE_MAX_AGE,
            });
        }
        return res;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to bootstrap session';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
export async function DELETE() {
    const res = NextResponse.json({ success: true, message: 'Session cleared' });
    for (const key of ['cc_user_id', 'cc_user_email', 'cc_user_name', 'cc_user_avatar']) {
        res.cookies.set(key, '', {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 0,
        });
    }
    return res;
}
