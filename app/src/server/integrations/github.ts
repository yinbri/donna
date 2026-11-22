// Research from the candidate's own public GitHub repos. Used when the Donna box is not connected and
// the candidate typed a GitHub username on the apply form, after agreeing to the lookup.
import type { ResearchRequest, ResearchResult } from "../contracts";

const API = "https://api.github.com";
const TIMEOUT_MS = 8_000;
const MAX_DESCRIPTION = 120;

interface GithubUser {
  login: string;
  public_repos: number;
}

interface GithubRepo {
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  fork: boolean;
  archived: boolean;
  pushed_at: string | null;
}

/** The login inside what a candidate typed: a bare name, an @handle or a github.com URL. Null if it cannot be one. */
export function githubLogin(input: string | null | undefined): string | null {
  const typed = (input ?? "")
    .trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//i, "")
    .replace(/^@/, "")
    .split(/[/?#\s]/)[0];
  // GitHub logins are 1 to 39 letters, digits or hyphens and do not start with a hyphen.
  return /^[a-z\d][a-z\d-]{0,38}$/i.test(typed) ? typed : null;
}

/**
 * Repo descriptions are the candidate's own text and end up in Donna's prompt, so keep them to one short
 * plain line: no line breaks, no template or markup characters.
 */
function plain(text: string | null): string {
  const line = (text ?? "")
    .replace(/[\u0000-\u001f{}<>[\]`"]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!]+$/, "");
  return line.length > MAX_DESCRIPTION ? `${line.slice(0, MAX_DESCRIPTION).trimEnd()}...` : line;
}

async function get<T>(path: string): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json", "User-Agent": "donna-screen" };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (res.status === 404) throw new Error("GitHub has no such user");
  if (res.status === 403 || res.status === 429) {
    throw new Error(`GitHub refused the lookup (HTTP ${res.status}; usually the hourly limit, which GITHUB_TOKEN raises)`);
  }
  if (!res.ok) throw new Error(`GitHub returned HTTP ${res.status}`);
  return (await res.json()) as T;
}

const pushedAt = (repo: GithubRepo): number => (repo.pushed_at ? Date.parse(repo.pushed_at) : 0);
const monthYear = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

function describe(repo: GithubRepo): string {
  const description = plain(repo.description);
  const facts = [
    repo.language,
    repo.stargazers_count > 0 ? `${repo.stargazers_count} stars` : null,
    repo.pushed_at ? `last push ${monthYear.format(new Date(repo.pushed_at))}` : null,
  ].filter(Boolean);
  return `${repo.name}${description ? `: ${description}` : ""}${facts.length ? ` (${facts.join(", ")})` : ""}`;
}

/**
 * A dossier built only from the candidate's public repos, forks and archived repos left out. Throws when the
 * username is not one, GitHub does not answer, or there is nothing of their own to ask about; the caller then
 * continues without a dossier.
 */
export async function researchFromGithub(request: ResearchRequest): Promise<ResearchResult> {
  const login = githubLogin(request.githubUser);
  if (!login) throw new Error(`${JSON.stringify(request.githubUser ?? "")} is not a GitHub username`);

  const [user, repos] = await Promise.all([
    get<GithubUser>(`/users/${login}`),
    get<GithubRepo[]>(`/users/${login}/repos?type=owner&sort=pushed&per_page=100`),
  ]);
  const own = repos.filter((repo) => !repo.fork && !repo.archived);
  if (own.length === 0) throw new Error(`@${user.login} has no public repositories of their own`);

  const byRecency = [...own].sort((a, b) => pushedAt(b) - pushedAt(a));
  const top = [...own].sort((a, b) => b.stargazers_count - a.stargazers_count || pushedAt(b) - pushedAt(a))[0];
  const recent = byRecency.find((repo) => repo.name !== top.name);
  const third = byRecency.find((repo) => repo.name !== top.name && repo.name !== recent?.name);

  const languageCounts = new Map<string, number>();
  for (const repo of own) {
    if (repo.language) languageCounts.set(repo.language, (languageCounts.get(repo.language) ?? 0) + 1);
  }
  const languages = [...languageCounts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([language]) => language);

  const topDescription = plain(top.description);
  const recentDescription = plain(recent?.description ?? null);

  return {
    summary:
      `GitHub @${user.login}: ${user.public_repos} public repos` +
      `${languages.length ? `, mostly ${languages.join(" and ")}` : ""}. Most notable: ${describe(top)}.`,
    topProject: `the ${top.name} repo on your GitHub${topDescription ? `, ${topDescription}` : ""}`,
    highlights: [top, recent, third].filter((repo): repo is GithubRepo => Boolean(repo)).map(describe),
    claimsToVerify: [
      `Wrote ${top.name} themselves: the repo is public under @${user.login}, but who wrote the code is not checked`,
      ...(topDescription ? [`${top.name} does what its description says: ${topDescription}`] : []),
    ],
    tailoredQuestions: [
      `In your ${top.name} repo${topDescription ? ` (${topDescription})` : ""}, what was the hardest part to get working, and how did you check that it works?`,
      recent
        ? `Your most recent push is to ${recent.name}${recentDescription ? ` (${recentDescription})` : ""}. What are you building there, and what is one decision you would make differently?`
        : `What is one technical decision in ${top.name} you would make differently now, and why?`,
      "If you joined tomorrow, what would you want to own in your first two weeks?",
    ],
    sources: { fiber: false, ploid: false, github: true },
  };
}
