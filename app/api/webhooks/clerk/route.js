import { NextResponse } from 'next/server';
export async function POST(_req) {
    return NextResponse.json({
        ok: true,
        ignored: true,
        message: 'Deprecated webhook endpoint. Clerk integration has been removed.',
    });
}
