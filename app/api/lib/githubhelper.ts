

/* ================== CONSTANTS ================== */
export const GITHUB_API = "https://api.github.com";
export const GITHUB_GRAPHQL = "https://api.github.com/graphql";
export const GITHUB_API_VERSION = "2022-11-28";
export const REPOS_PER_PAGE = 100;
export const MAX_REPOS_TO_FETCH = 100;

/* ================== HEADERS ================== */

const publicHeaders = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
    "User-Agent": "claritycode",
};

// ✅ AUTH (OPTIONAL)
export function getAuthHeaders(token: string) {
    if (!token) return publicHeaders;
    return {
        ...publicHeaders,
        Authorization: `Bearer ${token}`,
    };
}

/* ================== HELPERS ================== */

export function validateUsername(username: string) {
    if (!username || typeof username !== "string") {
        return { valid: false, error: "Username is required" };
    }

    const sanitized = username.trim().toLowerCase();

    if (sanitized.length === 0 || sanitized.length > 39) {
        return { valid: false, error: "Invalid username format" };
    }

    if (!/^[a-z0-9-]+$/.test(sanitized)) {
        return { valid: false, error: "Username contains invalid characters" };
    }

    return { valid: true, username: sanitized };
}

export async function handleGitHubResponse(res: Response, context: string) {
    if (res.status === 404) {
        return { error: true, status: 404, message: "User not found" };
    }

    if (!res.ok) {
        const text = await res.text();
        return {
            error: true,
            status: res.status,
            message: `${context}: ${text}`,
        };
    }

    const data = await res.json();
    return { error: false, data };
}