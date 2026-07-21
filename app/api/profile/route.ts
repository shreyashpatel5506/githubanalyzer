import { NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase';
import { PLAN_LIMITS } from '@/app/lib/billing';
import { resolveUserPlan } from '@/app/lib/entitlements';
import { getSessionUser } from '@/app/lib/auth-server';

export async function GET() {
    try {
        const sessionUser = await getSessionUser();

        if (!sessionUser?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = sessionUser.userId;

        const supabase = createAdminClient();
        const userEmail = sessionUser.email || `${userId}@placeholder.local`;
        const defaultDisplayName = sessionUser.fullName || userEmail.split('@')[0] || 'User';

        // Get or create user profile
        const { data: existingProfile, error: profileLookupError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        let profile = existingProfile;

        if (profileLookupError || !profile) {
            // Create profile if it doesn't exist
            const { data: newProfile, error: profileInsertError } = await supabase
                .from('profiles')
                .insert({
                    id: userId,
                    email: userEmail,
                    full_name: defaultDisplayName,
                    avatar_url: sessionUser.avatarUrl,
                    last_login_at: new Date().toISOString(),
                    subscription_plan: 'free',
                })
                .select()
                .single();

            if (profileInsertError) {
                return NextResponse.json({ error: profileInsertError.message }, { status: 500 });
            }

            profile = newProfile;
        }

        if (!profile) {
            return NextResponse.json({
                user: {
                    username: defaultDisplayName,
                    email: userEmail,
                    avatar: sessionUser.avatarUrl || '/default-avatar.png',
                },
                plan: 'free',
                limits: {
                    repo_scan: { used: 0, limit: 5 },
                    profile_scan: { used: 0, limit: 1 },
                    readme_generation: { used: 0, limit: 3 },
                    eslint_analysis: { used: 0, limit: 5 },
                    code_smell_scan: { used: 0, limit: 0 },
                    bug_detection_usage: { used: 0, limit: 0 },
                    security_scan_usage: { used: 0, limit: 0 },
                    bug_detection: false,
                    security_scan: false,
                    pr_publish: false,
                },
                resetInHours: 720,
            });
        }

        const planKey = await resolveUserPlan(userId, supabase);
        const limits = PLAN_LIMITS[planKey as keyof typeof PLAN_LIMITS];

        // Calculate usage for current month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const [repoScans, profileScans, readmeGens, userScans, usageMeter] = await Promise.all([
            supabase
                .from('repo_scans')
                .select('*', { count: 'exact', head: true })
                .eq('requested_by_user_id', userId)
                .gte('created_at', startOfMonth.toISOString()),
            supabase
                .from('scanned_profiles')
                .select('*', { count: 'exact', head: true })
                .eq('scanned_by_user_id', userId)
                .gte('created_at', startOfMonth.toISOString()),
            supabase
                .from('readme_generations')
                .select('*', { count: 'exact', head: true })
                .eq('generated_by_user_id', userId)
                .gte('created_at', startOfMonth.toISOString()),
            supabase
                .from('repo_scans')
                .select('id')
                .eq('requested_by_user_id', userId)
                .gte('created_at', startOfMonth.toISOString()),
            supabase
                .from('usage_meters')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle(),
        ]);

        const scanIds = (userScans.data || []).map((scan: { id: string }) => scan.id);

        let eslintAnalysesCount = 0;
        if (scanIds.length > 0) {
            const { count } = await supabase
                .from('eslint_reports')
                .select('*', { count: 'exact', head: true })
                .in('repo_scan_id', scanIds);

            eslintAnalysesCount = count || 0;
        }

        // Calculate hours until next month
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const resetInHours = Math.ceil((nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60));

        return NextResponse.json({
            user: {
                username: profile.full_name || defaultDisplayName,
                email: profile.email || userEmail,
                avatar: profile.avatar_url || sessionUser.avatarUrl || '/default-avatar.png',
            },
            plan: planKey,
            limits: {
                repo_scan: {
                    used: usageMeter.data?.repo_scans ?? repoScans.count ?? 0,
                    limit: limits.repo_scan,
                },
                profile_scan: {
                    used: profileScans.count || 0,
                    limit: limits.profile_scan,
                },
                readme_generation: {
                    used: usageMeter.data?.readme_generations ?? readmeGens.count ?? 0,
                    limit: limits.readme_generation,
                },
                eslint_analysis: {
                    used: usageMeter.data?.eslint_analyses ?? eslintAnalysesCount,
                    limit: limits.eslint_analysis,
                },
                code_smell_scan: {
                    used: usageMeter.data?.code_smell_scans ?? 0,
                    limit: limits.deep_code_smell_scan,
                },
                bug_detection_usage: {
                    used: usageMeter.data?.bug_detections ?? 0,
                    limit: limits.deep_code_smell_scan,
                },
                security_scan_usage: {
                    used: usageMeter.data?.security_scans ?? 0,
                    limit: limits.deep_code_smell_scan,
                },
                bug_detection: limits.bug_detection,
                security_scan: limits.security_scan,
                pr_publish: limits.pr_publish,
            },
            resetInHours,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Profile fetch error:', error);
        return NextResponse.json({
            error: message,
            user: {
                username: 'User',
                email: '',
                avatar: '/default-avatar.png',
            },
            plan: 'free',
            limits: {
                repo_scan: { used: 0, limit: 5 },
                profile_scan: { used: 0, limit: 1 },
                readme_generation: { used: 0, limit: 3 },
                eslint_analysis: { used: 0, limit: 5 },
                code_smell_scan: { used: 0, limit: 0 },
                bug_detection_usage: { used: 0, limit: 0 },
                security_scan_usage: { used: 0, limit: 0 },
                bug_detection: false,
                security_scan: false,
                pr_publish: false,
            },
            resetInHours: 720,
        });
    }
}
