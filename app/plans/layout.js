export const metadata = {
    title: "Plans Comparison",
    description: "Explore ClarityCode feature comparison across Free, Pro, and Pro Plus plans for repository scans, security scans, and AI-driven code analysis.",
    alternates: {
        canonical: "/plans",
    },
    openGraph: {
        title: "ClarityCode Plans Comparison",
        description: "Compare ClarityCode plans and feature limits for AI code quality workflows.",
        url: "/plans",
    },
    twitter: {
        card: "summary_large_image",
        title: "ClarityCode Plans Comparison",
        description: "Compare plan features and pick the best ClarityCode tier.",
    },
};
export default function PlansLayout({ children }) {
    return children;
}
