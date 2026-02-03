
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

    if (!id) {
        return NextResponse.json({ error: 'Scan ID required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Fetch scan status
    const { data: scan, error } = await supabase
        .from('scans')
        .select('status, result_summary, error_message, updated_at')
        .eq('id', id)
        .single()

    if (error || !scan) {
        return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
    }

    // If completed, fetch the full snapshot (optional, depending on UI needs)
    // For polling, usually status + summary is enough.
    let fullAnalysis = null
    if (scan.status === 'completed') {
        const { data: snapshot } = await supabase
            .from('scan_snapshots')
            .select('full_analysis')
            .eq('scan_id', id)
            .single()

        if (snapshot) {
            fullAnalysis = snapshot.full_analysis
        }
    }

    return NextResponse.json({
        scanId: id,
        status: scan.status,
        result: scan.result_summary, // Lightweight result
        fullAnalysis: fullAnalysis, // Heavy result (if needed immediately)
        error: scan.error_message,
        updatedAt: scan.updated_at
    })
}
