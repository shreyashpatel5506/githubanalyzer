# ClarityCode — AI-powered Repository Analyzer

ClarityCode analyzes GitHub repositories to surface code smells, dependency risks, security issues, and architectural hotspots using static analysis and multiple AI models (Groq, OpenAI, Gemini).

## 🚀 Working Features
- **Repository Scanning Engine**: Analyzes code architecture, languages, and dependencies via GitHub API.
- **Billing Meters (Local)**: Tracking logic exists to decrement available usage tokens (repo scans, PR creations, deep scans).
- **Multi-AI Routing**: Capable of cascading through Groq, OpenAI, and Gemini for fallback completions.
- **Payments**: PayPal subscription activation is fully supported.

## 🛠 Tech Stack
- **Frontend / Framework**: Next.js (App Router), React, Tailwind CSS 4
- **Backend / DB**: Supabase PostgreSQL + Edge Functions
- **AI Core**: Groq SDK, Google Generative AI (Gemini), OpenAI
- **Billing**: PayPal

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

## Security & Secrets
- This repository contains committed environment variables and API keys. Treat this as a secret leak: rotate all exposed keys and remove them from the repo history (use git-filter-repo or BFG).
- Use `.env.local` for development and provider secrets for production.

## Contributing
See `CONTRIBUTING.md` for contribution guidelines and `SECURITY.md` for vulnerability reporting.

## License
MIT — see `LICENSE` for details.

## Changelog
See `CHANGELOG.md` for release notes and versioning guidance.
