import { NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase';
import { setUserPlan } from '@/app/lib/entitlements';
import { PLAN_LIMITS, syncPlansCatalog } from '@/app/lib/billing';
import { getSessionUser } from '@/app/lib/auth-server';
export async function POST(req) {
    try {
        const user = await getSessionUser();
        if (!(user === null || user === void 0 ? void 0 : user.userId)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const body = await req.json().catch(() => ({}));
        const { planKey } = body;
        if (!planKey || !(planKey in PLAN_LIMITS)) {
            return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
        }
        if (planKey !== 'free') {
            return NextResponse.json({
                error: 'Paid plans now require PayPal payment flow. Use /api/payments/paypal/create-order.',
            }, { status: 400 });
        }
        const userEmail = user.email;
        if (!userEmail) {
            return NextResponse.json({ error: 'No email found for this account' }, { status: 400 });
        }
        const supabase = createAdminClient();
        await syncPlansCatalog();
        await supabase
            .from('profiles')
            .upsert({
            id: user.userId,
            email: userEmail,
            full_name: user.fullName || 'User',
            avatar_url: user.avatarUrl,
            last_login_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
        await setUserPlan(user.userId, planKey, 'active', supabase);
        return NextResponse.json({
            success: true,
            planKey,
            message: 'Plan switched to free',
        });
    }
    catch (error) {
        console.error('[CHECKOUT ERROR]:', error);
        return NextResponse.json({
            error: 'Failed to initiate checkout',
            details: error.message
        }, { status: 500 });
    }
}
