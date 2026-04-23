import { Octokit } from 'octokit';

type AutomationClientResult =
  | {
      ok: true;
      status: 200;
      error: null;
      octokit: Octokit;
      token: string;
    }
  | {
      ok: false;
      status: 500;
      error: string;
      octokit: null;
      token: null;
    };

export async function getGitHubAutomationOctokit(): Promise<AutomationClientResult> {
  const token =
    process.env.GITHUB_PR_CREATOR_TOKEN?.trim() ||
    process.env.GITHUB_AUTOMATION_TOKEN?.trim() ||
    process.env.GITHUB_BOT_TOKEN?.trim() ||
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