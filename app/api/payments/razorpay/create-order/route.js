import { NextResponse } from 'next/server';
import { PLAN_LIMITS, PLAN_PRICES, syncPlansCatalog } from '@/app/lib/billing';
import { createAdminClient } from '@/app/lib/supabase';
import { getSessionUser } from '@/app/lib/auth-server';
import { createRazorpayClient, getRazorpayCurrency, getRazorpayKeyId, getRazorpayMode } from '@/app/lib/razorpay';
export const runtime = 'nodejs';
function buildRazorpayReceipt(userId, planKey) {
    const safePlan = planKey.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10) || 'plan';
    const userTail = userId.replace(/[^a-zA-Z0-9]/g, '').slice(-8) || 'user';
    const stamp = Date.now().toString(36).slice(-8);
    // Razorpay receipt max length is 40 chars.
    return `cc_${safePlan}_${userTail}_${stamp}`.slice(0, 40);
}
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
        if (planKey === 'free') {
            return NextResponse.json({ error: 'Free plan does not require Razorpay payment.' }, { status: 400 });
        }
        await syncPlansCatalog();
        const supabase = createAdminClient();
        const userEmail = user.email || `${user.userId}@placeholder.local`;
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
        const amountInPaise = Math.round(PLAN_PRICES[planKey] * 100);
        const razorpay = createRazorpayClient();
        const order = await razorpay.orders.create({
            amount: amountInPaise,
            currency: getRazorpayCurrency(),
            receipt: buildRazorpayReceipt(user.userId, planKey),
            notes: {
                user_id: user.userId,
                plan_key: planKey,
                user_email: userEmail,
            },
        });
        return NextResponse.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: getRazorpayKeyId(),
            mode: getRazorpayMode(),
            planKey,
            name: 'ClarityCode',
            description: `ClarityCode ${planKey} monthly subscription`,
            prefill: {
                name: user.fullName || 'User',
                email: userEmail,
            },
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create Razorpay order';
        const providerError = error && typeof error === 'object' && 'error' in error
            ? error.error
            : undefined;
        const details = error && typeof error === 'object'
            ? {
                code: 'code' in error ? String(error.code || '') : undefined,
                statusCode: 'statusCode' in error ? Number(error.statusCode || 0) : undefined,
                description: 'description' in error ? String(error.description || '') : undefined,
                razorpayCode: providerError === null || providerError === void 0 ? void 0 : providerError.code,
                razorpayDescription: providerError === null || providerError === void 0 ? void 0 : providerError.description,
                razorpayReason: providerError === null || providerError === void 0 ? void 0 : providerError.reason,
            }
            : undefined;
        console.error('[RAZORPAY_CREATE_ORDER_FAILED]', {
            message,
            details,
        });
        return NextResponse.json({
            error: message,
            details,
        }, { status: 500 });
    }
}
