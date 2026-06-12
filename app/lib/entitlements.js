import { PLAN_LIMITS } from './billing';
import { createAdminClient } from './supabase';
const VALID_PLANS = new Set(Object.keys(PLAN_LIMITS));
function normalizePlan(raw) {
    const plan = String(raw || 'free').toLowerCase();
    return VALID_PLANS.has(plan) ? plan : 'free';
}
function normalizeStatus(raw) {
    const status = String(raw || '').toLowerCase();
    if (status === 'trialing')
        return 'trialing';
    if (status === 'past_due' || status === 'pastdue' || status === 'unpaid')
        return 'past_due';
    if (status === 'canceled' || status === 'ended' || status === 'abandoned' || status === 'expired') {
        return 'canceled';
    }
    return 'active';
}
export async function resolveUserPlan(userId, supabase = createAdminClient()) {
    if (!userId)
        return 'free';
    // Canonical source: subscriptions table
    const { data: activeSub } = await supabase
        .from('subscriptions')
        .select('plan_key,status')
        .eq('user_id', userId)
        .in('status', ['active', 'trialing', 'past_due'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (activeSub === null || activeSub === void 0 ? void 0 : activeSub.plan_key) {
        return normalizePlan(activeSub.plan_key);
    }
    // Fallback cache: profiles table
    const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_plan')
        .eq('id', userId)
        .maybeSingle();
    const profilePlan = normalizePlan(profile === null || profile === void 0 ? void 0 : profile.subscription_plan);
    if (profilePlan !== 'free') {
        return profilePlan;
    }
    return profilePlan;
}
export async function setUserPlan(userId, planKey, status = 'active', supabase = createAdminClient()) {
    const normalizedPlan = normalizePlan(planKey);
    const effectiveStatus = normalizeStatus(status);
    const resolvedPlan = effectiveStatus === 'active' || effectiveStatus === 'trialing' || effectiveStatus === 'past_due'
        ? normalizedPlan
        : 'free';
    const { data: existingProfile, error: profileReadError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
    if (profileReadError) {
        throw new Error(`Profile read failed: ${profileReadError.message}`);
    }
    const profilePayload = existingProfile
        ? {
            subscription_plan: resolvedPlan,
            updated_at: new Date().toISOString(),
        }
        : {
            id: userId,
            email: `${userId}@placeholder.local`,
            full_name: 'User',
            subscription_plan: resolvedPlan,
            last_login_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
    const profileQuery = existingProfile
        ? supabase.from('profiles').update(profilePayload).eq('id', userId)
        : supabase.from('profiles').insert(profilePayload);
    const { error: profileError } = await profileQuery;
    if (profileError) {
        throw new Error(`Profile plan update failed: ${profileError.message}`);
    }
    const { data: existingSub, error: subReadError } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (subReadError) {
        throw new Error(`Subscription read failed: ${subReadError.message}`);
    }
    const payload = {
        user_id: userId,
        plan_key: normalizedPlan,
        status: effectiveStatus,
        started_at: effectiveStatus === 'active' || effectiveStatus === 'trialing' || effectiveStatus === 'past_due'
            ? new Date().toISOString()
            : null,
        ends_at: effectiveStatus === 'canceled' ? new Date().toISOString() : null,
    };
    if (existingSub === null || existingSub === void 0 ? void 0 : existingSub.id) {
        const { error: subUpdateError } = await supabase
            .from('subscriptions')
            .update(payload)
            .eq('id', existingSub.id);
        if (subUpdateError) {
            throw new Error(`Subscription update failed: ${subUpdateError.message}`);
        }
    }
    else {
        const { error: subInsertError } = await supabase
            .from('subscriptions')
            .insert(payload);
        if (subInsertError) {
            throw new Error(`Subscription insert failed: ${subInsertError.message}`);
        }
    }
}
