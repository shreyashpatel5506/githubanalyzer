# Contributing to ClarityCode

Thanks for your interest in contributing! We welcome issues and pull requests that improve code quality, fix bugs, add tests, or enhance documentation.

How to contribute

1. Fork the repository and create a feature branch from `main`.
2. Run the project locally and reproduce the issue or add your feature:

```bash
npm install
npm run dev
```

3. Add tests where applicable and ensure linting passes.
4. Open a pull request with a clear description of changes and why they're needed.

Coding standards

- Follow existing TypeScript and Next.js project patterns.
- Keep changes small and focused.
- Include unit/integration tests and update documentation for public APIs.

Security and secrets

- Never commit secrets to the repository. Use `.env.local` or your cloud provider's secret manager.
- If you discover a security vulnerability, see `SECURITY.md` for reporting guidelines.

Maintainers

- PRs will be reviewed within a few business days. Merge approvals require one approving review and passing CI.