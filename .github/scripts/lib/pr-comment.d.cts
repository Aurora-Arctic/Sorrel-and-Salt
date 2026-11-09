// Hand-written beside the script, as slowest-files.d.mts is: `allowJs` is off.

export type Status = 'passed' | 'failed' | 'running' | 'skipped' | 'warning';

export interface Layout {
  title: string;
  column: string;
  sections: { key: string; label: string }[];
}

export const LAYOUTS: { vitest: Layout; playwright: Layout };
export const STATUSES: Record<Status, { mark: string; word: string }>;

export interface Footer {
  sha?: string;
  duration?: string;
  notes?: string[];
  runUrl?: string;
}

export function renderComment(options: {
  marker?: string;
  title: string;
  status: Status;
  summary?: string;
  details?: string;
  log?: string;
  footer?: Footer;
}): string;

export interface Run {
  id: number;
  attempt: number;
  sha: string;
  url: string;
}

export type SectionWrite =
  | { reset: true; skipped: string[] }
  | {
      reset?: undefined;
      key: string;
      status: Status;
      summary?: string;
      details?: string;
      log?: string;
    };

export function planSectionWrite(
  body: string | null,
  options: {
    layout: Layout;
    title?: string;
    marker: string;
    run: Run;
    mergeQueue: boolean;
    write: SectionWrite;
    token: string;
  },
): { action: 'write' | 'none' | 'stale'; body?: string };

export function sectionLanded(
  body: string | null,
  options: { layout: Layout; run: Run; write: SectionWrite; token: string },
): 'yes' | 'no' | 'stale';

export interface CommentInputs {
  checkName: string;
  slug: string;
  prNumber: string;
  mergeQueue: boolean;
  outcome: string;
  logFile: string;
  successMode: string;
  summary: string;
  details: string;
  duration: string;
  section: string;
  reset: boolean;
  skippedSections: string[];
}

export function inputsFromEnv(env: Record<string, string | undefined>): CommentInputs;

interface Comment {
  id: number;
  node_id: string;
  body: string;
}

interface Where {
  owner: string;
  repo: string;
  issue_number: number;
}

type ListComments = (
  params: Where & { per_page?: number; page?: number },
) => Promise<{ data: Comment[] }>;

export interface GitHubClient {
  rest: {
    issues: {
      listComments: ListComments;
      createComment: (params: Where & { body: string }) => Promise<{ data: Comment }>;
      updateComment: (
        params: Omit<Where, 'issue_number'> & { comment_id: number; body: string },
      ) => Promise<{ data: Comment }>;
      deleteComment: (
        params: Omit<Where, 'issue_number'> & { comment_id: number },
      ) => Promise<{ data: unknown }>;
    };
  };
  paginate: (method: ListComments, params: Where & { per_page?: number }) => Promise<Comment[]>;
  graphql: (query: string, variables: Record<string, unknown>) => Promise<unknown>;
}

export interface Context {
  repo: { owner: string; repo: string };
  serverUrl: string;
  runId: number;
  runAttempt?: number;
  sha: string;
  payload?: { pull_request?: { head?: { sha?: string } } };
}

export function runOf(context: Context): Run;

export function upsertComment(
  github: GitHubClient,
  where: Where,
  marker: string,
  body: string,
): Promise<void>;

export function postComment(options: {
  github: GitHubClient;
  context: Context;
  core: { info: (message: string) => void; warning: (message: string) => void };
  inputs: CommentInputs;
  readFile?: (path: string) => string;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  maxAttempts?: number;
}): Promise<'written' | 'resolved' | 'none' | 'stale' | 'unconfirmed'>;
