import { NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase';
import { getSessionUser } from '@/app/lib/auth-server';
import { setUserPlan } from '@/app/lib/entitlements';
import { PLAN_LIMITS } from '@/app/lib/billing';
import { getPayPalAccessToken, getPayPalBaseUrl } from '@/app/lib/paypal';

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

function parsePlanFromCustomId(customId: string | undefined): { userId?: string; planKey?: string } {
  if (!customId) return {};
  const [userId, planKey] = customId.split(':');
  return { userId, planKey };
}


export async function GET(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.userId) {
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

    const captureData = await captureRes.json() as {
      status?: string;
      purchase_units?: Array<{ custom_id?: string }>;
      id?: string;
      message?: string;
    };

    if (!captureRes.ok) {
      return NextResponse.redirect(`${appUrl()}/pricing?payment=failed`);
    }

    const customId = captureData.purchase_units?.[0]?.custom_id;
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
  } catch {
    return NextResponse.redirect(`${appUrl()}/pricing?payment=error`);
  }
}
