# README_SAAS_EXECUTION_PLAN.md

## 🚀 1. EXECUTIVE SUMMARY
This master plan details the conversion of **GitProfileAI** into a production-grade SaaS. The transformation migrates the current synchronous, MongoDB-backed prototype into an asynchronous, scalable system powered by **Supabase (Postgres + Edge Functions)**, **Clerk (Auth)**, and **Stripe (Billing)**.

### Core Objectives:
- **Major Database Migration**: Moving from MongoDB (Mongoose) to Supabase (Postgres).
- **Asynchronous Architecture**: Replacing in-memory caching and synchronous API calls with a persistent job queue.
- **SaaS Monetization**: Implementing strict, plan-based usage limits (`usage_meters`) and tiered access.
- **Hybrid User Model**: Supporting completely anonymous Guests (IP-fingerprinted), Free Users (Auth), and Paid Subscribers.

---

## 2. PROJECT SCAN (LOCAL ANALYSIS)

### 2.1 Technical Stack (Current)
- **Frontend**: Next.js 16 (App Router), Tailwind CSS, Lucide React.
- **Backend**: Next.js API Routes (Serverless).
- **Database**: MongoDB (v9.1 Mongoose) - **TO BE REMOVED**.
- **Auth**: Hybrid/Transitional state (Next-Auth + Clerk).
- **AI Providers**: Groq SDK, OpenAI, Google Generative AI (Gemini).
- **State Management**: volatile in-memory `Map` (`repositoryCache.js`) - **RISK**.

### 2.2 Feature Inventory (Detected)

| Feature | Description | File Path | Status |
| :--- | :--- | :--- | :--- |
| **Repository Snapshot** | Captures repo metadata, stars, forks, languages. | `app/api/analysis/route.js` | ✅ Active |
| **Code Smells** | Static analysis for anti-patterns and complexity. | `app/lib/scanner/smellDetectors.js` | ✅ Active |
| **Profile Analysis** | User profile health check and scoring. | `app/api/profile-analysis/route.js` | ✅ Active |
| **README Generation** | AI-generated documentation creation. | `app/api/readme/generate/route.js` | ✅ Active |
| **Commit Analytics** | Visualization of commit history and activity. | `app/api/repo-commits/route.js` | ✅ Active |
| **Tech Stack Detection**| Heuristic detection of libraries/frameworks. | `app/api/tech-stack/route.js` | ✅ Active |
| **AI Bug Detection** | AI-driven scan for potential bugs in files. | `app/api/ai/bugs/route.ts` (Implied) | ✅ Active |

---

## 3. DATABASE: MONGODB → SUPABASE

### 3.1 Supabase Schema (The Source of Truth)
The following tables are **MANDATORY** for the migration.

#### 1. `profiles`
The master record for users. Extends Supabase Auth.
- **Dependency**: Used by Middleware, Billing, Dashboard.
- **Columns**: `id` (PK, ref auth.users), `email`, `plan` (enum: 'free', 'pro', 'pro_plus'), `stripe_customer_id`.

#### 2. `github_identities`
Secure storage for GitHub OAuth tokens, separated from the profile for security.
- **Dependency**: Used by GitHub API clients.
- **Columns**: `user_id` (PK), `github_id`, `access_token` (Encrypted), `username`.

#### 3. `scans`
The persistent job queue state. Replaces in-memory Maps.
- **Dependency**: Used by Polling API, Edge Workers.
- **Columns**: `id` (UUID), `user_id` (nullable for guests), `repo_url`, `status` ('queued', 'processing', 'completed', 'failed'), `priority` (int).

#### 4. `scan_snapshots`
Large-object storage for analysis results. Keeps the `scans` table lightweight.
- **Dependency**: Used by History/Results page.
- **Columns**: `scan_id` (FK), `ai_response` (JSONB), `file_tree` (JSONB), `metrics` (JSONB).

#### 5. `usage_meters`
Strict enforcement mechanisms for billing.
- **Dependency**: Used by `api/scan/enqueue` and Middleware.
- **Columns**: `user_id`, `guest_ip_hash`, `date`, `scans_count`, `deep_scans_count`, `pr_credits`.

### 3.2 Data Mapping Strategy

| Mongo Collection | Field | Supabase Table | Column | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `User` | `email` | `profiles` | `email` | Sync via Clerk Webhook |
| `User` | `plan` | `profiles` | `plan` | Default 'free' |
| `User` | `accessToken` | `github_identities` | `access_token` | **Encryption Required** |
| `Usage` | `count` | `usage_meters` | `scans_count` | Daily limit enforcement |

---

## 4. AUTHENTICATION & USER MODES

### 4.1 Guest Mode (The "Try Before You Buy")
- **Identification**: SHA-256 Hash of (IP Address + User Agent).
- **Storage**: `usage_meters.guest_ip_hash`.
- **Limits**: 1 scan per day.
- **Restrictions**: No "Deep Scans", no PR generation, no history persistence.

### 4.2 Authenticated Flow
- **Provider**: Clerk (handling GitHub OAuth).
- **Sync**: Clerk Webhook (`user.created`, `user.updated`) -> Supabase `profiles`.
- **Session**: standard Supabase SSR cookie handling (already implemented).

