import { NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase';
import { getSessionUser } from '@/app/lib/auth-server';
import { setUserPlan } from '@/app/lib/entitlements';
import { PLAN_LIMITS } from '@/app/lib/billing';
import { verifyRazorpaySignature } from '@/app/lib/razorpay';

export async function POST(req: Request) {
    try {
        const sessionUser = await getSessionUser();
        if (!sessionUser?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json().catch(() => ({})) as {
            razorpay_order_id?: string;
            razorpay_payment_id?: string;
            razorpay_signature?: string;
            planKey?: string;
            userId?: string;
        };

        const orderId = body.razorpay_order_id?.trim();
        const paymentId = body.razorpay_payment_id?.trim();
        const signature = body.razorpay_signature?.trim();
        const planKey = body.planKey?.trim();
        const userId = body.userId?.trim();

        if (!orderId || !paymentId || !signature || !planKey) {
            return NextResponse.json({ error: 'Missing Razorpay verification data' }, { status: 400 });
        }

        if (!(planKey in PLAN_LIMITS) || planKey === 'free') {
            return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
        }

        if (userId && userId !== sessionUser.userId) {
            return NextResponse.json({ error: 'User mismatch' }, { status: 403 });
        }

        const isValidSignature = verifyRazorpaySignature({
            orderId,
            paymentId,
            signature,
        });

        if (!isValidSignature) {
            return NextResponse.json({ error: 'Invalid Razorpay signature' }, { status: 400 });
        }

        const supabase = createAdminClient();
        await setUserPlan(sessionUser.userId, planKey, 'active', supabase);

        await supabase.from('plan_change_history').insert({
            user_id: sessionUser.userId,
            new_plan_key: planKey,
            changed_by: 'razorpay',
            reason: `payment:${paymentId}`,
        });

        await supabase.from('webhook_events').insert({
            provider: 'razorpay',
            event_id: paymentId,
            event_type: 'payment.captured',
            payload: {
                razorpay_order_id: orderId,
                razorpay_payment_id: paymentId,
                razorpay_signature: signature,
                planKey,
            },
            processed: true,
            processed_at: new Date().toISOString(),
        });

        return NextResponse.json({
            success: true,
            planKey,
            message: 'Payment verified and plan activated',
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to verify Razorpay payment';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
