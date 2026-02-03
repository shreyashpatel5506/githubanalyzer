# README_IMPLEMENTATION_MASTER.md

## 🚀 1. EXECUTIVE SUMMARY & SYSTEM ANALYSIS

This document is the **Single Source of Truth** for converting the GitProfileAI prototype into a production-grade SaaS. It mandates the removal of MongoDB, the implementation of Supabase (Postgres/Auth), and strict billing enforcement without sacrificing any existing functionality.

### 1.1 Codebase Audit & Feature Inventory

The following features **MUST** be preserved during migration:

| Feature Domain | Existing Implementation Path(s) | Migration Strategy |
| :--- | :--- | :--- |
| **Repo Analysis** | `app/api/analysis/route.js` | Move logic to Async Worker; persist to `scans` table. |
| **Profile Health** | `app/api/profile-analysis/route.js` | Cache results in `usage_meters` (guest) or `profiles` (auth). |
| **Code Smells** | `app/lib/scanner/smellDetectors.js` | Preserve logic; input derived from `scan_snapshots.file_tree`. |
| **README Gen** | `app/api/readme/generate/route.js` | Enforce limits via `billing.ts`; output to client + optional commit. |
| **AI Router** | `app/api/ai/router.js` | Keep as central AI gateway; add detailed error logging to Supabase. |
| **Commits Chart** | `app/api/repo-commits/route.js` | No change to logic; add caching to prevent GitHub API abuse. |
| **Tech Stack** | `app/api/tech-stack/route.js` | Cache results using `repo_owner + repo_name` key in `scans`. |

---

## 🏛️ 2. SAAS ARCHITECTURE (SUPABASE-ONLY)

### 2.1 Database Schema (Source of Truth)

All logic must adhere to these 5 core tables.

#### Table: `profiles`
Identity & Billing.
```sql
create table public.profiles (
  id text not null,
  email text not null,
  full_name text null,
  avatar_url text null,
  plan text null default 'free'::text,
  last_login timestamp with time zone null,
  created_at timestamp with time zone null default (now() AT TIME ZONE 'utc'::text),
  updated_at timestamp with time zone null default (now() AT TIME ZONE 'utc'::text),
  constraint profiles_pkey primary key (id),
  constraint profiles_email_key unique (email)
) TABLESPACE pg_default;
```

#### Table: `github_identities`
Secure Auth Tokens.
```sql
create table public.github_identities (
  user_id text not null,
  github_id text not null default ''::text,
  username text not null,
  access_token text not null,
  created_at timestamp with time zone not null default (now() AT TIME ZONE 'utc'::text),
  constraint github_identities_pkey primary key (user_id),
  constraint github_identities_github_id_key unique (github_id),
  constraint github_identities_user_id_fkey foreign KEY (user_id) references profiles (id)
) TABLESPACE pg_default;
```

#### Table: `usage_meters`
Limit Enforcement (Guest & User).
```sql
create table public.usage_meters (
  id uuid not null default gen_random_uuid (),
  user_id text null,
  period_day date not null,
  scan_count bigint null default '0'::bigint,
  deep_scan_count bigint null default '0'::bigint,
  readme_count bigint null default '0'::bigint,
  guest_id text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone null default now(),
  constraint usage_meters_pkey primary key (id),
  constraint usage_meters_user_id_fkey foreign KEY (user_id) references profiles (id)
) TABLESPACE pg_default;
```

#### Table: `scans`
Job Queue.
```sql
create table public.scans (
  id uuid not null default gen_random_uuid (),
  user_id text null,
  repo_owner text not null,
  repo_name text not null,
  status text null default 'queued'::text,
  result_summary jsonb null,
  error_message text null,
  created_at timestamp with time zone null default (now() AT TIME ZONE 'utc'::text),
  updated_at timestamp with time zone null default (now() AT TIME ZONE 'utc'::text),
  constraint scans_pkey primary key (id),
  constraint scans_user_id_fkey foreign KEY (user_id) references profiles (id)
) TABLESPACE pg_default;
```

#### Table: `scan_snapshots`
Big Data Blob Storage.
```sql
create table public.scan_snapshots (
  scan_id uuid not null default gen_random_uuid (),
  full_analysis jsonb null,
  raw_file_tree jsonb null,
  created_at timestamp with time zone not null default now(),
  constraint scan_snapshots_pkey primary key (scan_id),
  constraint scan_snapshots_scan_id_fkey foreign KEY (scan_id) references scans (id)
) TABLESPACE pg_default;
```

---

## 🔐 3. AUTHENTICATION & GUEST STRATEGY

### 3.1 Identification Hierarchy
1.  **Authenticated (Clerk/Supabase)**:
    -   Primary ID: `auth.users.id`.
    -   Permissions: Based on `profiles.plan`.
2.  **Guest (Anonymous)**:
    -   Primary ID: `crypto.createHash('sha256').update(ip + ua).digest('hex')`.
    -   Permissions: Read-only, low limits, no history.

### 3.2 Guest Fallback
If `req.auth.userId` is missing, the system **MUST** automatically generate a Guest ID and query `usage_meters` using `guest_id`.

---

## 💰 4. BILLING & PLAN LOGIC

### 4.1 Usage Limits (Hard Rules)

