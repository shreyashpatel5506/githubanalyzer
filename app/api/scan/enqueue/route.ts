import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { createAdminClient } from '@/app/lib/supabase';
import { checkAndIncrementLimit, checkGuestLimit } from '@/app/lib/billing';
import { resolveUserPlan } from '@/app/lib/entitlements';
import { getSessionUser } from '@/app/lib/auth-server';

export async function POST(req: Request) {
    try {
        const requestOrigin = new URL(req.url).origin;
        const sessionUser = await getSessionUser();
        const userId = sessionUser?.userId || null;
        const { repoFullName } = await req.json().catch(() => ({}));

        if (!repoFullName) {
            return NextResponse.json({ error: 'Repository name required' }, { status: 400 });
        }

        const [owner, repo] = repoFullName.split('/');
        if (!owner || !repo) {
            return NextResponse.json({ error: 'Invalid repository format. Expected owner/repo' }, { status: 400 });
        }

        const supabase = createAdminClient();
        let plan = 'free';

        // 1. Identify User & Check Limits
        if (userId) {
            plan = await resolveUserPlan(userId, supabase);

            try {
                await checkAndIncrementLimit(userId, plan, 'repo_scans');
            } catch (e: any) {
                return NextResponse.json({ error: e.message }, { status: 403 });
            }
        } else {
            // Guest Mode
            const headersList = await headers();
            const userAgent = headersList.get('user-agent') || 'unknown';
            const ip = headersList.get('x-forwarded-for') || '127.0.0.1';
            const rawId = `${ip}-${userAgent}`;
            const guestId = crypto.createHash('sha256').update(rawId).digest('hex');

            try {
                await checkGuestLimit(guestId);
            } catch (e: any) {
                return NextResponse.json({ error: e.message, isGuestLimit: true }, { status: 403 });
            }
        }

        // 2. Check if repository exists and verify ownership/presence
        let { data: repository } = await supabase
            .from('repositories')
            .select('*')
            .eq('full_name', repoFullName)
            .maybeSingle();

        if (!repository) {
            const { data: newRepo, error: createError } = await supabase
                .from('repositories')
                .insert({
                    owner_username: owner,
                    name: repo,
                    full_name: repoFullName,
                    owner_user_id: userId || null,
                    github_repo_id: `temp_${Date.now()}`,
                    is_private: false,
                    language: 'Unknown',
                })
                .select()
                .single();

            if (createError) throw createError;
            repository = newRepo;
        }

        // 3. Prevent duplicate scans if one is already pending/processing
        const { data: existingScan } = await supabase
            .from('repo_scans')
            .select('id, status')
            .eq('repo_id', repository.id)
            .in('status', ['pending', 'processing'])
            .maybeSingle();

        if (existingScan) {
            return NextResponse.json({
                success: true,
                scanId: existingScan.id,
                message: 'Analysis already in progress for this repository.',
                status: existingScan.status
            });
        }

        // 4. Create a new scan
        const { data: scan, error: scanError } = await supabase
            .from('repo_scans')
            .insert({
                repo_id: repository.id,
                requested_by_user_id: userId || null,
                status: 'pending',
                started_at: new Date().toISOString()
            })
            .select()
            .single();

        if (scanError) throw scanError;

        // 5. Trigger Background Execution (Non-blocking)
        const WORKER_URL = new URL('/api/workers/scan', requestOrigin).toString();

        fetch(WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
            },
            body: JSON.stringify({ scanId: scan.id })
        }).catch(err => console.error('[SCAN ENQUEUE] Worker trigger failed:', err));

        return NextResponse.json({
            success: true,
            scanId: scan.id,
            message: 'Repository queued for deep analysis. This may take 30-60 seconds.',
            status: 'pending'
        });

    } catch (error: any) {
        console.error('[SCAN ENQUEUE ERROR]:', error);
        return NextResponse.json({
            error: 'Failed to queue analysis',
            details: error.message
        }, { status: 500 });
    }
}
