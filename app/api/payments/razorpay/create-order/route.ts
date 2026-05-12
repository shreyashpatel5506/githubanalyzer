import { NextResponse } from 'next/server';
import { PLAN_LIMITS, PLAN_PRICES, syncPlansCatalog } from '@/app/lib/billing';
import { createAdminClient } from '@/app/lib/supabase';
import { getSessionUser } from '@/app/lib/auth-server';
import { createRazorpayClient, getRazorpayCurrency, getRazorpayKeyId, getRazorpayMode } from '@/app/lib/razorpay';

export async function POST(req: Request) {
    try {
        const user = await getSessionUser();
        if (!user?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json().catch(() => ({})) as { planKey?: string };
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
            .upsert(
                {
                    id: user.userId,
                    email: userEmail,
                    full_name: user.fullName || 'User',
                    avatar_url: user.avatarUrl,
                    last_login_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'id' }
            );

        const amountInPaise = Math.round(PLAN_PRICES[planKey as keyof typeof PLAN_PRICES] * 100);
        const razorpay = createRazorpayClient();

        const order = await razorpay.orders.create({
            amount: amountInPaise,
            currency: getRazorpayCurrency(),
            receipt: `clarity_${user.userId}_${planKey}_${Date.now()}`,
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
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to create Razorpay order';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
