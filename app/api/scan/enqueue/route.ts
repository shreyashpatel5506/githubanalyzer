
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { headers } from 'next/headers'
import crypto from 'crypto'
import { createAdminClient } from '@/app/lib/supabase'
import { checkAndIncrementLimit, checkGuestLimit } from '@/app/lib/billing'

export async function POST(req: Request) {
    try {
        const { repoOwner, repoName, repoUrl } = await req.json()

        if (!repoOwner || !repoName) {
            return NextResponse.json({ error: 'Repository details required' }, { status: 400 })
        }

        const { userId } = await auth()
        const supabase = createAdminClient()
        let effectiveUserId: string | null = userId
        let guestId: string | null = null
        let plan = 'free'
        let priority = 0

        // 1. Identify User & Check Limits
        if (userId) {
            // Fetch User Plan
            const { data: profile } = await supabase
                .from('profiles')
                .select('plan')
                .eq('id', userId)
                .single()

            plan = profile?.plan || 'free'

            // Define Priority based on Plan
            if (plan === 'pro') priority = 1
            if (plan === 'pro_plus') priority = 2

            // Check Limit
            try {
                await checkAndIncrementLimit(userId, plan, 'repo_scans')
            } catch (e: any) {
                return NextResponse.json({ error: e.message }, { status: 403 })
            }
        } else {
            // Guest Mode
            const headersList = await headers()
            const userAgent = headersList.get('user-agent') || 'unknown'
            const ip = headersList.get('x-forwarded-for') || '127.0.0.1'
            const rawId = `${ip}-${userAgent}`
            guestId = crypto.createHash('sha256').update(rawId).digest('hex')

            try {
                await checkGuestLimit(guestId)
            } catch (e: any) {
                return NextResponse.json({ error: e.message, isGuestLimit: true }, { status: 403 })
            }
        }

        // 2. Create Scan Job
        const { data: scan, error: scanError } = await supabase
            .from('scans')
            .insert({
                user_id: effectiveUserId,
                // guest_id column might not exist in scans table based on plan, 
                // usually we just track it in usage_meters or add it to scans if we want to associate history.
                // Plan says "user_id UUID ... Null if Guest". 
                // For now, guests don't have persistent history so null user_id is fine.
                repo_owner: repoOwner,
                repo_name: repoName,
                // repo_url removed from schema, ignoring it.
                status: 'queued',
                // priority removed from schema?
                // SCHEMA: status text null default 'queued'::text, result_summary jsonb null, error_message text null
                // Priority is MISSING in new schema. I will remove it to avoid error.
            })
            .select()
            .single()

        if (scanError) {
            console.error('Scan creation failed:', scanError)
            return NextResponse.json({ error: 'Failed to queue scan' }, { status: 500 })
        }

        // 3. Trigger Background Execution (Non-blocking)
        // We don't await this fetch because we want to return the scanId immediately to the UI
        const WORKER_URL = process.env.SCAN_WORKER_URL || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/workers/scan`

        fetch(WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
            },
            body: JSON.stringify({ scanId: scan.id })
        }).catch(err => console.error('Worker trigger failed:', err))

        return NextResponse.json({
            scanId: scan.id,
            status: 'queued',
            message: 'Scan started'
        })

    } catch (error) {
        console.error('Enqueue error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
