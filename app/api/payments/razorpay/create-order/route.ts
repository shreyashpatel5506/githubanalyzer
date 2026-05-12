import { NextResponse } from 'next/server';
import { PLAN_LIMITS, PLAN_PRICES, syncPlansCatalog } from '@/app/lib/billing';
import { createAdminClient } from '@/app/lib/supabase';
import { getSessionUser } from '@/app/lib/auth-server';
import { createRazorpayClient, getRazorpayCurrency, getRazorpayKeyId, getRazorpayMode } from '@/app/lib/razorpay';

export const runtime = 'nodejs';

function buildRazorpayReceipt(userId: string, planKey: string): string {
    const safePlan = planKey.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10) || 'plan';
    const userTail = userId.replace(/[^a-zA-Z0-9]/g, '').slice(-8) || 'user';
    const stamp = Date.now().toString(36).slice(-8);

    // Razorpay receipt max length is 40 chars.
    return `cc_${safePlan}_${userTail}_${stamp}`.slice(0, 40);
}

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
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to create Razorpay order';
        const providerError = error && typeof error === 'object' && 'error' in error
            ? (error as { error?: { code?: string; description?: string; reason?: string } }).error
            : undefined;

        const details = error && typeof error === 'object'
            ? {
                code: 'code' in error ? String((error as { code?: unknown }).code || '') : undefined,
                statusCode: 'statusCode' in error ? Number((error as { statusCode?: unknown }).statusCode || 0) : undefined,
                description: 'description' in error ? String((error as { description?: unknown }).description || '') : undefined,
                razorpayCode: providerError?.code,
                razorpayDescription: providerError?.description,
                razorpayReason: providerError?.reason,
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
