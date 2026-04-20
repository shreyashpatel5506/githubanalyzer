-- ClarityCode Complete Database Migration
-- Convert ALL UUID user columns to TEXT for Clerk compatibility
-- Based on full schema analysis

-- ============================================================================
-- STEP 1: Drop ALL foreign key constraints that reference profiles.id
-- ============================================================================

-- Usage and subscription related
ALTER TABLE IF EXISTS usage_meters DROP CONSTRAINT IF EXISTS usage_meters_user_id_fkey;
ALTER TABLE IF EXISTS subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;
ALTER TABLE IF EXISTS feature_usage_events DROP CONSTRAINT IF EXISTS feature_usage_events_user_id_fkey;

-- GitHub and repository related
ALTER TABLE IF EXISTS github_identities DROP CONSTRAINT IF EXISTS github_identities_user_id_fkey;
ALTER TABLE IF EXISTS repositories DROP CONSTRAINT IF EXISTS repositories_owner_user_id_fkey;
ALTER TABLE IF EXISTS scanned_profiles DROP CONSTRAINT IF EXISTS scanned_profiles_scanned_by_user_id_fkey;

-- Scan related
ALTER TABLE IF EXISTS repo_scans DROP CONSTRAINT IF EXISTS repo_scans_requested_by_user_id_fkey;
ALTER TABLE IF EXISTS readme_generations DROP CONSTRAINT IF EXISTS readme_generations_generated_by_user_id_fkey;

-- ============================================================================
-- STEP 2: Convert all user ID columns from UUID to TEXT
-- ============================================================================

-- Main profiles table
ALTER TABLE IF EXISTS profiles ALTER COLUMN id TYPE TEXT;

-- Usage and subscription tables
ALTER TABLE IF EXISTS usage_meters ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE IF EXISTS subscriptions ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE IF EXISTS feature_usage_events ALTER COLUMN user_id TYPE TEXT;

-- GitHub and repository tables
ALTER TABLE IF EXISTS github_identities ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE IF EXISTS repositories ALTER COLUMN owner_user_id TYPE TEXT;
ALTER TABLE IF EXISTS scanned_profiles ALTER COLUMN scanned_by_user_id TYPE TEXT;

-- Scan tables
ALTER TABLE IF EXISTS repo_scans ALTER COLUMN requested_by_user_id TYPE TEXT;
ALTER TABLE IF EXISTS readme_generations ALTER COLUMN generated_by_user_id TYPE TEXT;

-- ============================================================================
-- STEP 3: Recreate ALL foreign key constraints with TEXT types
-- ============================================================================

-- Usage and subscription constraints
ALTER TABLE IF EXISTS usage_meters 
  ADD CONSTRAINT usage_meters_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS subscriptions 
  ADD CONSTRAINT subscriptions_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS feature_usage_events 
  ADD CONSTRAINT feature_usage_events_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- GitHub and repository constraints
ALTER TABLE IF EXISTS github_identities 
  ADD CONSTRAINT github_identities_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS repositories 
  ADD CONSTRAINT repositories_owner_user_id_fkey 
  FOREIGN KEY (owner_user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS scanned_profiles 
  ADD CONSTRAINT scanned_profiles_scanned_by_user_id_fkey 
  FOREIGN KEY (scanned_by_user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Scan constraints
ALTER TABLE IF EXISTS repo_scans 
  ADD CONSTRAINT repo_scans_requested_by_user_id_fkey 
  FOREIGN KEY (requested_by_user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS readme_generations 
  ADD CONSTRAINT readme_generations_generated_by_user_id_fkey 
  FOREIGN KEY (generated_by_user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- ============================================================================
-- Migration complete! All user ID columns are now TEXT compatible with Clerk
-- ============================================================================
