import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    void req;
    return NextResponse.json(
        {
            error: 'Razorpay flow is deprecated. Use /api/payments/paypal/create-order.',
        },
        { status: 410 }
    );
}
