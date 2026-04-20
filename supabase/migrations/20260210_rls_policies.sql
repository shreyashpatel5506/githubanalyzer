-- Migration: 20260210_rls_policies
-- Description: Add Row Level Security policies to enforce data isolation
-- CRITICAL: This is a production security requirement

-- ============================================================
-- 1. ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repo_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_snapshots ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. PROFILES TABLE
-- Users can only read/update their own profile
-- ============================================================

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid()::text = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid()::text = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid()::text = id);

-- ============================================================
-- 3. USAGE_METERS TABLE
-- Users can only read/update their own usage data
-- ============================================================

CREATE POLICY "Users can view their own usage"
ON public.usage_meters
FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY "Service role can manage all usage"
ON public.usage_meters
FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- Note: Regular users should NOT be able to manually update usage
-- Only backend via service role can update

-- ============================================================
-- 4. SUBSCRIPTIONS TABLE
-- Users can only view their own subscription
-- Only service role can modify (via Stripe webhooks)
-- ============================================================

CREATE POLICY "Users can view their own subscription"
ON public.subscriptions
FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY "Service role can manage all subscriptions"
ON public.subscriptions
FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================
-- 5. REPOSITORIES TABLE
-- Public read access (GitHub repos are public info)
-- Only service role can write (via upsert logic)
-- ============================================================

CREATE POLICY "Anyone can view repositories"
ON public.repositories
FOR SELECT
USING (true);

CREATE POLICY "Service role can manage repositories"
ON public.repositories
FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================
-- 6. REPO_SCANS TABLE
-- Users can view scans they requested
-- Only service role can create/update (via API routes)
-- ============================================================

CREATE POLICY "Users can view their own scans"
ON public.repo_scans
FOR SELECT
USING (auth.uid()::text = requested_by_user_id);

CREATE POLICY "Service role can manage all scans"
ON public.repo_scans
FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================
-- 7. SCAN_SNAPSHOTS TABLE
-- Users can view snapshots for scans they own
-- Only service role can write
-- ============================================================

CREATE POLICY "Users can view snapshots of their scans"
ON public.scan_snapshots
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.repo_scans
    WHERE repo_scans.id = scan_snapshots.repo_scan_id
    AND repo_scans.requested_by_user_id = auth.uid()::text
  )
);

CREATE POLICY "Service role can manage all snapshots"
ON public.scan_snapshots
FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================
-- NOTES
-- ============================================================
-- 1. All writes go through service role (backend API routes)
-- 2. Users can only read their own data
-- 3. auth.uid() returns the Clerk user ID from JWT
-- 4. Repositories are public (GitHub is public anyway)
-- 5. Service role bypasses RLS for backend operations
