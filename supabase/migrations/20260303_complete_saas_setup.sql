-- ============================================================================
-- ClarityCode - Complete SaaS Setup (Single File)
-- Date: 2026-03-03
-- Purpose:
--   1) Create/repair all required tables
--   2) Align user_id columns to TEXT (Clerk compatible)
--   3) Create indexes, triggers, functions
--   4) Enable and configure RLS
--   5) Seed plans/features/plan_features
--
-- Safe to run multiple times (idempotent as much as possible)
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 0) Extensions
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1) Core tables
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  full_name text,
  avatar_url text,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  subscription_plan text DEFAULT 'free'
);

CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  limits jsonb NOT NULL,
  price_monthly numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.plan_features (
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  feature_id uuid NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (plan_id, feature_id)
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_key text NOT NULL,
  status text NOT NULL,
  started_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.usage_meters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  repo_scans integer DEFAULT 0,
  deep_scans integer DEFAULT 0,
  readme_generations integer DEFAULT 0,
  pr_creations integer DEFAULT 0,
  eslint_analyses integer DEFAULT 0,
  code_smell_scans integer DEFAULT 0,
  bug_detections integer DEFAULT 0,
  security_scans integer DEFAULT 0,
  pr_suggestions_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  guest_id text UNIQUE
);

CREATE TABLE IF NOT EXISTS public.feature_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  context jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.github_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  github_user_id text NOT NULL UNIQUE,
  username text NOT NULL,
  access_token text NOT NULL,
  scope text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.repositories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  github_repo_id text NOT NULL UNIQUE,
  owner_username text NOT NULL,
  name text NOT NULL,
  full_name text NOT NULL,
  is_private boolean DEFAULT false,
  is_fork boolean DEFAULT false,
  default_branch text,
  language text,
  size_kb integer,
  stars integer,
  forks integer,
  last_pushed_at timestamptz,
  archived boolean DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  owner_user_id text REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.repo_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id uuid NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  requested_by_user_id text REFERENCES public.profiles(id) ON DELETE CASCADE,
  scan_type text NOT NULL DEFAULT 'deep_analysis',
  status text NOT NULL DEFAULT 'queued',
  commit_sha text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scan_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_scan_id uuid NOT NULL REFERENCES public.repo_scans(id) ON DELETE CASCADE,
  file_tree jsonb NOT NULL,
  metrics jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.code_smells (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_scan_id uuid NOT NULL REFERENCES public.repo_scans(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  rule_id text,
  severity text NOT NULL,
  category text NOT NULL,
  message text NOT NULL,
  line integer,
  column_number integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bugs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_scan_id uuid NOT NULL REFERENCES public.repo_scans(id) ON DELETE CASCADE,
  file_path text,
  description text NOT NULL,
  confidence_score numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.security_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_scan_id uuid NOT NULL REFERENCES public.repo_scans(id) ON DELETE CASCADE,
  severity text NOT NULL,
  issue_type text NOT NULL,
  description text NOT NULL,
  remediation text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.eslint_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_scan_id uuid NOT NULL REFERENCES public.repo_scans(id) ON DELETE CASCADE,
  total_errors integer NOT NULL DEFAULT 0,
  total_warnings integer NOT NULL DEFAULT 0,
  rule_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_output jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.readme_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id uuid NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  generated_by_user_id text REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pull_request_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id uuid NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  branch_name text,
  summary text NOT NULL,
  diff_patch text NOT NULL,
  status text DEFAULT 'draft',
  github_pr_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scanned_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  github_user_id text NOT NULL UNIQUE,
  username text NOT NULL,
  profile_metadata jsonb NOT NULL,
  ai_summary jsonb,
  scanned_by_user_id text REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_scanned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scanned_repositories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scanned_profile_id uuid NOT NULL REFERENCES public.scanned_profiles(id) ON DELETE CASCADE,
  github_repo_id text NOT NULL,
  name text NOT NULL,
  full_name text NOT NULL,
  is_private boolean DEFAULT false,
  is_fork boolean DEFAULT false,
  description text,
  language text,
  stars integer,
  forks integer,
  updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Optional operational tables for complete SaaS
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed boolean NOT NULL DEFAULT false,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, event_id)
);

CREATE TABLE IF NOT EXISTS public.plan_change_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  old_plan_key text,
  new_plan_key text NOT NULL,
  changed_by text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 2) Compatibility and schema alignment patches
