import { NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase';
import { getSessionUser } from '@/app/lib/auth-server';
import { setUserPlan } from '@/app/lib/entitlements';
import { PLAN_LIMITS } from '@/app/lib/billing';
import { getPayPalAccessToken, getPayPalBaseUrl } from '@/app/lib/paypal';
function appUrl() {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}
function parsePlanFromCustomId(customId) {
    if (!customId)
        return {};
    const [userId, planKey] = customId.split(':');
    return { userId, planKey };
}
export async function GET(req) {
    var _a, _b;
    try {
        const sessionUser = await getSessionUser();
        if (!(sessionUser === null || sessionUser === void 0 ? void 0 : sessionUser.userId)) {
            return NextResponse.redirect(`${appUrl()}/pricing?payment=unauthorized`);
        }
        const { searchParams } = new URL(req.url);
        const token = searchParams.get('token');
        if (!token) {
            return NextResponse.redirect(`${appUrl()}/pricing?payment=missing_token`);
        }
        const accessToken = await getPayPalAccessToken();
        const baseUrl = getPayPalBaseUrl();
        const captureRes = await fetch(`${baseUrl}/v2/checkout/orders/${token}/capture`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
        });
        const captureData = await captureRes.json();
        if (!captureRes.ok) {
            return NextResponse.redirect(`${appUrl()}/pricing?payment=failed`);
        }
        const customId = (_b = (_a = captureData.purchase_units) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.custom_id;
        const parsed = parsePlanFromCustomId(customId);
        if (!parsed.planKey || !(parsed.planKey in PLAN_LIMITS) || parsed.planKey === 'free') {
            return NextResponse.redirect(`${appUrl()}/pricing?payment=invalid_plan`);
        }
        if (parsed.userId && parsed.userId !== sessionUser.userId) {
            return NextResponse.redirect(`${appUrl()}/pricing?payment=user_mismatch`);
        }
        const supabase = createAdminClient();
        await setUserPlan(sessionUser.userId, parsed.planKey, 'active', supabase);
        await supabase.from('plan_change_history').insert({
            user_id: sessionUser.userId,
            new_plan_key: parsed.planKey,
            changed_by: 'paypal',
            reason: `order:${captureData.id || token}`,
        });
        await supabase.from('webhook_events').insert({
            provider: 'paypal',
            event_id: captureData.id || token,
            event_type: 'checkout.order.captured',
            payload: captureData,
            processed: true,
            processed_at: new Date().toISOString(),
        });
        return NextResponse.redirect(`${appUrl()}/pricing?payment=success&plan=${encodeURIComponent(parsed.planKey)}`);
    }
    catch (_c) {
        return NextResponse.redirect(`${appUrl()}/pricing?payment=error`);
    }
}
