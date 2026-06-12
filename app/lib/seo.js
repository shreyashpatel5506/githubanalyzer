export const defaultSeoKeywords = [
    "GitHub profile analysis",
    "GitHub repository analysis",
    "AI code review",
    "code quality analysis",
    "security vulnerability scanner",
    "bug detection",
    "code smell detection",
    "developer productivity",
    "technical debt",
    "repository insights",
];
const FALLBACK_SITE_URL = "https://claritycode.vercel.app";
export function getSiteUrl() {
    const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        FALLBACK_SITE_URL;
    return envSiteUrl.replace(/\/$/, "");
}