-- ----------------------------------------------------------------------------

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_plan text DEFAULT 'free';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.usage_meters ADD COLUMN IF NOT EXISTS eslint_analyses integer DEFAULT 0;
ALTER TABLE public.usage_meters ADD COLUMN IF NOT EXISTS code_smell_scans integer DEFAULT 0;
ALTER TABLE public.usage_meters ADD COLUMN IF NOT EXISTS bug_detections integer DEFAULT 0;
ALTER TABLE public.usage_meters ADD COLUMN IF NOT EXISTS security_scans integer DEFAULT 0;
ALTER TABLE public.usage_meters ADD COLUMN IF NOT EXISTS pr_suggestions_count integer DEFAULT 0;

-- Ensure scan_type has default if old schema missing it
ALTER TABLE public.repo_scans ADD COLUMN IF NOT EXISTS scan_type text;
UPDATE public.repo_scans SET scan_type = COALESCE(scan_type, 'deep_analysis');
ALTER TABLE public.repo_scans ALTER COLUMN scan_type SET DEFAULT 'deep_analysis';
ALTER TABLE public.repo_scans ALTER COLUMN scan_type SET NOT NULL;

-- ----------------------------------------------------------------------------
-- 3) Indexes
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_plan ON public.profiles(subscription_plan);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON public.subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_created_at ON public.subscriptions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_usage_meters_user_period ON public.usage_meters(user_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_usage_meters_guest_id ON public.usage_meters(guest_id);

CREATE INDEX IF NOT EXISTS idx_repositories_owner_user_id ON public.repositories(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_repositories_full_name ON public.repositories(full_name);
CREATE INDEX IF NOT EXISTS idx_repositories_updated_at ON public.repositories(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_repo_scans_repo_id ON public.repo_scans(repo_id);
CREATE INDEX IF NOT EXISTS idx_repo_scans_user_id ON public.repo_scans(requested_by_user_id);
CREATE INDEX IF NOT EXISTS idx_repo_scans_status ON public.repo_scans(status);
CREATE INDEX IF NOT EXISTS idx_repo_scans_created_at ON public.repo_scans(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scan_snapshots_repo_scan_id ON public.scan_snapshots(repo_scan_id);
CREATE INDEX IF NOT EXISTS idx_code_smells_repo_scan_id ON public.code_smells(repo_scan_id);
CREATE INDEX IF NOT EXISTS idx_bugs_repo_scan_id ON public.bugs(repo_scan_id);
CREATE INDEX IF NOT EXISTS idx_security_issues_repo_scan_id ON public.security_issues(repo_scan_id);
CREATE INDEX IF NOT EXISTS idx_eslint_reports_repo_scan_id ON public.eslint_reports(repo_scan_id);

CREATE INDEX IF NOT EXISTS idx_readme_generations_repo_id ON public.readme_generations(repo_id);
CREATE INDEX IF NOT EXISTS idx_readme_generations_user_id ON public.readme_generations(generated_by_user_id);

CREATE INDEX IF NOT EXISTS idx_pr_suggestions_repo_id ON public.pull_request_suggestions(repo_id);
CREATE INDEX IF NOT EXISTS idx_pr_suggestions_status ON public.pull_request_suggestions(status);

CREATE INDEX IF NOT EXISTS idx_scanned_profiles_user_id ON public.scanned_profiles(scanned_by_user_id);
CREATE INDEX IF NOT EXISTS idx_scanned_repositories_profile_id ON public.scanned_repositories(scanned_profile_id);

CREATE INDEX IF NOT EXISTS idx_feature_usage_events_user_id ON public.feature_usage_events(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_usage_events_feature_key ON public.feature_usage_events(feature_key);

CREATE INDEX IF NOT EXISTS idx_webhook_events_provider_event ON public.webhook_events(provider, event_id);
CREATE INDEX IF NOT EXISTS idx_plan_change_history_user_id ON public.plan_change_history(user_id);

-- ----------------------------------------------------------------------------
-- 4) Triggers / helper functions
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_set_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_repositories_set_updated_at ON public.repositories;
CREATE TRIGGER trg_repositories_set_updated_at
BEFORE UPDATE ON public.repositories
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_scanned_profiles_set_updated_at ON public.scanned_profiles;
CREATE TRIGGER trg_scanned_profiles_set_updated_at
BEFORE UPDATE ON public.scanned_profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_usage_meters_set_updated_at ON public.usage_meters;
CREATE TRIGGER trg_usage_meters_set_updated_at
BEFORE UPDATE ON public.usage_meters
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.increment_usage(row_id uuid, column_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF column_name NOT IN (
        'repo_scans',
        'readme_generations',
        'deep_scans',
        'eslint_analyses',
        'code_smell_scans',
        'bug_detections',
        'security_scans',
        'pr_suggestions_count',
        'pr_creations'
    ) THEN
        RAISE EXCEPTION 'Invalid column name for increment: %', column_name;
    END IF;

    EXECUTE format(
      'UPDATE public.usage_meters SET %I = COALESCE(%I, 0) + 1, updated_at = now() WHERE id = %L',
      column_name, column_name, row_id
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 5) RLS enablement
-- ----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repo_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_smells ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eslint_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.readme_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pull_request_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scanned_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scanned_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_change_history ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 6) Drop old policies safely (if rerun)
-- ----------------------------------------------------------------------------

DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'profiles','plans','features','plan_features','subscriptions','usage_meters',
        'feature_usage_events','github_identities','repositories','repo_scans','scan_snapshots',
        'code_smells','bugs','security_issues','eslint_reports','readme_generations',
        'pull_request_suggestions','scanned_profiles','scanned_repositories','webhook_events',
        'plan_change_history'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 7) RLS policies
-- ----------------------------------------------------------------------------

-- Profiles
CREATE POLICY profiles_select_own
ON public.profiles FOR SELECT
USING (auth.uid()::text = id);

CREATE POLICY profiles_insert_own
ON public.profiles FOR INSERT
WITH CHECK (auth.uid()::text = id OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY profiles_update_own
ON public.profiles FOR UPDATE
USING (auth.uid()::text = id OR auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.uid()::text = id OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY profiles_service_all
ON public.profiles FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Catalog tables readable by everyone
CREATE POLICY plans_select_all
ON public.plans FOR SELECT USING (true);

CREATE POLICY features_select_all
ON public.features FOR SELECT USING (true);

CREATE POLICY plan_features_select_all
ON public.plan_features FOR SELECT USING (true);

CREATE POLICY plans_service_all
ON public.plans FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY features_service_all
ON public.features FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY plan_features_service_all
ON public.plan_features FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Subscriptions
CREATE POLICY subscriptions_select_own
ON public.subscriptions FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY subscriptions_service_all
ON public.subscriptions FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Usage
CREATE POLICY usage_meters_select_own
ON public.usage_meters FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY usage_meters_service_all
ON public.usage_meters FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Feature usage events
CREATE POLICY feature_usage_events_select_own
ON public.feature_usage_events FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY feature_usage_events_service_all
ON public.feature_usage_events FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- GitHub identities
CREATE POLICY github_identities_select_own
ON public.github_identities FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY github_identities_service_all
ON public.github_identities FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Repositories
CREATE POLICY repositories_select_all
ON public.repositories FOR SELECT
USING (true);

CREATE POLICY repositories_service_all
ON public.repositories FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Repo scans
CREATE POLICY repo_scans_select_own
ON public.repo_scans FOR SELECT
USING (auth.uid()::text = requested_by_user_id);

CREATE POLICY repo_scans_service_all
ON public.repo_scans FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Scan snapshots
CREATE POLICY scan_snapshots_select_own
ON public.scan_snapshots FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.repo_scans rs
    WHERE rs.id = scan_snapshots.repo_scan_id
      AND rs.requested_by_user_id = auth.uid()::text
  )
);

CREATE POLICY scan_snapshots_service_all
ON public.scan_snapshots FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Code smells / Bugs / Security / ESLint
CREATE POLICY code_smells_select_own
ON public.code_smells FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.repo_scans rs
    WHERE rs.id = code_smells.repo_scan_id
      AND rs.requested_by_user_id = auth.uid()::text
  )
);

CREATE POLICY bugs_select_own
ON public.bugs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.repo_scans rs
    WHERE rs.id = bugs.repo_scan_id
      AND rs.requested_by_user_id = auth.uid()::text
  )
);

