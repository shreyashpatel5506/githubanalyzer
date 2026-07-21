import { NextResponse } from 'next/server';
import { PLAN_LIMITS, PLAN_PRICES, syncPlansCatalog } from '@/app/lib/billing';
import { createAdminClient } from '@/app/lib/supabase';
import { getSessionUser } from '@/app/lib/auth-server';
import { getPayPalAccessToken, getPayPalBaseUrl } from '@/app/lib/paypal';

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
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
      return NextResponse.json({ error: 'Free plan does not require PayPal payment.' }, { status: 400 });
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

    const amount = PLAN_PRICES[planKey as keyof typeof PLAN_PRICES].toFixed(2);
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
          landing_page: 'BILLING',
          return_url: `${appUrl()}/api/payments/paypal/capture`,
          cancel_url: `${appUrl()}/pricing?payment=cancelled`,
          user_action: 'PAY_NOW',
        },
      }),
      cache: 'no-store',
    });

    const orderData = await createOrderResponse.json() as {
      id?: string;
      status?: string;
      links?: Array<{ rel?: string; href?: string }>;
      message?: string;
    };

    if (!createOrderResponse.ok || !orderData.id) {
      return NextResponse.json({
        error: orderData.message || 'Failed to create PayPal order',
      }, { status: 500 });
    }

    const approveLink = orderData.links?.find((link) => link.rel === 'approve')?.href;
    if (!approveLink) {
      return NextResponse.json({ error: 'PayPal approval URL missing' }, { status: 500 });
    }

    return NextResponse.json({
      orderId: orderData.id,
      status: orderData.status,
      approveUrl: approveLink,
      planKey,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create PayPal order';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
