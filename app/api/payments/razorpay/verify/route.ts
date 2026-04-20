import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    void req;
    return NextResponse.json(
        {
            error: 'Razorpay flow is deprecated. Use PayPal capture flow at /api/payments/paypal/capture.',
        },
        { status: 410 }
    );
}
