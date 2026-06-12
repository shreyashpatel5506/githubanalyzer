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