| Feature | Guest | Free | Pro | Pro Plus |
| :--- | :--- | :--- | :--- | :--- |
| **Repo Scans** | 1 / day | 5 / day | Unlimited | Unlimited |
| **Deep Scans** | ❌ | 1 Lifetime* | 5 / week | Unlimited (Safe Cap) |
| **AI PRs** | ❌ | ❌ | 15 / mo | Unlimited |
| **History** | Session | 7 Days | 90 Days | Permanent |

*\* "1 Lifetime" for Free means 1 per repo per user (deduplicated).*

### 4.2 Enforcement Implementation
-   **Where**: `app/lib/billing.ts` -> `checkAndIncrementLimit()`.
-   **When**: **BEFORE** any AI call or DB write.
-   **Action**: If limit hit -> Throw Error -> API returns `403 Forbidden` with `{ code: 'LIMIT_REACHED', upgradeUrl: '/pricing' }`.

---

## 🛠️ 5. FILE-BY-FILE IMPLEMENTATION PLAN

### PHASE 1: CORE INFRASTRUCTURE

#### 1. `app/lib/supabase.ts` (NEW)
-   **Role**: Service Role Client factory.
-   **Why**: Need admin rights to sync users and write usage meters without RLS issues during webhooks/background jobs.
-   **Implementation**: Export `createAdminClient()`.

#### 2. `app/api/webhooks/clerk/route.ts` (NEW)
-   **Role**: User Synchronizer.
-   **Why**: We trust Clerk for Auth, but we need Postgres for relations.
-   **Logic**:
    -   On `user.created`: Insert `profiles` (default free) + Insert `usage_meters` (init 0).
    -   On `user.session.created`: No action (handled by token).

### PHASE 2: BILLING & LIMITS

#### 3. `app/lib/billing.ts` (NEW)
-   **Role**: Central Policy Enforcement Point (PEP).
-   **Logic**:
    -   `checkGuestLimit(ip)`: Count today's usage for IP.
    -   `checkUserLimit(userId, feature)`: Join `profiles` (get plan) + `usage_meters` (get usage).
    -   `increment(userId/ip, feature)`: Atomic increment.

### PHASE 3: ASYNC ENGINE (Replacing Synchronous API)

#### 4. `app/api/scan/enqueue/route.ts` (NEW)
-   **Role**: Job Admission.
-   **Input**: `repoUrl`.
-   **Flow**:
    1.  Determine Identity (Auth vs Guest).
    2.  Call `billing.checkLimit()`.
    3.  Insert into `scans` (Status: 'queued', Priority: Plan-based).
    4.  Trigger Worker (Fetch to `/api/workers/scan`).
    5.  Return `{ scanId }`.

#### 5. `app/api/scan/[id]/status/route.ts` (NEW)
-   **Role**: Polling Endpoint.
-   **Logic**: Return `scans` row. If 'completed', join `scan_snapshots`.

#### 6. `app/api/workers/scan/route.ts` (NEW / PORT)
-   **Role**: The Heavy Lifter.
-   **Logic**:
    -   Port logic from `app/api/analysis/route.js`.
    -   **CRITICAL**: Do not return JSON. Write JSON to `scan_snapshots`.
    -   Update `scans` status to 'completed'.

### PHASE 4: REFACTORING EXISTING FEATURES

#### 7. `app/api/readme/generate/route.js` (MODIFY)
-   **Current**: Direct AI call.
-   **Change**: Add `billing.checkLimit(..., 'readme_gen')` at top.

#### 8. `app/api/repo-commits/route.js` (MODIFY)
-   **Current**: Fetches GitHub API directly.
-   **Change**: Add Check for Cached Data in `scan_snapshots` before hitting GitHub.

### PHASE 5: MONGODB REMOVAL

#### 9. `app/models/*.js` (DELETE)
-   **Action**: Delete `User.js`, `Usage.js`.
-   **Verification**: Ensure no `mongoose` imports exist in `package.json` or code.

---

## 🔍 6. MISSING FEATURES & SAFETY

### 6.1 Abuse Prevention
-   **Problem**: Guests spamming scans.
-   **Fix**: `billing.ts` must use `crypto` to hash IP addresses to avoid storing Personal Identifiable Information (PII) while maintaining uniqueness.

### 6.2 Admin Visibility
-   **Problem**: No way to see queue depth.
-   **Fix**: Create simple page `app/admin/dashboard/page.tsx` attempting `createAdminClient().from('scans').select('status')` (Secured by Email whitelist).

---

## ✅ 7. IMPLEMENTATION CHECKLIST

-   [ ] **Database**: All 5 tables created in Supabase.
-   [ ] **Env**: `SUPABASE_SERVICE_ROLE_KEY` & `CLERK_WEBHOOK_SECRET` added.
-   [ ] **Auth**: New users appear in `profiles` table automatically.
-   [ ] **Billing**: Guests blocked after 1 scan. Free users blocked after 5.
-   [ ] **Async**: `/api/scan/enqueue` returns 200 OK immediately; result appears in `scan_snapshots` after delay.
-   [ ] **Data Safety**: No GitHub Tokens logged to console.
-   [ ] **Cleanup**: `mongoose` uninstalled.

**End of Master Implementation Plan**
