import { createAdminClient } from './supabase';
export const PLANS = {
    free: {
        repo_scans_daily: 5,
        readme_gens_daily: 3,
        deep_scans_weekly: 0,
        pr_credits_monthly: 0,
        history_days: 7,
    },
    pro: {
        repo_scans_daily: -1, // Unlimited
        readme_gens_daily: 20,
        deep_scans_weekly: 5,
        pr_credits_monthly: 15,
        history_days: 90,
    },
    pro_plus: {
        repo_scans_daily: -1,
        readme_gens_daily: -1,
        deep_scans_weekly: -1,
        pr_credits_monthly: -1,
        history_days: -1, // Infinite
    },
};
export const PLAN_LIMITS = {
    free: {
        repo_scan: 5,
        profile_scan: 1,
        readme_generation: 3,
        eslint_analysis: 5,
        bug_detection: false,
        security_scan: false,
        deep_code_smell_scan: 0,
        scan_history: false,
        pr_publish: false,
    },
    pro: {
        repo_scan: -1,
        profile_scan: 20,
        readme_generation: 20,
        eslint_analysis: 50,
        bug_detection: true,
        security_scan: true,
        deep_code_smell_scan: 10,
        scan_history: true,
        pr_publish: true,
    },
    pro_plus: {
        repo_scan: -1,
        profile_scan: -1,
        readme_generation: -1,
        eslint_analysis: -1,
        bug_detection: true,
        security_scan: true,
        deep_code_smell_scan: -1,
        scan_history: true,
        pr_publish: true,
    },
};
export const PLAN_PRICES = {
    free: 0,
    pro: 15,
    pro_plus: 85,
};
export async function syncPlansCatalog() {
    const supabase = createAdminClient();
    const rows = Object.keys(PLAN_LIMITS).map((key) => ({
        key,
        limits: PLAN_LIMITS[key],
        price_monthly: PLAN_PRICES[key],
    }));
    const { error } = await supabase
        .from('plans')
        .upsert(rows, { onConflict: 'key' });
    if (error) {
        throw new Error(`Failed to sync plans catalog: ${error.message}`);
    }
}
export function hasFeatureAccess(plan, feature) {
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
    const featureValue = limits[feature];
    if (typeof featureValue === 'boolean')
        return featureValue;
    if (typeof featureValue === 'number')
        return featureValue !== 0;
    return false;
}
/**
 * Checks if a user has sufficient credits for a requested feature.
 * Throws an error if limit is reached.
 */
