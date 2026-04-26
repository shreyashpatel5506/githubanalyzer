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
2. Hook up Razorpay/PayPal webhooks to unlock feature monetization.
