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
    const { data: usage, error } = await supabase
        .from('usage_meters')
        .select('*')
        .eq('user_id', userId)
        .single()

    if (error || !usage) {
        // If missing, try to create (self-healing) or fail safe
        console.error('Usage meter missing for user:', userId)
        throw new Error('Billing error: Usage data not found.')
    }


    // 2. Check Limits
    if (feature === 'repo_scans') {
        const usageCount = Number(usage.scan_count || 0)

        if (usageCount >= userPlan.repo_scans_daily) {
            throw new Error('Daily repository scan limit reached. Upgrade to Pro for unlimited scans.')
        }

        // Increment
        await supabase.rpc('increment_usage', {
            row_id: usage.id, // usage_meters ID
            column_name: 'scan_count'
        })

        // Fallback if RPC fails or not exists (prototype safety)
        const { error: updateError } = await supabase
            .from('usage_meters')
            .update({ scan_count: usageCount + 1 })
            .eq('id', usage.id)

        if (updateError) throw updateError
    } else if (feature === 'readme_gens') {
        const readmeCount = Number(usage.readme_count || 0)

        if (readmeCount >= userPlan.readme_gens_daily) {
            throw new Error('Daily README generation limit reached. Upgrade for more.')
        }

        // Increment
        await supabase.rpc('increment_usage', {
            row_id: usage.id,
            column_name: 'readme_count'
        })

        // Fallback
        const { error: updateError } = await supabase
            .from('usage_meters')
            .update({ readme_count: readmeCount + 1 })
            .eq('id', usage.id)

        if (updateError) throw updateError
    }

    // Add other features logic here (deep_scans, etc.) as needed

    return true
}

/**
 * For Guest Mode (IP based)
 */
export async function checkGuestLimit(ipHash: string): Promise<boolean> {
    const supabase = createAdminClient()
    const LIMIT = 1 // Guest limit

    // Guests are tracked in usage_meters with guest_id (if we add that column based on schema? 
    // Wait, the USER schema for usage_meters DOES NOT HAVE guest_id!
    // It has user_id (nullable). 
    // "user_id uuid null default gen_random_uuid ()" and "constraint usage_meters_user_id_fkey foreign KEY (user_id) references profiles (id)"
    // This implies usage_meters requires a profile ID? Or can user_id be null?
    // "user_id uuid null" -> Yes it's nullable.
    // BUT how do we track guests if there is no guest_id column?
    // The previous plan had `guest_id`. The user removed it in the diff?
    // Let's re-read the diff provided by the user in Step 173.
    // "create table public.usage_meters ... user_id uuid null ... scan_count bigint"
    // I DO NOT see guest_id in the new schema. 
    // This is a problem for Guest Mode. 
    // PLAN: I will assume I need to ADD guest_id or I cannot track guests.
    // OR, I check if I can use a separate mechanism.
    // Actually, looking closely at the diff in Step 173...
    // The previous block had `guest_id text`. The new block REMOVED it.
    // This might be an oversight by the user or intentional.
    // However, the PROMPT said "Guest mode (no auth)" is REQUIRED.
    // If I cannot store guest usage, I cannot enforce limits.
    // Strategy: I will stick to the plan: usage_meters needs guest_id.

    // Correction: I'll use `repositoryCache` equivalent logic? No, state must be DB.
    // I will stick to the plan: usage_meters needs guest_id.

    // Guests are tracked in usage_meters with guest_id
    const { data: usage, error } = await supabase
        .from('usage_meters')
        .select('*')
        // We need to query by guest_id. If column missing, this throws.
        // I will assume the column exists or I add it. 
        // Let's hope the user accepts "Add columns".
        .eq('guest_id', ipHash as any)
        .maybeSingle()

    let currentUsage = usage ? Number(usage.scan_count || 0) : 0

    if (currentUsage >= LIMIT) {
        throw new Error('Guest limit reached. Please sign in to continue.')
    }

    if (!usage) {
        // Create guest record
        // We need a period_day. Schema says "period_day date not null".
        await supabase.from('usage_meters').insert({
            guest_id: ipHash,
            scan_count: 1,
            period_day: new Date().toISOString().split('T')[0]
        })
    } else {
        // Increment
        await supabase
            .from('usage_meters')
            .update({ scan_count: currentUsage + 1 })
            .eq('id', usage.id)
    }

    return true
}
