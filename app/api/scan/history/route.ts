import { NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase';
import { getSessionUser } from '@/app/lib/auth-server';

interface ScanRow {
    id: string;
    status: string;
    created_at: string;
    completed_at: string | null;
    error_message?: string | null;
    repositories?: {
        name?: string | null;
        full_name?: string | null;
    }[] | {
        name?: string | null;
        full_name?: string | null;
    } | null;
}

export async function GET(request: Request) {
    try {
        const sessionUser = await getSessionUser();
        const userId = sessionUser?.userId;
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const scanId = searchParams.get('scanId');

        const supabase = createAdminClient();

        // Get all scans for this user
        let query = supabase
            .from('repo_scans')
            .select(`
                id,
                repo_id,
                status,
                created_at,
                completed_at,
                error_message,
                repositories (
                    name,
                    full_name
                )
            `)
            .eq('requested_by_user_id', userId)
            .order('created_at', { ascending: false });

        if (scanId) {
            query = query.eq('id', scanId).limit(1);
        } else {
            query = query.limit(50);
        }

        const { data: scans } = await query;

        if (!scans) {
            return NextResponse.json({ scans: [] });
        }

        // For each completed scan, get stats
        const scansWithStats = await Promise.all(
            scans.map(async (scan: ScanRow) => {
                const repository = Array.isArray(scan.repositories)
                    ? scan.repositories[0]
                    : scan.repositories;

                if (scan.status === 'completed') {
                    const [codeSmells, bugs, security] = await Promise.all([
                        supabase.from('code_smells').select('*', { count: 'exact', head: true }).eq('repo_scan_id', scan.id),
                        supabase.from('bugs').select('*', { count: 'exact', head: true }).eq('repo_scan_id', scan.id),
                        supabase.from('security_issues').select('*', { count: 'exact', head: true }).eq('repo_scan_id', scan.id),
                    ]);

                    return {
                        id: scan.id,
                        repo_name: repository?.name || 'Unknown',
                        repo_full_name: repository?.full_name || 'unknown/unknown',
                        status: scan.status,
                        created_at: scan.created_at,
                        completed_at: scan.completed_at,
                        error_message: scan.error_message || null,
                        stats: {
                            code_smells: codeSmells.count || 0,
                            bugs: bugs.count || 0,
                            security_issues: security.count || 0,
                        },
                    };
                }

                return {
                    id: scan.id,
                    repo_name: repository?.name || 'Unknown',
                    repo_full_name: repository?.full_name || 'unknown/unknown',
                    status: scan.status,
                    created_at: scan.created_at,
                    completed_at: scan.completed_at,
                    error_message: scan.error_message || null,
                };
            })
        );

        return NextResponse.json({ scans: scansWithStats });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('History fetch error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
