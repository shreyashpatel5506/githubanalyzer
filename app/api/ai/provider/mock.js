export function mockAnalysis(prompt, error) {
  return `
## Overall Verdict
This profile shows early-stage effort but lacks strong hiring signals.
AI services were unavailable, so this is a deterministic fallback.

## Health Scores (0–10)
Consistency: 3
Project Quality: 4
Open Source: 2
Documentation: 3
Personal Branding: 2
Hiring Readiness: 3

## What Is Missing
- Regular commits
- Clear README files
- Issue-driven development
- OSS contributions

## 30-Day Improvement Plan
Week 1: Clean top 3 repositories
Week 2: Add proper READMEs
Week 3: Ship one focused project
Week 4: Make first OSS PR

## Recruiter Perspective
Not shortlist-ready today.
Potential junior frontend role after cleanup.
`;
}