export async function checkAndIncrementLimit(userId, plan, feature, _legacyColumn) {
    const supabase = createAdminClient();
    const normalizedPlan = (plan in PLAN_LIMITS ? plan : 'free');
    const planLimits = PLAN_LIMITS[normalizedPlan];
    const featureKey = String(feature || '').toLowerCase();
    const metricMap = {
        repo_scan: { usageColumn: 'repo_scans', limitKey: 'repo_scan' },
        repo_scans: { usageColumn: 'repo_scans', limitKey: 'repo_scan' },
        readme_generation: { usageColumn: 'readme_generations', limitKey: 'readme_generation' },
        readme_gens: { usageColumn: 'readme_generations', limitKey: 'readme_generation' },
        eslint_analysis: { usageColumn: 'eslint_analyses', limitKey: 'eslint_analysis' },
        deep_scan: { usageColumn: 'code_smell_scans', limitKey: 'deep_code_smell_scan' },
        deep_scans: { usageColumn: 'deep_scans', limitKey: 'deep_code_smell_scan' },
        deep_code_smell_scan: { usageColumn: 'code_smell_scans', limitKey: 'deep_code_smell_scan' },
        bug_detection: {
            usageColumn: 'bug_detections',
            limitKey: 'deep_code_smell_scan',
            requiredFeature: 'bug_detection',
        },
        security_scan: {
            usageColumn: 'security_scans',
            limitKey: 'deep_code_smell_scan',
            requiredFeature: 'security_scan',
        },
        pr_suggestion: { usageColumn: 'pr_creations', requiredFeature: 'pr_publish' },
        pr_suggestions_count: { usageColumn: 'pr_creations', requiredFeature: 'pr_publish' },
        pr_gens: { usageColumn: 'pr_creations', requiredFeature: 'pr_publish' },
        pr_creations: { usageColumn: 'pr_creations', requiredFeature: 'pr_publish' },
    };
    const metric = metricMap[featureKey] || { usageColumn: 'repo_scans', limitKey: 'repo_scan' };
    // 1. Get current usage
    const { data: usage, error } = await supabase
        .from('usage_meters')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
    if (error) {
        console.error('Usage meter fetch error:', error);
        throw new Error('Billing error: Failed to check limits.');
    }
    // If no usage record exists, create one
    if (!usage) {
        const initialUsageColumns = {
            repo_scans: 0,
            readme_generations: 0,
            pr_creations: 0,
            deep_scans: 0,
            eslint_analyses: 0,
            code_smell_scans: 0,
            bug_detections: 0,
            security_scans: 0,
        };
        initialUsageColumns[metric.usageColumn] = 1;
        const { data: newUsage, error: insertError } = await supabase
            .from('usage_meters')
            .insert(Object.assign(Object.assign({ user_id: userId }, initialUsageColumns), { period_start: new Date().toISOString().split('T')[0], period_end: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0] }))
            .select()
            .single();
        if (insertError) {
            console.error('Usage meter creation failed:', insertError);
            throw new Error('Billing error: Failed to initialize usage tracking.');
        }
        return true;
    }
    // 2. Check feature access + limits from PLAN_LIMITS
    if (metric.requiredFeature) {
        const required = planLimits[metric.requiredFeature];
        if (required === false || required === 0) {
            throw new Error('This feature is not available on your current plan. Please upgrade.');
        }
    }
    if (metric.limitKey) {
        const limitValue = planLimits[metric.limitKey];
        if (typeof limitValue === 'number') {
            if (limitValue === 0) {
                throw new Error('Usage limit reached for your current plan. Please upgrade.');
            }
            const usageCount = Number(usage[metric.usageColumn] || 0);
            if (limitValue !== -1 && usageCount >= limitValue) {
                throw new Error('Usage limit reached for your current plan. Please upgrade for higher limits.');
            }
        }
        else if (limitValue === false) {
            throw new Error('This feature is not available on your current plan. Please upgrade.');
        }
    }
    // 3. Increment atomically using RPC
    const columnName = metric.usageColumn;
    const { error: rpcError } = await supabase.rpc('increment_usage', {
        row_id: usage.id,
        column_name: columnName
    });
    if (rpcError) {
        console.error('Billing RPC Failed', rpcError);
        // Fallback to manual update
        const updateData = {};
        updateData[columnName] = (Number(usage[columnName]) || 0) + 1;
        const { error: updateError } = await supabase
            .from('usage_meters')
            .update(updateData)
            .eq('id', usage.id);
        if (updateError)
            throw new Error('Failed to update usage limits.');
    }
    return true;
}
/**
 * For Guest Mode (IP based)
 */
export async function checkGuestLimit(ipHash) {
    const supabase = createAdminClient();
    const LIMIT = 1; // Guest limit
    const { data: usage, error } = await supabase
        .from('usage_meters')
        .select('*')
        .eq('guest_id', ipHash)
        .maybeSingle();
    let currentUsage = usage ? Number(usage.repo_scans || 0) : 0;
    if (currentUsage >= LIMIT) {
        throw new Error('Guest limit reached. Please sign in to continue.');
    }
    if (!usage) {
        await supabase.from('usage_meters').insert({
            guest_id: ipHash,
            repo_scans: 1,
            readme_generations: 0,
            pr_creations: 0,
            deep_scans: 0,
            period_start: new Date().toISOString().split('T')[0],
            period_end: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
        });
    }
    else {
        await supabase.rpc('increment_usage', {
            row_id: usage.id,
            column_name: 'repo_scans'
        });
    }
    return true;
}
