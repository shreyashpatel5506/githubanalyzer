import { NextResponse } from 'next/server';
import { PLAN_LIMITS, PLAN_PRICES, syncPlansCatalog } from '@/app/lib/billing';
import { createAdminClient } from '@/app/lib/supabase';
import { getSessionUser } from '@/app/lib/auth-server';
import { getPayPalAccessToken, getPayPalBaseUrl } from '@/app/lib/paypal';
function appUrl() {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}
export async function POST(req) {
    var _a, _b;
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
            return NextResponse.json({ error: 'Free plan does not require PayPal payment.' }, { status: 400 });
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
        const amount = PLAN_PRICES[planKey].toFixed(2);
        const accessToken = await getPayPalAccessToken();
        const baseUrl = getPayPalBaseUrl();
        const createOrderResponse = await fetch(`${baseUrl}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'PayPal-Request-Id': `clarity-${user.userId}-${Date.now()}`,
            },
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [
                    {
                        reference_id: `plan_${planKey}`,
                        custom_id: `${user.userId}:${planKey}`,
                        amount: {
                            currency_code: 'USD',
                            value: amount,
                        },
                        description: `ClarityCode ${planKey} monthly subscription`,
                    },
                ],
                application_context: {
                    return_url: `${appUrl()}/api/payments/paypal/capture`,
                    cancel_url: `${appUrl()}/pricing?payment=cancelled`,
                    user_action: 'PAY_NOW',
                },
            }),
            cache: 'no-store',
        });
        const orderData = await createOrderResponse.json();
        if (!createOrderResponse.ok || !orderData.id) {
            return NextResponse.json({
                error: orderData.message || 'Failed to create PayPal order',
            }, { status: 500 });
        }
        const approveLink = (_b = (_a = orderData.links) === null || _a === void 0 ? void 0 : _a.find((link) => link.rel === 'approve')) === null || _b === void 0 ? void 0 : _b.href;
        if (!approveLink) {
            return NextResponse.json({ error: 'PayPal approval URL missing' }, { status: 500 });
        }
        return NextResponse.json({
            orderId: orderData.id,
            status: orderData.status,
            approveUrl: approveLink,
            planKey,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create PayPal order';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
