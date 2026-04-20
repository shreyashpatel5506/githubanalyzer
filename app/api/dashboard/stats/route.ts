import { NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase'
import { getSessionUser } from '@/app/lib/auth-server'

export async function GET() {
    try {
        const sessionUser = await getSessionUser()
        const userId = sessionUser?.userId
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = createAdminClient()

        // Get usage stats
        const { data: usage } = await supabase
            .from('usage_meters')
            .select('*')
            .eq('user_id', userId)
            .single()

        // Get total bugs found
        const { data: scans } = await supabase
            .from('repo_scans')
            .select('id')
            .eq('requested_by_user_id', userId)

        const scanIds = scans?.map((s) => s.id) || []

        let bugsCount = 0
        let securityCount = 0
        let smellsCount = 0

        if (scanIds.length > 0) {
            const { count: bugs } = await supabase
                .from('bugs')
                .select('*', { count: 'exact', head: true })
                .in('repo_scan_id', scanIds)

            const { count: security } = await supabase
                .from('security_issues')
                .select('*', { count: 'exact', head: true })
                .in('repo_scan_id', scanIds)

            const { count: smells } = await supabase
                .from('code_smells')
                .select('*', { count: 'exact', head: true })
                .in('repo_scan_id', scanIds)

            bugsCount = bugs || 0
            securityCount = security || 0
            smellsCount = smells || 0
        }

        return NextResponse.json({
            repoScans: usage?.repo_scans || 0,
            readmeGens: usage?.readme_generations || 0,
            eslintAnalyses: usage?.eslint_analyses || 0,
            codeSmellScans: usage?.code_smell_scans || 0,
            bugDetections: usage?.bug_detections || 0,
            securityScans: usage?.security_scans || 0,
            bugsFound: bugsCount,
            securityIssues: securityCount,
            codeSmellsFound: smellsCount,
        })

    } catch (error: any) {
        console.error('Stats error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
