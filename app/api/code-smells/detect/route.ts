import { NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase'
import { checkAndIncrementLimit, hasFeatureAccess } from '@/app/lib/billing'
import { resolveUserPlan } from '@/app/lib/entitlements'
import { runAI } from '@/app/lib/ai-client'
import { getSessionUser } from '@/app/lib/auth-server'

export async function POST(req: Request) {
    try {
        const { scanId } = await req.json()

        const sessionUser = await getSessionUser()
        const userId = sessionUser?.userId
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = createAdminClient()

        const plan = await resolveUserPlan(userId, supabase)

        // Check feature access
        if (!hasFeatureAccess(plan, 'deep_code_smell_scan')) {
            return NextResponse.json({ error: 'Upgrade to PRO to access Code Smell Detection' }, { status: 403 })
        }

        // Check limit
        await checkAndIncrementLimit(userId, plan, 'deep_code_smell_scan', 'code_smell_scans')

        // Get scan
        const { data: scan } = await supabase
            .from('repo_scans')
            .select('*, repositories(*)')
            .eq('id', scanId)
            .single()

        if (!scan || scan.requested_by_user_id !== userId) {
            return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
        }

        const repo = scan.repositories

        // AI analysis
        const prompt = `Perform deep code smell detection for this repository:

Repository: ${repo.full_name}
Language: ${repo.language}

Identify code smells like:
- Long methods/functions
- Duplicate code  
- Large classes
- Complex conditionals
- Magic numbers
- God objects

Return JSON array of code smells:
[
  {
    "file_path": "src/utils.ts",
    "rule_id": "long-method",
    "severity": "warning",
    "category": "maintainability",
    "message": "Method exceeds 50 lines",
    "line": 25
  }
]`

        const analysis = await runAI(prompt)

        let smells: any[] = [];
        try {
            smells = analysis ? JSON.parse(analysis) : []
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'JSON parse error';
            console.warn(`[Code Smell Detection] Failed to parse AI response: ${message}`);
            smells = []
        }

        // Store each smell
        for (const smell of smells) {
            await supabase.from('code_smells').insert({
                repo_scan_id: scanId,
                file_path: smell.file_path,
                rule_id: smell.rule_id,
                severity: smell.severity,
                category: smell.category,
                message: smell.message,
                line: smell.line,
                column_number: smell.column || null
            })
        }

        return NextResponse.json({ success: true, smellsFound: smells.length })

    } catch (error: any) {
        console.error('Code smell detection error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
