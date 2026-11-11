import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

import { fromRoot } from '../../support/paths';

// A single-result CI comment (one check, one comment) through postComment, as the pr-comment action calls it:
// the inputs read from the action's environment, GitHub a fake that keeps the pull request's comments, so each
// case is proved by the comments it leaves.

type Comment = { id: number; node_id: string; body: string; minimized: boolean; issue: number };

type Lib = {
  inputsFromEnv: (env: Record<string, string>) => unknown;
  postComment: (options: {
    github: unknown;
    context: unknown;
    core: unknown;
    inputs: unknown;
    readFile: (file: string) => string;
  }) => Promise<string>;
};

const lib = createRequire(import.meta.url)(fromRoot('.github/scripts/lib/pr-comment.cjs')) as Lib;

const PR = 7;
const MARKER = '<!-- ci-lint -->';
const LOG = 'Testwort lint log line';

function fakeGitHub(seed: Omit<Comment, 'issue'>[]) {
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
          throw new Error('a single-result comment deletes nothing');
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

const context = {
  repo: { owner: 'testwort-owner', repo: 'testwort-repo' },
  runId: 42,
  runAttempt: 1,
  serverUrl: 'https://github.example',
  sha: 'fallbacksha',
  payload: { pull_request: { head: { sha: 'abcdef1234567' } } },
};

const core = { info: () => {}, warning: () => {} };

function post(github: unknown, env: Record<string, string>) {
  return lib.postComment({
    github,
    context,
    core,
    inputs: lib.inputsFromEnv({
      CHECK_NAME: 'Lint',
      MARKER_SLUG: 'lint',
      PR_NUMBER: String(PR),
      LOG_FILE: 'lint.log',
      ...env,
    }),
    readFile: () => LOG,
  });
}

const marked = (id: number, minimized = false) => ({
  id,
  node_id: `node-${id}`,
  body: `${MARKER}\nan earlier result`,
  minimized,
});
const unrelated = { id: 1, node_id: 'node-1', body: 'a reviewer comment', minimized: false };

describe('a single-result CI comment', () => {
  it('is created, with the log, when a check fails and the pull request has none', async () => {
    const { github, comments } = fakeGitHub([unrelated]);

    expect(await post(github, { OUTCOME: 'failure' })).toBe('written');

    expect(comments).toHaveLength(2);
    expect(comments[0]).toMatchObject({ body: 'a reviewer comment' });
    expect(comments[1].body).toContain(MARKER);
    expect(comments[1].body).toContain(LOG);
  });

  it('rewrites the oldest marked comment on a failure, unhiding it, and leaves the others', async () => {
    const created = fakeGitHub([]);
    await post(created.github, { OUTCOME: 'failure' });

    const { github, comments } = fakeGitHub([unrelated, marked(3), marked(2, true)]);

    expect(await post(github, { OUTCOME: 'failure' })).toBe('written');

    expect(comments).toHaveLength(3);
    const oldest = comments.find((comment) => comment.id === 2);
    expect(oldest).toMatchObject({ body: created.comments[0].body, minimized: false });
    expect(comments.find((comment) => comment.id === 3)?.body).toBe(marked(3).body);
    expect(comments.find((comment) => comment.id === 1)?.body).toBe('a reviewer comment');
  });

  it('rewrites a marked comment that was never hidden', async () => {
    const { github, comments } = fakeGitHub([marked(2)]);

    expect(await post(github, { OUTCOME: 'failure' })).toBe('written');

    expect(comments).toHaveLength(1);
    expect(comments[0].body).toContain(LOG);
    expect(comments[0].minimized).toBe(false);
  });

  it('writes a pass in comment mode, creating the comment or rewriting the oldest, without the log', async () => {
    const fresh = fakeGitHub([]);
    expect(await post(fresh.github, { OUTCOME: 'success', SUCCESS_MODE: 'comment' })).toBe(
      'written',
    );
    expect(fresh.comments).toHaveLength(1);
    expect(fresh.comments[0].body).toContain(MARKER);
    expect(fresh.comments[0].body).not.toContain(LOG);

    const { github, comments } = fakeGitHub([marked(2, true)]);
    expect(await post(github, { OUTCOME: 'success', SUCCESS_MODE: 'comment' })).toBe('written');
    expect(comments).toHaveLength(1);
    expect(comments[0]).toMatchObject({ body: fresh.comments[0].body, minimized: false });
  });

  it('in minimize mode, writes nothing for a pass when no failure was reported', async () => {
    const { github, comments } = fakeGitHub([unrelated]);

    expect(await post(github, { OUTCOME: 'success' })).toBe('none');

    expect(comments).toEqual([{ ...unrelated, issue: PR }]);
  });

  it('in minimize mode, marks an earlier failure as passed and hides it', async () => {
    const { github, comments } = fakeGitHub([marked(2)]);

    expect(await post(github, { OUTCOME: 'success', SUMMARY: 'Testwort clean' })).toBe('resolved');

    expect(comments).toHaveLength(1);
    expect(comments[0].body).toContain(MARKER);
    expect(comments[0].body).toContain('Testwort clean (previously failed)');
    expect(comments[0].minimized).toBe(true);
  });

  it('in the merge queue, writes nothing for a pass, even over an earlier failure', async () => {
    const queued = { ...marked(2), body: '<!-- ci-lint-mergequeue -->\nan earlier result' };
    const { github, comments } = fakeGitHub([queued]);

    expect(await post(github, { OUTCOME: 'success', MERGE_QUEUE: 'true' })).toBe('none');

    expect(comments).toEqual([{ ...queued, issue: PR }]);
  });

  it('in the merge queue, writes a failure to its own marked comment, apart from the pull request one', async () => {
    const { github, comments } = fakeGitHub([marked(2)]);

    expect(await post(github, { OUTCOME: 'failure', MERGE_QUEUE: 'true' })).toBe('written');

    expect(comments).toHaveLength(2);
    expect(comments[0].body).toBe(marked(2).body);
    expect(comments[1].body).toContain('<!-- ci-lint-mergequeue -->');
  });
});
