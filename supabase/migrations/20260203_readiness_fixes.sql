-- Migration: 20260203_readiness_fixes
-- Description: Comprehensive fix for usage_meters schema and RPC setup

-- 1. Fix Column Types & Names to match Application Code (Clerk/Billing)
-- Clerk uses String IDs (e.g. 'user_2xyz...'), but DB expects UUID. Fix this.
ALTER TABLE public.usage_meters 
ALTER COLUMN user_id TYPE text;

-- Rename columns to match the code (webhooks/billing.ts)
-- We use 'IF EXISTS' to be safe, or just standard rename
ALTER TABLE public.usage_meters RENAME COLUMN scan_count TO repo_scans_used;
ALTER TABLE public.usage_meters RENAME COLUMN deep_scan_count TO deep_scans_used_this_week;
ALTER TABLE public.usage_meters RENAME COLUMN readme_count TO readme_gens_used;

-- 2. Add Missing Columns
-- pr_gens_used is referenced in Access Control but missing in DB
ALTER TABLE public.usage_meters 
ADD COLUMN IF NOT EXISTS pr_gens_used bigint DEFAULT 0;

-- guest_id for Guest Mode tracking
ALTER TABLE public.usage_meters 
ADD COLUMN IF NOT EXISTS guest_id text;

-- Add index for performance on guest lookups
CREATE INDEX IF NOT EXISTS idx_usage_meters_guest_id ON public.usage_meters(guest_id);

-- 3. Create Atomic Increment Function (RPC)
-- This allows incrementing any column dynamically to prevent race conditions
CREATE OR REPLACE FUNCTION increment_usage(row_id uuid, column_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Dynamic SQL to increment the specified column by 1
    -- Whitelist allowed columns to prevent SQL injection via column_name
    IF column_name NOT IN ('repo_scans_used', 'readme_gens_used', 'pr_gens_used', 'deep_scans_used_this_week') THEN
        RAISE EXCEPTION 'Invalid column name for increment: %', column_name;
    END IF;

    EXECUTE format('UPDATE public.usage_meters SET %I = %I + 1 WHERE id = %L', column_name, column_name, row_id);
END;
$$;
