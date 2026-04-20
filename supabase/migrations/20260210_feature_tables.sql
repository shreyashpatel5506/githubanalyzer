-- Migration: 20260210_feature_tables
-- Description: Add tables for all SaaS features (README, ESLint, Code Smells, Bugs, Security, PRs)

-- ============================================================
-- 1. README GENERATION
-- ============================================================

CREATE TABLE public.readme_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  repo_id UUID REFERENCES public.repositories(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_readme_user_id ON public.readme_generations(user_id);
CREATE INDEX idx_readme_repo_id ON public.readme_generations(repo_id);

-- ============================================================
-- 2. ESLINT ANALYSIS
-- ============================================================

CREATE TABLE public.eslint_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_scan_id UUID REFERENCES public.repo_scans(id) ON DELETE CASCADE,
  issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  severity_counts JSONB DEFAULT '{"error": 0, "warning": 0, "info": 0}'::jsonb,
  total_files_scanned INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_eslint_scan_id ON public.eslint_reports(repo_scan_id);

-- ============================================================
-- 3. CODE SMELL DETECTION
-- ============================================================

CREATE TABLE public.code_smell_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_scan_id UUID REFERENCES public.repo_scans(id) ON DELETE CASCADE,
  smells JSONB NOT NULL DEFAULT '[]'::jsonb,
  refactor_suggestions JSONB DEFAULT '[]'::jsonb,
  complexity_score DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_code_smell_scan_id ON public.code_smell_reports(repo_scan_id);

-- ============================================================
-- 4. BUG DETECTION
-- ============================================================

CREATE TABLE public.bug_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_scan_id UUID REFERENCES public.repo_scans(id) ON DELETE CASCADE,
  bugs JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence_scores JSONB DEFAULT '{}'::jsonb,
  total_bugs_found INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bug_scan_id ON public.bug_reports(repo_scan_id);

-- ============================================================
-- 5. SECURITY SCANNING
-- ============================================================

CREATE TABLE public.security_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_scan_id UUID REFERENCES public.repo_scans(id) ON DELETE CASCADE,
  vulnerabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  severity JSONB DEFAULT '{"critical": 0, "high": 0, "medium": 0, "low": 0}'::jsonb,
  total_vulnerabilities INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_security_scan_id ON public.security_reports(repo_scan_id);

-- ============================================================
-- 6. PR SUGGESTIONS
-- ============================================================

CREATE TABLE public.pr_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID REFERENCES public.repositories(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'rejected')),
  pr_number INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE INDEX idx_pr_user_id ON public.pr_suggestions(user_id);
CREATE INDEX idx_pr_repo_id ON public.pr_suggestions(repo_id);
CREATE INDEX idx_pr_status ON public.pr_suggestions(status);

-- ============================================================
-- 7. UPDATE USAGE_METERS FOR NEW FEATURES
-- ============================================================

ALTER TABLE public.usage_meters 
ADD COLUMN IF NOT EXISTS readme_generations INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS eslint_analyses INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS code_smell_scans INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS bug_detections INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS security_scans INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS pr_suggestions_count INT DEFAULT 0;

-- Update RPC function to support new columns
DROP FUNCTION IF EXISTS increment_usage(uuid, text);

CREATE OR REPLACE FUNCTION increment_usage(row_id uuid, column_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Whitelist allowed columns
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

    EXECUTE format('UPDATE public.usage_meters SET %I = COALESCE(%I, 0) + 1 WHERE id = %L', column_name, column_name, row_id);
END;
$$;

-- ============================================================
-- 8. ENABLE RLS ON NEW TABLES
-- ============================================================

ALTER TABLE public.readme_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eslint_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_smell_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pr_suggestions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 9. RLS POLICIES FOR NEW TABLES
-- ============================================================

-- README Generations
CREATE POLICY "Users can view their own READMEs"
ON public.readme_generations
FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY "Service role can manage all READMEs"
ON public.readme_generations
FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- ESLint Reports (linked via repo_scans)
CREATE POLICY "Users can view ESLint reports for their scans"
ON public.eslint_reports
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.repo_scans
    WHERE repo_scans.id = eslint_reports.repo_scan_id
    AND repo_scans.requested_by_user_id = auth.uid()::text
  )
);

CREATE POLICY "Service role can manage all ESLint reports"
ON public.eslint_reports
FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- Code Smell Reports
CREATE POLICY "Users can view code smell reports for their scans"
ON public.code_smell_reports
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.repo_scans
    WHERE repo_scans.id = code_smell_reports.repo_scan_id
    AND repo_scans.requested_by_user_id = auth.uid()::text
  )
);

CREATE POLICY "Service role can manage all code smell reports"
ON public.code_smell_reports
FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- Bug Reports
CREATE POLICY "Users can view bug reports for their scans"
ON public.bug_reports
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.repo_scans
    WHERE repo_scans.id = bug_reports.repo_scan_id
    AND repo_scans.requested_by_user_id = auth.uid()::text
  )
);

CREATE POLICY "Service role can manage all bug reports"
ON public.bug_reports
FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- Security Reports
CREATE POLICY "Users can view security reports for their scans"
ON public.security_reports
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.repo_scans
    WHERE repo_scans.id = security_reports.repo_scan_id
    AND repo_scans.requested_by_user_id = auth.uid()::text
  )
);

CREATE POLICY "Service role can manage all security reports"
ON public.security_reports
FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- PR Suggestions
CREATE POLICY "Users can view their own PR suggestions"
ON public.pr_suggestions
FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY "Service role can manage all PR suggestions"
ON public.pr_suggestions
FOR ALL
USING (auth.jwt()->>'role' = 'service_role');
