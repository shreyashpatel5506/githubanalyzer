/**
 * Profile Scan Results API
 * Returns short-form list of scanned profiles
 * Can be filtered by user (authenticated) or guest
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase';
import { getSessionUser } from '@/app/lib/auth-server';
import { extractGuestToken, verifyGuestSession } from '@/app/lib/guest-session';
import { resolveUserPlan } from '@/app/lib/entitlements';
import { PLAN_LIMITS } from '@/app/lib/billing';

interface ScanResult {
  id: string;
  github_user_id: string;
  username: string;
  profile_metadata?: any;
  profile_scan_result?: any;
  last_scanned_at: string;
  created_at: string;
  contribution_stats?: {
    commits: number;
    pullRequests: number;
    issues: number;
  };
  repo_count: number;
  plan_visibility?: 'full' | 'partial' | 'limited';
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

    let userId: string | null = null;
    let guestId: string | null = null;
    let userPlan: string = 'free';

    // Check if authenticated
    try {
      const sessionUser = await getSessionUser();
      userId = sessionUser?.userId || null;
    } catch {
      userId = null;
    }

    // If not authenticated, check for guest token
    if (!userId) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const token = extractGuestToken(authHeader);
        if (token) {
          const guestSession = verifyGuestSession(token);
          if (guestSession) {
            guestId = guestSession.guestId;
          }
        }
      }
    }

    // Must have either userId or guestId
    if (!userId && !guestId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();
    const offset = (page - 1) * limit;

    let query = supabase
      .from('scanned_profiles')
      .select(`
        id,
        github_user_id,
        username,
        profile_metadata,
        profile_scan_result,
        last_scanned_at,
        created_at,
        scanned_repositories(count)
      `, { count: 'exact' });

    // Filter by user or guest
    if (userId) {
      query = query.eq('scanned_by_user_id', userId);

      // Get user plan for visibility control
      const plan = await resolveUserPlan(userId, supabase);
      userPlan = plan;
    } else if (guestId) {
      query = query.eq('guest_id', guestId);
    }

    // Apply pagination
    query = query.order('last_scanned_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: scans, count: totalCount, error } = await query;

    if (error) {
      console.error('[ResultsAPI] Query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch scans' },
        { status: 500 }
      );
    }

    // Format results with plan-based visibility
    const results: ScanResult[] = scans.map((scan: any) => {
      const baseResult: ScanResult = {
        id: scan.id,
        github_user_id: scan.github_user_id,
        username: scan.username,
        last_scanned_at: scan.last_scanned_at,
        created_at: scan.created_at,
        repo_count: scan.scanned_repositories?.[0]?.count || 0,
      };

      // Parse profile_scan_result
      const scanResult = scan.profile_scan_result || {};
      if (scanResult.stats) {
        baseResult.contribution_stats = {
          commits: scanResult.stats.commits || 0,
          pullRequests: scanResult.stats.pullRequests || 0,
          issues: scanResult.stats.issues || 0,
        };
      }

      // Set visibility based on plan
      if (userId) {
        // Full results for authenticated users
        baseResult.profile_metadata = scan.profile_metadata;
        baseResult.profile_scan_result = scan.profile_scan_result;
        baseResult.plan_visibility = 'full';
      } else if (guestId) {
        // Limited results for guests - only show summary
        baseResult.plan_visibility = 'limited';
        // Don't include full profile metadata for guests
      }

      return baseResult;
    });

    return NextResponse.json({
      success: true,
      data: results,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
      },
      userInfo: {
        isAuthenticated: !!userId,
        isGuest: !!guestId,
        plan: userPlan,
      },
    });
  } catch (error) {
    console.error('[ResultsAPI] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET single scan result by ID
 * Shows full details if owned by user or guest
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scanId } = body;

    if (!scanId) {
      return NextResponse.json(
        { error: 'Missing scanId' },
        { status: 400 }
      );
    }

    let userId: string | null = null;
    let guestId: string | null = null;

    try {
      const sessionUser = await getSessionUser();
      userId = sessionUser?.userId || null;
    } catch {
      userId = null;
    }

    if (!userId) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const token = extractGuestToken(authHeader);
        if (token) {
          const guestSession = verifyGuestSession(token);
          if (guestSession) {
            guestId = guestSession.guestId;
          }
        }
      }
    }

    if (!userId && !guestId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();

    const { data: scan, error } = await supabase
      .from('scanned_profiles')
      .select(`
        *,
        scanned_repositories(*)
      `)
      .eq('id', scanId)
      .maybeSingle();

    if (error) {
      console.error('[ResultsAPI] Fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch scan' },
        { status: 500 }
      );
    }

    if (!scan) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (userId && scan.scanned_by_user_id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (guestId && scan.guest_id !== guestId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: scan,
      fullResult: true,
    });
  } catch (error) {
    console.error('[ResultsAPI] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