CREATE POLICY security_issues_select_own
ON public.security_issues FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.repo_scans rs
    WHERE rs.id = security_issues.repo_scan_id
      AND rs.requested_by_user_id = auth.uid()::text
  )
);

CREATE POLICY eslint_reports_select_own
ON public.eslint_reports FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.repo_scans rs
    WHERE rs.id = eslint_reports.repo_scan_id
      AND rs.requested_by_user_id = auth.uid()::text
  )
);

CREATE POLICY code_smells_service_all
ON public.code_smells FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY bugs_service_all
ON public.bugs FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY security_issues_service_all
ON public.security_issues FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY eslint_reports_service_all
ON public.eslint_reports FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- README generations
CREATE POLICY readme_generations_select_own
ON public.readme_generations FOR SELECT
USING (auth.uid()::text = generated_by_user_id);

CREATE POLICY readme_generations_service_all
ON public.readme_generations FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- PR suggestions
CREATE POLICY prs_select_own
ON public.pull_request_suggestions FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.repositories r
    WHERE r.id = pull_request_suggestions.repo_id
      AND r.owner_user_id = auth.uid()::text
  )
);

CREATE POLICY prs_service_all
ON public.pull_request_suggestions FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Scanned profiles/repositories
CREATE POLICY scanned_profiles_select_own
ON public.scanned_profiles FOR SELECT
USING (auth.uid()::text = scanned_by_user_id);

