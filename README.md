<<<<<<< HEAD
# ClarityCode — AI-powered Repository Analyzer

ClarityCode analyzes GitHub repositories to surface code smells, dependency risks, security issues, and architectural hotspots using static analysis and multiple AI models (Groq, OpenAI, Gemini).

## Highlights
- Scans repositories (Quick / Deep) and builds an indexed view of files, dependencies, and code smells.
- Multi-provider AI routing with API key rotation and fallback strategies for resilient completions.
- Billing metering primitives and payment integration scaffolding (PayPal, Razorpay).

## Features
- Repository discovery & language detection
- Static code smell detectors (configurable rules)
- AI-assisted issue summaries & remediation suggestions
- Scan history, job workers, and basic billing meters

## Production-readiness summary (short)
- Sensitive keys detected in repository — rotate immediately and add secrets to a secure vault.
- Add runtime monitoring, rate limiting for public APIs, hardened job queue (Inngest/Redis/Task queue), and proper webhook verification for payments.

## Quickstart

1. Copy `.env.example` to `.env.local` and fill required secrets. Do NOT commit secrets.

2. Install dependencies and run:

```bash
npm ci
npm run dev
```

3. Open http://localhost:3000

## Project structure (high level)
- `app/` — Next.js App Router pages, API routes, components, and server code
- `lib/` — Application services (auth, billing, scanners, GitHub helpers)
- `app/api/` — Serverless routes and worker endpoints
- `public/` — Static assets
- `supabase/` — Database migrations and RLS examples

## Security & Secrets
- This repository contains committed environment variables and API keys. Treat this as a secret leak: rotate all exposed keys and remove them from the repo history (use git-filter-repo or BFG).
- Use `.env.local` for development and provider secrets for production.

## Contributing
See `CONTRIBUTING.md` for contribution guidelines and `SECURITY.md` for vulnerability reporting.

## License
MIT — see `LICENSE` for details.

## Changelog
See `CHANGELOG.md` for release notes and versioning guidance.
=======
# ClarityCode SaaS - AI Code Quality Analytics

ClarityCode is a deep-dive repository analysis tool constructed to scan GitHub repositories, identifying security vulnerabilities, bugs, and code smells through static analysis and multi-model AI logic.

## 🚀 Working Features
- **Repository Scanning Engine**: Analyzes code architecture, languages, and dependencies via GitHub API.
- **Billing Meters (Local)**: Tracking logic exists to decrement available usage tokens (repo scans, PR creations, deep scans).
- **Multi-AI Routing**: Capable of cascading through Groq, OpenAI, and Gemini for fallback completions.

## ⚠️ Known Limitations (Work In Progress)
- Background processes may get abruptly terminated during large repo scans due to serverless timeout constraints.
- Real-time webhooks for PayPal/Razorpay upgrade pathways are incomplete, meaning users cannot purchase paid tiers yet.
- Supabase native authentication requires complete wiring (custom cookies are currently used, breaking RLS).

## 🛠 Tech Stack
- **Frontend / Framework**: Next.js 14+ (App Router), React, Tailwind CSS 4
- **Backend / DB**: Supabase PostgreSQL + Edge Functions
- **AI Core**: Groq SDK, Google Generative AI (Gemini), OpenAI
- **Billing**: PayPal / Razorpay

## ⚙️ Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables (.env.local)
```env
# Database
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_KEY

# AI Keys
GROQ_API_KEY=YOUR_GROQ_KEY
OPENAI_KEYS=KEY1,KEY2
GEMINI_API_KEY=YOUR_GEMINI_KEY
ENABLE_GEMINI=true

# Auth
SESSION_BOOTSTRAP_TOKEN=RANDOM_SECURE_STRING

# Payments
PAYPAL_ENV=live
PAYPAL_CLIENT_ID=YOUR_CLIENT_ID
PAYPAL_CLIENT_SECRET=YOUR_SECRET

# Analytics / SEO
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
NEXT_PUBLIC_GOOGLE_VERIFICATION=YOUR_GOOGLE_SITE_VERIFICATION

# AdSense
NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXX
```

### 3. Run Locally
```bash
npm run dev
```

## 🔮 Future Improvements
1. Implement hardened task queues (e.g., Inngest) to guarantee scan job completion.
2. Standardize all authentication strictly behind `@supabase/ssr` middleware.
3. Hook up Razorpay/PayPal webhooks to unlock feature monetization.
>>>>>>> 10a2f5d (payment done)
