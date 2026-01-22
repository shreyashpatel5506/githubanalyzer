import { DEFAULT_HEADERS } from "./constants";

export function getGitHubHeaders(token) {
  if (!token) return DEFAULT_HEADERS;

  return {
    ...DEFAULT_HEADERS,
    Authorization: `Bearer ${token}`,
  };
}
