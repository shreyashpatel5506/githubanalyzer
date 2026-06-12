# Security Policy

If you discover a security vulnerability, please report it privately to the maintainers via email: security@your-domain.example (replace with a real contact).

We will respond within 72 hours and work to provide a fix and disclosure timeline. Do not include exploits in public issues.

Recommended steps:
- Rotate any leaked credentials immediately.
- Use provider secret stores for production (Vercel/AWS/Azure secrets).
- Run dependency vulnerability scans (e.g., `npm audit`, Snyk, or Trivy) before production deploys.