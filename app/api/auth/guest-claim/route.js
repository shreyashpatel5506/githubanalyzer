/**
 * Guest Claim Route
 * Converts guest profile scans to authenticated user account
 * Called when user clicks email link from guest scan invite
 */
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase';
import { verifyClaimToken } from '@/app/lib/guest-session';
import { sendWelcomeEmail } from '@/app/lib/brevo';
export async function GET(req) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const token = searchParams.get('token');
        if (!token) {
            return NextResponse.json({ error: 'Missing claim token' }, { status: 400 });
        }
        // Verify claim token
        const claimData = verifyClaimToken(token);
        if (!claimData) {
            return NextResponse.json({ error: 'Invalid or expired claim token' }, { status: 401 });
        }
        const { guestId, email } = claimData;
        // This endpoint should redirect to login/signup with email
        // Frontend will handle the actual Clerk authentication
        const redirectUrl = new URL('/auth/guest-complete', req.nextUrl.origin);
        redirectUrl.searchParams.set('guestId', guestId);
        redirectUrl.searchParams.set('email', email);
        return NextResponse.redirect(redirectUrl);
    }
    catch (error) {
        console.error('[GuestClaim] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
/**
 * Complete guest claim after user authenticates
 * Called from frontend after Clerk authentication
 */
export async function POST(req) {
    try {
        const body = await req.json();
        const { guestId, userId, email } = body;
        if (!guestId || !userId || !email) {
            return NextResponse.json({ error: 'Missing required fields: guestId, userId, email' }, { status: 400 });
        }
        const supabase = createAdminClient();
        // 1. Create user profile if doesn't exist
        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', userId)
            .maybeSingle();
        if (!existingProfile) {
            const { error: profileError } = await supabase.from('profiles').insert({
                id: userId,
                email,
                subscription_plan: 'free',
            });
            if (profileError) {
                console.error('[GuestClaim] Profile creation error:', profileError);
                return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 });
            }
        }
        // 2. Create usage_meters for new user (if doesn't exist)
        const { data: existingUsage } = await supabase
            .from('usage_meters')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();
        if (!existingUsage) {
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            const { error: usageError } = await supabase.from('usage_meters').insert({
                user_id: userId,
                period_start: startOfMonth.toISOString(),
                period_end: new Date(startOfMonth.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                profile_scans: 0,
                repo_scans: 0,
            });
            if (usageError) {
                console.error('[GuestClaim] Usage creation error:', usageError);
            }
        }
        // 3. Link guest scans to authenticated user
        const { error: updateError } = await supabase
            .from('scanned_profiles')
            .update({
            scanned_by_user_id: userId,
            guest_id: null,
        })
            .eq('guest_id', guestId);
        if (updateError) {
            console.error('[GuestClaim] Update error:', updateError);
            return NextResponse.json({ error: 'Failed to link scans to your account' }, { status: 500 });
        }
        // 4. Count how many scans were linked
        const { count: linkedScans } = await supabase
            .from('scanned_profiles')
            .select('*', { count: 'exact', head: true })
            .eq('scanned_by_user_id', userId);
        // 5. Send welcome email
        await sendWelcomeEmail(email);
        // 6. Return success with scan count
        return NextResponse.json({
            success: true,
            message: 'Guest account successfully claimed!',
            userId,
            email,
            linkedScans: linkedScans || 0,
            nextUrl: '/dashboard',
        });
    }
    catch (error) {
        console.error('[GuestClaim] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
