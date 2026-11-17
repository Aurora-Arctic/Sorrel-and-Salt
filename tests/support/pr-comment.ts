import { createRequire } from 'node:module';

import { expect } from 'vitest';

import { fromRoot } from './paths';

// .github/scripts/lib/pr-comment.cjs as the pr-comment action loads it, and a fake GitHub that keeps one pull
// request's comments, so a test proves a comment by the bodies it leaves.

export type Comment = {
  id: number;
  node_id: string;
  body: string;
  minimized: boolean;
  issue: number;
};

export type Lib = {
  inputsFromEnv: (env: Record<string, string>) => unknown;
  postComment: (options: {
    github: unknown;
    context: unknown;
    core: unknown;
    inputs: unknown;
    readFile?: (file: string) => string;
    sleep?: (ms: number) => Promise<void>;
    random?: () => number;
    maxAttempts?: number;
  }) => Promise<string>;
};

export const lib = createRequire(import.meta.url)(
  fromRoot('.github/scripts/lib/pr-comment.cjs'),
) as Lib;

export const PR = 7;

export function fakeGitHub(seed: Omit<Comment, 'issue'>[]) {
  const comments: Comment[] = seed.map((comment) => ({ ...comment, issue: PR }));
  let next = 100;
  const byId = (id: number) => {
    const comment = comments.find((candidate) => candidate.id === id);
    if (!comment) throw new Error(`No comment ${id}`);
    return comment;
  };
  const listComments = () => {
    throw new Error('read through paginate');
  };
  const github = {
    paginate: async (method: unknown, { issue_number }: { issue_number: number }) => {
      expect(method).toBe(listComments);
      return comments
        .filter((comment) => comment.issue === issue_number)
        .map(({ id, node_id, body }) => ({ id, node_id, body }));
    },
    rest: {
      issues: {
        listComments,
        createComment: async ({ issue_number, body }: { issue_number: number; body: string }) => {
          const id = next++;
          comments.push({ id, node_id: `node-${id}`, body, minimized: false, issue: issue_number });
          return { data: { id } };
        },
        updateComment: async ({ comment_id, body }: { comment_id: number; body: string }) => {
          byId(comment_id).body = body;
        },
        deleteComment: async () => {
          throw new Error('no comment here is ever deleted');
        },
      },
    },
    graphql: async (query: string, { id }: { id: string }) => {
      const comment = comments.find((candidate) => candidate.node_id === id);
      if (!comment) throw new Error(`No node ${id}`);
      const hide = /\bminimizeComment\(/.test(query);
      // GitHub refuses to unhide a comment that is not hidden.
      if (!hide && !comment.minimized) throw new Error('Comment is not minimized');
      comment.minimized = hide;
    },
  };
  return { github, comments };
}

export const context = {
  repo: { owner: 'testwort-owner', repo: 'testwort-repo' },
  runId: 42,
  runAttempt: 1,
  serverUrl: 'https://github.example',
  sha: 'fallbacksha',
  payload: { pull_request: { head: { sha: 'abcdef1234567' } } },
};

export const core = { info: () => {}, warning: () => {} };

const STATUS_WORDS = ['Passed', 'Failed', 'Running', 'Skipped', 'Warning'] as const;

/** One row of a sectioned comment's table: a section's, or a shard's sub-row (`↳`) beneath it. */
export type Row = {
  label: string;
  /** The shard's index when the row is a sub-row, else null. */
  shard: number | null;
  status: string;
  result: string;
};

/** A sectioned comment's table rows, top to bottom. */
export function rowsOf(body: string): Row[] {
  return body
    .split('\n')
    .filter((line) => line.startsWith('|') && !/^\|\s*-/.test(line))
    .slice(1)
    .map((line) => {
      const [label = '', status = '', result = ''] = line
        .slice(1, -1)
        .split(/(?<!\\)\|/)
        .map((cell) => cell.trim());
      const sub = label.startsWith('↳');
      return {
        label,
        shard: sub ? Number(/\d+/.exec(label)?.[0]) : null,
        status: STATUS_WORDS.find((word) => status.includes(word)) ?? status,
        result,
      };
    });
}

/** The status word of a comment's heading. */
export function headingStatusOf(body: string): string {
  const heading = body.split('\n').find((line) => line.startsWith('### '));
  if (!heading) throw new Error('The comment has no heading');
  return STATUS_WORDS.find((word) => heading.split(' · ').includes(word)) ?? '';
}

/** A sectioned comment's shard entries, by section key and then shard index, as its hidden state holds them. */
export function shardsOf(
  body: string,
): Record<string, Record<string, { status: string; total: number; token: string }>> {
  const state = /<!-- ci-state (.*?) -->/s.exec(body);
  if (!state) throw new Error('The comment carries no ci-state');
  return (JSON.parse(state[1]) as { shards?: ReturnType<typeof shardsOf> }).shards ?? {};
}

export type Section = { status: string; summary: string; block: string };

/** A sectioned comment's sections, by key, as its hidden state and its blocks hold them. */
export function sectionsOf(body: string): Record<string, Section> {
  const state = /<!-- ci-state (.*?) -->/s.exec(body);
  if (!state) throw new Error('The comment carries no ci-state');
  const { sections } = JSON.parse(state[1]) as {
    sections: Record<string, { status: string; summary: string }>;
  };
  return Object.fromEntries(
    Object.entries(sections).map(([key, { status, summary }]) => {
      const block = new RegExp(
        `<!-- ci-section:${key} -->\\n\\n([\\s\\S]*?)\\n\\n<!-- /ci-section:${key} -->`,
      ).exec(body);
      return [key, { status, summary, block: block?.[1] ?? '' }];
    }),
  );
}