---

## 5. BILLING & PLAN LOGIC

### 5.1 Plan Definitions

| Feature | **Free** | **Pro ($19)** | **Pro Plus ($47)** |
| :--- | :--- | :--- | :--- |
| **Repo Scans** | 5 / day | Unlimited | Unlimited |
| **Deep Scans** | 0 | 5 / week | Unlimited (Daily Cap 5) |
| **AI PRs** | 0 | 15 / month | Unlimited |
| **History** | 7 Days | 90 Days | Permanent |
| **Queue Priority**| Standard | High | **Critical** |

### 5.2 Enforcement Rules
- **Check Location**: `/app/api/scan/enqueue`.
- **Fail Action**: Throw `402 Payment Required` or `429 Too Many Requests`.
- **Reset**: Cron job or dynamic date check (`last_reset < today`).

---

## 6. SCALING & INFRASTRUCTURE FIXES

### 6.1 The "Memory Leak" Fix
**Problem**: `app/lib/repositoryCache.js` uses a `new Map()` to store scan results. In a serverless environment (Vercel), this memory is wiped seamlessly, causing data loss and race conditions.
**Solution**: 
- **Write**: API writes initial state to `scans` table (Status: 'queued').
- **Process**: Worker updates `scans` (Status: 'processing' -> 'completed').
- **Read**: Frontend polls `scans` table by UUID.

### 6.2 GitHub API Rate Limits
**Problem**: Synchronous user requests burn API quota on the main thread.
**Solution**:
- **Queueing**: Pro Plus users get a dedicated pool of tokens (if implemented) or higher priority in the `scans` queue.
- **Caching**: Store raw GitHub JSON responses in Supabase Storage or `scan_snapshots` to prevent refetching the same repo within 24 hours.

---

## 7. FILE-BY-FILE EXECUTION PLAN

### 🧱 PHASE 1: FOUNDATION (Database & Auth)

#### Step 1: Client Standardization
📁 **MODIFY**: `app/utils/supabase/client.ts`
- **Goal**: Ensure single singleton for browser usage.
- **Changes**: Already standardized (Previous Task).

📁 **NEW**: `app/lib/supabase.ts`
- **Goal**: Service-role admin client for Webhooks/Workers.
- **Content**: Export `createAdminClient()` using `SUPABASE_SERVICE_ROLE_KEY`.

#### Step 2: Auth Sync
📁 **NEW**: `app/api/webhooks/clerk/route.ts`
- **Goal**: Sync Clerk users to Supabase.
- **Logic**: Verify Svix signature -> Upsert `profiles` -> Upsert `usage_meters`.

#### Step 3: Schema Init
📁 **ACTION**: Run SQL Migrations in Supabase Dashboard (or CLI).
- **Goal**: Create `profiles`, `scans`, `usage_meters` tables.

### ⚡ PHASE 2: ASYNC ENGINE (The Core Refactor)

#### Step 4: The Enqueue API
📁 **NEW**: `app/api/scan/enqueue/route.ts`
- **Goal**: Accept scan request, check limits, create job.
- **Logic**:
  1. Identifiy User (Auth or Guest Hash).
  2. Check `usage_meters` for ability to scan.
  3. Insert into `scans` (Status: 'queued').
  4. Return `scan_id`.

#### Step 5: The Polling API
📁 **NEW**: `app/api/scan/[id]/route.ts`
- **Goal**: Frontend checks this for progress.
- **Logic**: Select `status`, `progress`, and `result` from `scans` where `id` matches.

#### Step 6: The Worker Logic (Migration)
📁 **MODIFY**: `app/api/analysis/route.js` -> **DEPRECATE/MOVE**.
- **Move To**: `app/workers/scanWorker.ts` (or triggerable Edge Function).
- **Refactor**: Instead of returning JSON, it updates `scan_snapshots` table.

### 💰 PHASE 3: BILLING & LIMITS

#### Step 7: Usage Logic
📁 **NEW**: `app/lib/billing.ts`
- **Goal**: Centralized limit checking.
- **Functions**: `checkLimit(userId, resource)`, `incrementUsage(userId, resource)`.

#### Step 8: Middleware Guards
📁 **MODIFY**: `middleware.ts`
- **Goal**: Block specific routes for Guests.
- **Logic**: If path starts with `/pro` and user is free/guest -> Redirect to `/pricing`.

### 🧹 PHASE 4: CLEANUP

#### Step 9: Remove Legacy
📁 **DELETE**: `app/api/analysis/route.js` (After worker verification).
📁 **DELETE**: `app/models/` (User.js, Usage.js).
📁 **DELETE**: `app/lib/repositoryCache.js`.

---

## 8. FINAL CHECKLIST

- [ ] **Database**: All 5 Supabase tables created and RLS policies enabled.
- [ ] **Auth**: Clerk users appearing in `profiles` table.
- [ ] **Billing**: Guests capped at 1 scan, Free at 5.
- [ ] **Async**: Scans do not timeout; polling works.
- [ ] **Cleanup**: No `mongoose` imports remain in the codebase.
- [ ] **Security**: No raw tokens exposed in logs or client-side.

**END OF EXECUTION PLAN**
