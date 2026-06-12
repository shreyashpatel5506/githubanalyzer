import { Octokit } from 'octokit';
export async function getGitHubAutomationOctokit() {
    var _a, _b, _c;
    const token = ((_a = process.env.GITHUB_PR_CREATOR_TOKEN) === null || _a === void 0 ? void 0 : _a.trim()) ||
        ((_b = process.env.GITHUB_AUTOMATION_TOKEN) === null || _b === void 0 ? void 0 : _b.trim()) ||
        ((_c = process.env.GITHUB_BOT_TOKEN) === null || _c === void 0 ? void 0 : _c.trim()) ||
        '';
    if (!token) {
        return {
            ok: false,
            status: 500,
            error: 'GitHub PR creator token is not configured. Set GITHUB_PR_CREATOR_TOKEN in your environment.',
            octokit: null,
            token: null,
        };
    }
    return {
        ok: true,
        status: 200,
        error: null,
        octokit: new Octokit({ auth: token }),
        token,
    };
}