CREATE POLICY scanned_profiles_service_all
ON public.scanned_profiles FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY scanned_repositories_select_own
ON public.scanned_repositories FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.scanned_profiles sp
    WHERE sp.id = scanned_repositories.scanned_profile_id
      AND sp.scanned_by_user_id = auth.uid()::text
  )
);

CREATE POLICY scanned_repositories_service_all
ON public.scanned_repositories FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Operational tables
CREATE POLICY webhook_events_service_all
ON public.webhook_events FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY plan_change_history_select_own
ON public.plan_change_history FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY plan_change_history_service_all
ON public.plan_change_history FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- ----------------------------------------------------------------------------
-- 8) Seed data (plans/features/plan_features)
-- ----------------------------------------------------------------------------

INSERT INTO public.plans (key, limits, price_monthly)
VALUES
  (
    'free',
    '{
      "repo_scan": 5,
      "profile_scan": 1,
      "readme_generation": 3,
      "eslint_analysis": 5,
      "bug_detection": false,
      "security_scan": false,
      "deep_code_smell_scan": 0,
      "scan_history": false,
      "pr_publish": false
    }'::jsonb,
    0
  ),
  (
    'pro',
    '{
      "repo_scan": -1,
      "profile_scan": 20,
      "readme_generation": 20,
      "eslint_analysis": 50,
      "bug_detection": true,
      "security_scan": true,
      "deep_code_smell_scan": 10,
      "scan_history": true,
      "pr_publish": true
    }'::jsonb,
    18
  ),
  (
    'pro_plus',
    '{
      "repo_scan": -1,
      "profile_scan": -1,
      "readme_generation": -1,
      "eslint_analysis": -1,
      "bug_detection": true,
      "security_scan": true,
      "deep_code_smell_scan": -1,
      "scan_history": true,
      "pr_publish": true
    }'::jsonb,
    50
  )
ON CONFLICT (key)
DO UPDATE SET
  limits = EXCLUDED.limits,
  price_monthly = EXCLUDED.price_monthly;

INSERT INTO public.features (key, description)
VALUES
  ('repo_scan', 'Repository scan quota'),
  ('profile_scan', 'GitHub profile scan quota'),
  ('readme_generation', 'README generation quota'),
  ('eslint_analysis', 'ESLint analysis quota'),
  ('bug_detection', 'Bug detection access'),
  ('security_scan', 'Security scan access'),
  ('deep_code_smell_scan', 'Deep code smell scan quota'),
  ('scan_history', 'Historical scan access'),
  ('pr_publish', 'Publish PRs automatically')
ON CONFLICT (key) DO NOTHING;

WITH pf AS (
  SELECT
    p.id AS plan_id,
    f.id AS feature_id,
    CASE p.key
      WHEN 'free' THEN
        CASE f.key
          WHEN 'bug_detection' THEN false
          WHEN 'security_scan' THEN false
          WHEN 'scan_history' THEN false
          WHEN 'pr_publish' THEN false
          WHEN 'deep_code_smell_scan' THEN false
          ELSE true
        END
      WHEN 'pro' THEN true
      WHEN 'pro_plus' THEN true
      ELSE false
    END AS enabled
  FROM public.plans p
  CROSS JOIN public.features f
)
INSERT INTO public.plan_features (plan_id, feature_id, enabled)
SELECT plan_id, feature_id, enabled FROM pf
ON CONFLICT (plan_id, feature_id)
DO UPDATE SET enabled = EXCLUDED.enabled;

-- ----------------------------------------------------------------------------
-- 9) Helpful comments
-- ----------------------------------------------------------------------------

COMMENT ON FUNCTION public.increment_usage(uuid, text)
IS 'Atomically increments a whitelisted usage column in usage_meters.';

COMMIT;

-- ============================================================================
-- Run order: This file alone is enough.
-- Recommended execution:
--   1) Supabase SQL Editor -> paste/run OR run as migration file
--   2) Restart app server
--   3) Open /plans once to validate plan sync from app
--   4) Test flows: profile load, repo import, scan enqueue, scanProfile
-- ============================================================================
