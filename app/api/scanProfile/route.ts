import { NextResponse } from 'next/server';
import {
    GITHUB_API,
    GITHUB_GRAPHQL,
    getAuthHeaders,
    validateUsername,
    handleGitHubResponse,
} from '../lib/githubhelper';
import { createAdminClient } from '@/app/lib/supabase';
import { getSessionUser } from '@/app/lib/auth-server';
import { PLAN_LIMITS } from '@/app/lib/billing';
import { resolveUserPlan } from '@/app/lib/entitlements';
import { 
    createGuestSession, 
    verifyGuestSession, 
    extractGuestToken, 
    createClaimToken 
} from '@/app/lib/guest-session';
import { sendBrevoEmail } from '@/app/lib/brevo';

async function fetchExactContributions(username: string, headers: any) {
    const fromDate = new Date(
        Date.now() - 90 * 24 * 60 * 60 * 1000
    ).toISOString();

    const query = `
    query ($login: String!) {
      user(login: $login) {
        contributionsCollection(from: "${fromDate}") {
          totalCommitContributions
          totalPullRequestContributions
          totalIssueContributions
        }
      }
    }
  `;

    try {
        const res = await fetch(GITHUB_GRAPHQL, {
            method: "POST",
            headers: {
                ...headers,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ query, variables: { login: username } }),
        });

        const json = await res.json();

        if (json.errors || !json?.data?.user?.contributionsCollection) {
            return null;
        }

        return json.data.user.contributionsCollection;
    } catch {
        return null;
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { username, token, email: guestEmail } = body;

        // Get authenticated user (if any)
        let sessionUser = null;
        let userId: string | null = null;
        let isGuest = false;
        let guestId: string | null = null;
        let guestToken: string | null = null;

        try {
            sessionUser = await getSessionUser();
            userId = sessionUser?.userId || null;
        } catch {
            userId = null;
        }

        // If no authenticated user, check for guest session
        if (!userId) {
            const authHeader = req.headers.get('Authorization');
            if (authHeader) {
                const token = extractGuestToken(authHeader);
                if (token) {
                    const guestSession = verifyGuestSession(token);
                    if (guestSession) {
                        guestId = guestSession.guestId;
                        isGuest = true;
                    }
                }
            }

            // If no valid guest session, create a new one
            if (!isGuest) {
                const newGuestSession = createGuestSession(guestEmail);
                guestId = newGuestSession.guestId;
                guestToken = newGuestSession.token;
                isGuest = true;
            }
        }

        // 1. Validate Input
        const validation = validateUsername(username);
        if (!validation.valid) {
            return NextResponse.json(
                { error: validation.error },
                { status: 400 }
            );
        }

        const headers = getAuthHeaders(token || "");
        const safeUsername = validation.username!;

        // 2. Fetch Profile (Parallel with others if possible, but sequential is safer for 404 check)
        const profileRes = await fetch(`${GITHUB_API}/users/${safeUsername}`, {
            headers,
        });
        const profileData = await handleGitHubResponse(profileRes, "Profile fetch");

        if (profileData.error) {
            return NextResponse.json(
                { error: profileData.message },
                { status: profileData.status || 500 }
            );
        }

        const githubUserId = profileData.data.id?.toString();
        if (!githubUserId) {
            return NextResponse.json(
                { error: 'Invalid GitHub profile payload: missing user id' },
                { status: 500 }
            );
        }

        // Check plan limits (only for authenticated users)
        if (userId) {
            const supabase = createAdminClient();
            const planKey = await resolveUserPlan(userId, supabase);
            const planLimits = PLAN_LIMITS[planKey as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free;

            const { data: existingScan } = await supabase
                .from('scanned_profiles')
                .select('id')
                .eq('github_user_id', githubUserId)
                .eq('scanned_by_user_id', userId)
                .maybeSingle();

            if (!existingScan) {
                const startOfMonth = new Date();
                startOfMonth.setDate(1);
                startOfMonth.setHours(0, 0, 0, 0);

                const { count: profileScanCount, error: profileScanCountError } = await supabase
                    .from('scanned_profiles')
                    .select('*', { count: 'exact', head: true })
                    .eq('scanned_by_user_id', userId)
                    .gte('created_at', startOfMonth.toISOString());

                if (profileScanCountError) {
                    return NextResponse.json(
                        { error: `Failed to validate profile scan limit: ${profileScanCountError.message}` },
                        { status: 500 }
                    );
                }

                const limit = Number(planLimits.profile_scan);
                const used = profileScanCount || 0;

                if (limit !== -1 && used >= limit) {
                    return NextResponse.json(
                        {
                            error: 'Profile scan limit reached for your plan. Please upgrade to continue.',
                            limit,
                            used,
                            plan: planKey,
                        },
                        { status: 403 }
                    );
                }
            }
        }

        // 3. Fetch Contributions & Repos (Parallel)
        const [contributions, reposRes] = await Promise.all([
            fetchExactContributions(safeUsername, headers),
            fetch(`${GITHUB_API}/users/${safeUsername}/repos?per_page=100&sort=updated`, {
                headers,
            }),
        ]);

        const reposData = await handleGitHubResponse(reposRes, "Repos fetch");
        const repos = reposData.error ? [] : reposData.data;

        const finalContributions = contributions || {
            totalCommitContributions: 0,
            totalPullRequestContributions: 0,
            totalIssueContributions: 0,
        };

        // 4. Store in Supabase

        const supabase = createAdminClient();

        // Upsert scanned_profile
        const { data: scannedProfile, error: profileError } = await supabase
            .from('scanned_profiles')
            .upsert({
                github_user_id: githubUserId,
                username: profileData.data.login,
                profile_metadata: profileData.data,
                profile_scan_result: {
                    contributions: finalContributions,
                    repos: repos,
                    stats: {
                        pullRequests: finalContributions.totalPullRequestContributions,
                        commits: finalContributions.totalCommitContributions,
                        issues: finalContributions.totalIssueContributions,
                        activeRepositories: repos.filter((r: any) => new Date(r.pushed_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
                    },
                    scannedAt: new Date().toISOString(),
                },
                scanned_by_user_id: userId || null,
                guest_id: isGuest ? guestId : null,
                last_scanned_at: new Date().toISOString(),
            }, { 
                onConflict: userId ? 'github_user_id,scanned_by_user_id' : 'github_user_id,guest_id'
            })
            .select()
            .single();

        if (profileError) {
            console.error("Error storing scanned profile:", profileError);
            return NextResponse.json(
                { error: 'Failed to store profile data', details: profileError.message },
                { status: 500 }
            );
        } else if (scannedProfile) {
            const repoRows = repos.map((repo: any) => ({
                scanned_profile_id: scannedProfile.id,
                github_repo_id: repo.id.toString(),
                name: repo.name,
                full_name: repo.full_name,
                is_private: repo.private,
                is_fork: repo.fork,
                description: repo.description,
                language: repo.language,
                stars: repo.stargazers_count,
                forks: repo.forks_count,
                updated_at: repo.updated_at,
            }));

            await supabase.from('scanned_repositories').delete().eq('scanned_profile_id', scannedProfile.id);
            const { error: insertError } = repoRows.length > 0
                ? await supabase.from('scanned_repositories').insert(repoRows)
                : { error: null as any };

            if (insertError) {
                console.error("Error storing scanned repos:", insertError);
            }

            // If guest, send invite email
            if (isGuest && guestEmail && guestId) {
                const claimToken = createClaimToken(guestId, guestEmail);
                const claimLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://gitprofileai.vercel.app'}/auth/guest-claim?token=${claimToken}`;

                await sendBrevoEmail({
                    email: guestEmail,
                    magicLink: claimLink,
                    guestId,
                });
            }
        }

        return NextResponse.json({
            success: true,
            profile: profileData.data,
            contributions: finalContributions,
            repos: repos,
            guestToken: guestToken || undefined, // Return guest token if created new session
            guestId: isGuest ? guestId : undefined,
            userId: userId || undefined,
            isGuest,
            pullRequests: {
                total: finalContributions.totalPullRequestContributions,
                commits: finalContributions.totalCommitContributions,
                issues: finalContributions.totalIssueContributions,
            },
            recentActivity: {
                commits: finalContributions.totalCommitContributions,
                activeRepositories: repos.filter((r: any) => new Date(r.pushed_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
            }
        });

    } catch (error: any) {
        return NextResponse.json(
            { error: `Internal Server Error: ${error.message}` },
            { status: 500 }
        );
    }
}