# Complete Database Migration for Clerk

## ✅ Based on Full Schema Analysis

I've analyzed your complete schema and found **8 foreign key constraints** that need updating.

## Run This Complete Migration

```sql
-- Step 1: Drop ALL 8 foreign key constraints
ALTER TABLE usage_meters DROP CONSTRAINT IF EXISTS usage_meters_user_id_fkey;
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;
ALTER TABLE feature_usage_events DROP CONSTRAINT IF EXISTS feature_usage_events_user_id_fkey;
ALTER TABLE github_identities DROP CONSTRAINT IF EXISTS github_identities_user_id_fkey;
ALTER TABLE repositories DROP CONSTRAINT IF EXISTS repositories_owner_user_id_fkey;
ALTER TABLE scanned_profiles DROP CONSTRAINT IF EXISTS scanned_profiles_scanned_by_user_id_fkey;
ALTER TABLE repo_scans DROP CONSTRAINT IF EXISTS repo_scans_requested_by_user_id_fkey;
ALTER TABLE readme_generations DROP CONSTRAINT IF EXISTS readme_generations_generated_by_user_id_fkey;

-- Step 2: Convert all 9 columns to TEXT
ALTER TABLE profiles ALTER COLUMN id TYPE TEXT;
ALTER TABLE usage_meters ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE subscriptions ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE feature_usage_events ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE github_identities ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE repositories ALTER COLUMN owner_user_id TYPE TEXT;
ALTER TABLE scanned_profiles ALTER COLUMN scanned_by_user_id TYPE TEXT;
ALTER TABLE repo_scans ALTER COLUMN requested_by_user_id TYPE TEXT;
ALTER TABLE readme_generations ALTER COLUMN generated_by_user_id TYPE TEXT;

-- Step 3: Recreate ALL 8 foreign keys
ALTER TABLE usage_meters 
  ADD CONSTRAINT usage_meters_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE subscriptions 
  ADD CONSTRAINT subscriptions_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE feature_usage_events 
  ADD CONSTRAINT feature_usage_events_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE github_identities 
  ADD CONSTRAINT github_identities_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE repositories 
  ADD CONSTRAINT repositories_owner_user_id_fkey 
  FOREIGN KEY (owner_user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE scanned_profiles 
  ADD CONSTRAINT scanned_profiles_scanned_by_user_id_fkey 
  FOREIGN KEY (scanned_by_user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE repo_scans 
  ADD CONSTRAINT repo_scans_requested_by_user_id_fkey 
  FOREIGN KEY (requested_by_user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE readme_generations 
  ADD CONSTRAINT readme_generations_generated_by_user_id_fkey 
  FOREIGN KEY (generated_by_user_id) REFERENCES profiles(id) ON DELETE CASCADE;
```

## What Gets Updated

### Tables with Foreign Keys (8):
1. ✅ `usage_meters.user_id`
2. ✅ `subscriptions.user_id`
3. ✅ `feature_usage_events.user_id`
4. ✅ `github_identities.user_id`
5. ✅ `repositories.owner_user_id`
6. ✅ `scanned_profiles.scanned_by_user_id`
7. ✅ `repo_scans.requested_by_user_id`
8. ✅ `readme_generations.generated_by_user_id`

### Primary Table (1):
9. ✅ `profiles.id`

## This Should Work!

This migration is complete and handles every foreign key in your schema. Run it in Supabase SQL Editor and you should be good to go! 🚀
