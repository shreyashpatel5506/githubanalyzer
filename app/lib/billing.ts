import { createAdminClient } from './supabase'

export const PLANS = {
    free: {
        repo_scans_daily: 5,
        readme_gens_daily: 3,
        deep_scans_weekly: 0,
        pr_credits_monthly: 0,
        history_days: 7,
    },
    pro: {
        repo_scans_daily: 999999, // Unlimited
        readme_gens_daily: 20,
        deep_scans_weekly: 5,
        pr_credits_monthly: 15,
        history_days: 90,
    },
    pro_plus: {
        repo_scans_daily: 999999,
        readme_gens_daily: 100,
        deep_scans_weekly: 999999, // Cap handled by daily limit if needed, but 'Unlimited' in plan
        pr_credits_monthly: 999999,
        history_days: 999999, // Infinite
    },
} as const

type PlanType = keyof typeof PLANS
type FeatureMetric = 'repo_scans' | 'deep_scans' | 'pr_gens' | 'readme_gens'

/**
 * Checks if a user has sufficient credits for a requested feature.
 * Throws an error if limit is reached.
 */
export async function checkAndIncrementLimit(
    userId: string,
    plan: string,
    feature: FeatureMetric
): Promise<boolean> {
    const supabase = createAdminClient()
    const userPlan = (PLANS[plan as PlanType] || PLANS['free'])

    // 1. Get current usage
    // Using 'repo_scans_used' as per schema found in webhooks
    const { data: usage, error } = await supabase
        .from('usage_meters')
        .select('*')
        .eq('user_id', userId)
        .single()

    if (error || !usage) {
        console.error('Usage meter missing for user:', userId)
        throw new Error('Billing error: Usage data not found.')
    }

    let limitReached = false
    let rpcFunction = 'increment_usage' // Default unified RPC
    let rpcArgs = {}

    // 2. Check Limits & Prepare RPC
    if (feature === 'repo_scans') {
        const usageCount = Number(usage.repo_scans_used || 0)

        if (usageCount >= userPlan.repo_scans_daily) {
            limitReached = true
            throw new Error('Daily repository scan limit reached. Upgrade to Pro for unlimited scans.')
        }

        rpcArgs = {
            row_id: usage.id,
            column_name: 'repo_scans_used'
        }

    } else if (feature === 'readme_gens') {
        const readmeCount = Number(usage.readme_gens_used || 0)

        if (readmeCount >= userPlan.readme_gens_daily) {
            limitReached = true
            throw new Error('Daily README generation limit reached. Upgrade for more.')
        }

        rpcArgs = {
            row_id: usage.id,
            column_name: 'readme_gens_used'
        }
    }

    // 3. Increment atomically
    const { error: rpcError } = await supabase.rpc(rpcFunction, rpcArgs)

    if (rpcError) {
        console.error('Billing RPC Failed', rpcError)
        // CRITICAL FAIL SAFE: Do NOT fallback to inconsistent UPDATE. 
        // Failing closed is safer than free unlimited usage.
        throw new Error('Transaction failed. Please try again.')
    }

    return true
}

/**
 * For Guest Mode (IP based)
 */
export async function checkGuestLimit(ipHash: string): Promise<boolean> {
    const supabase = createAdminClient()
    const LIMIT = 1 // Guest limit

    const { data: usage, error } = await supabase
        .from('usage_meters')
        .select('*')
        .eq('guest_id', ipHash) // Requires migration to add this column
        .maybeSingle()

    let currentUsage = usage ? Number(usage.repo_scans_used || 0) : 0

    if (currentUsage >= LIMIT) {
        throw new Error('Guest limit reached. Please sign in to continue.')
    }

    if (!usage) {
        // Create guest record
        // Schema requires existing profile? No, usage_meters has user_id nullable usually.
        // We will insert with guest_id.
        await supabase.from('usage_meters').insert({
            guest_id: ipHash,
            repo_scans_used: 1,
            readme_gens_used: 0,
            pr_gens_used: 0,
            deep_scans_used_this_week: 0
        })
    } else {
        // Increment
        await supabase.rpc('increment_usage', {
            row_id: usage.id,
            column_name: 'repo_scans_used'
        })
    }

    return true
}
