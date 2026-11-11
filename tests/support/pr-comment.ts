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
