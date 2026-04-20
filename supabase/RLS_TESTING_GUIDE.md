# RLS Policy Application & Testing Guide

## Overview
This guide helps you apply and test the Row Level Security policies for ClarityCode.

## Prerequisites
1. Supabase project created
2. Environment variables set (.env):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

## Step 1: Apply Migration to Supabase

### Option A: Using Supabase CLI (Recommended)
```bash
# Initialize Supabase if not done
npx supabase init

# Link to your project (if not linked)
npx supabase link --project-ref <your-project-ref>

# Apply the migration
npx supabase db push

# Or apply specific migration
npx supabase migration up
```

### Option B: Via Supabase Dashboard
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20260210_rls_policies.sql`
3. Paste and run the SQL

## Step 2: Verify RLS is Enabled

Run this query in Supabase SQL Editor:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'usage_meters', 'subscriptions', 'repositories', 'repo_scans', 'scan_snapshots');
```

Expected: All `rowsecurity` columns should be `true`

## Step 3: Verify Policies Exist

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Expected: You should see policies like:
- "Users can view their own profile"
- "Users can view their own usage"
- "Service role can manage all scans"
- etc.

## Step 4: Test User Isolation

### Test 1: Create Test Users
1. Sign up with User A (e.g., `usera@test.com`)
2. Sign up with User B (e.g., `userb@test.com`)

### Test 2: Create Data as User A
- Trigger a repo scan as User A
- Note the scan ID

### Test 3: Try to Access as User B
- Sign in as User B
- Try to fetch User A's scan via:
  ```sql
  SELECT * FROM repo_scans WHERE id = '<user-a-scan-id>'
  ```
- **Expected**: No results (RLS blocks access)

### Test 4: Verify Service Role Bypass
In your backend code (any API route):
```typescript
const supabase = createAdminClient() // Uses service role key
const { data } = await supabase.from('repo_scans').select('*')
// Should return ALL scans (bypasses RLS)
```

## Step 5: Test Frontend Behaviors

### Test Scenario 1: Profile Modal
1. Sign in as User A
2. Open Profile Modal
3. Check that usage data displays correctly
4. **Expected**: Shows only User A's usage

### Test Scenario 2: Scan Results
1. User A creates a repo scan
2. User A should see scan in results
3. Sign out, sign in as User B
4. User B should NOT see User A's scan

## Common Issues & Fixes

### Issue: "RLS policy violation" errors
**Cause**: Frontend is using anon key to write data
**Fix**: Ensure write operations go through API routes that use service role

### Issue: Users can't see their own data
**Cause**: `auth.uid()` not matching user_id
**Fix**: 
1. Check Clerk integration
2. Verify user_id format (should be Clerk string ID, not UUID)
3. Run: `SELECT auth.uid()` to see current user

### Issue: Service role still blocked
**Cause**: Not using `createAdminClient()`
**Fix**: Always use `createAdminClient()` for backend operations

## Rollback (If Needed)

```sql
-- Drop all policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
-- ... (drop all other policies)

-- Disable RLS
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_meters DISABLE ROW LEVEL SECURITY;
-- ... (disable on all tables)
```

## Security Checklist

- [ ] RLS enabled on all tables
- [ ] Tested with 2+ different users
- [ ] Verified users can't see each other's data
- [ ] Verified service role can bypass RLS
- [ ] All API routes use `createAdminClient()` for writes
- [ ] Frontend uses anon key (read-only for user's own data)
