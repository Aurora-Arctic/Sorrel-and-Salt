import { describe, expect, it } from 'vitest';

import {
  PR,
  context,
  core,
  fakeGitHub,
  blockLabelOf,
  headingNotesOf,
  headingStatusOf,
  lib,
  rowsOf,
  sectionsOf,
  shardsOf,
} from '../../support/pr-comment';

// A single-result CI comment (one check, one comment) through postComment, as the pr-comment action calls it:
// the inputs read from the action's environment, GitHub a fake that keeps the pull request's comments, so each
// case is proved by the comments it leaves.

const MARKER = '<!-- ci-lint -->';
const LOG = 'Testwort lint log line';

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

// The Playwright comment's suites, each shard reporting as it finishes in a sub-row beneath its suite's row
// (claude-docs/ci/pr-comments.md). Each write goes through postComment as the pr-comment action makes it.
describe("the Playwright comment's shard rows", () => {
  type Env = Record<string, string>;
  const PLAYWRIGHT = {
    CHECK_NAME: 'Playwright',
    MARKER_SLUG: 'playwright',
    PR_NUMBER: String(PR),
    LOG_FILE: 'playwright.log',
  };

  function write(
    github: unknown,
    env: Env,
    { id = 42, attempt = 1 }: { id?: number; attempt?: number } = {},
    sleep: () => Promise<void> = async () => {},
  ) {
    return lib.postComment({
      github,
      context: { ...context, runId: id, runAttempt: attempt },
      core,
      inputs: lib.inputsFromEnv({ ...PLAYWRIGHT, ...env }),
      readFile: () => LOG,
      sleep,
      random: () => 0,
    });
  }

  const reset = (skipped = ''): Env => ({ RESET: 'true', SKIPPED_SECTIONS: skipped });
  // One shard's write: its suite, its index of the total, and its one-line summary.
  const shard = (section: string, index: number, total: number, outcome = 'success'): Env => ({
    SECTION: section,
    SHARD: `${index}/${total}`,
    OUTCOME: outcome,
    SUMMARY: `Testwort shard ${index}`,
  });
  // The end job's write of the whole suite, unchanged by the shards.
  const joined = (section: string, outcome: string): Env => ({
    SECTION: section,
    OUTCOME: outcome,
    SUMMARY: 'Testwort joined',
    DETAILS: 'Testwort joined details',
  });

  // Each row as [its suite's key, or its shard's index when it is a sub-row, and its status].
  const table = (body: string) =>
    rowsOf(body).map(({ label, shard: index, status }) => [
      index ?? (/Gate/.test(label) ? 'gate' : /Stories/.test(label) ? 'stories' : label),
      status,
    ]);

  it("puts each shard's row beneath its suite's row in shard order, whatever order they write in", async () => {
    const { github, comments } = fakeGitHub([]);
    await write(github, reset('stories'));

    // Before any shard writes, the suite is one Running row.
    expect(table(comments[0].body)).toEqual([
      ['gate', 'Running'],
      ['stories', 'Skipped'],
    ]);

    expect(await write(github, shard('gate', 3, 3))).toBe('written');
    expect(await write(github, shard('gate', 1, 3))).toBe('written');

    const body = comments[0].body;
    expect(table(body)).toEqual([
      ['gate', 'Running'],
      [1, 'Passed'],
      // Not written yet; the total came with its siblings' writes.
      [2, 'Running'],
      [3, 'Passed'],
      ['stories', 'Skipped'],
    ]);
    const third = rowsOf(body).find((row) => row.shard === 3);
    expect(third?.result).toContain('Testwort shard 3');
  });

  it("derives the suite's row from its shards until the end job writes it, and the heading counts it", async () => {
    const { github, comments } = fakeGitHub([]);
    await write(github, reset());
    await write(github, shard('stories', 1, 2));
    await write(github, shard('stories', 2, 2));
    await write(github, shard('gate', 1, 3));
    await write(github, shard('gate', 2, 3));

    const gate = () => rowsOf(comments[0].body).find((row) => row.label.includes('Gate'));
    expect(gate()?.status).toBe('Running');
    // "2 of 3 shards finished".
    expect(gate()?.result).toMatch(/\b2\b.*\b3\b/);
    expect(headingStatusOf(comments[0].body)).toBe('Running');

    expect(await write(github, shard('gate', 3, 3, 'failure'))).toBe('written');

    const body = comments[0].body;
    expect(gate()?.status).toBe('Failed');
    expect(headingStatusOf(body)).toBe('Failed');
    expect(table(body)).toContainEqual([3, 'Failed']);
    // A shard writes no log: the suite's block, from the end job, carries it.
    expect(body).not.toContain(LOG);
  });

  it("shows what the end job wrote on the suite's row, with its shards' rows kept beneath it", async () => {
    const { github, comments } = fakeGitHub([]);
    await write(github, reset());
    for (const index of [1, 2, 3]) await write(github, shard('gate', index, 3));

    expect(await write(github, joined('gate', 'failure'))).toBe('written');

    const body = comments[0].body;
    expect(table(body).slice(0, 4)).toEqual([
      ['gate', 'Failed'],
      [1, 'Passed'],
      [2, 'Passed'],
      [3, 'Passed'],
    ]);
    expect(rowsOf(body)[0].result).toContain('Testwort joined');
    expect(sectionsOf(body).gate.block).toContain(LOG);
  });

  it("keeps the end job's row and block when a shard's write lands after it", async () => {
    const { github, comments } = fakeGitHub([]);
    await write(github, reset());
    await write(github, shard('gate', 1, 3));
    await write(github, joined('gate', 'failure'));

    expect(await write(github, shard('gate', 2, 3))).toBe('written');

    const body = comments[0].body;
    expect(table(body).slice(0, 4)).toEqual([
      ['gate', 'Failed'],
      [1, 'Passed'],
      [2, 'Passed'],
      [3, 'Running'],
    ]);
    expect(sectionsOf(body).gate.block).toContain(LOG);
  });

  it("confirms a shard's write by its own token, and writes again when a sibling's concurrent write dropped it", async () => {
    const { github, comments } = fakeGitHub([]);
    await write(github, reset());
    // Shard 2's write, made from the comment as it was before shard 1's, lands while shard 1 waits.
    const sibling = fakeGitHub([{ ...comments[0], body: comments[0].body }]);
    await write(sibling.github, shard('gate', 2, 3));
    let waits = 0;
    const interleave = async () => {
      if (waits++ === 0) comments[0].body = sibling.comments[0].body;
    };

    expect(await write(github, shard('gate', 1, 3), {}, interleave)).toBe('written');

    expect(waits).toBe(2);
    const body = comments[0].body;
    expect(table(body).slice(1, 4)).toEqual([
      [1, 'Passed'],
      [2, 'Passed'],
      [3, 'Running'],
    ]);
    const held = shardsOf(body).gate;
    expect(Object.keys(held).sort()).toEqual(['1', '2']);
    expect(held['1'].total).toBe(3);
    expect(held['1'].token).toBeTruthy();
    expect(held['1'].token).not.toBe(held['2'].token);
  });

  it('clears the shard rows on a reset for a new run or a later attempt, and keeps them on a late reset of the same attempt', async () => {
    const subRows = (body: string) => rowsOf(body).filter((row) => row.shard !== null);
    const written = async () => {
      const made = fakeGitHub([]);
      await write(made.github, reset());
      await write(made.github, shard('gate', 1, 3));
      await write(made.github, shard('stories', 2, 2));
      return made;
    };

    // Two written shards; their unwritten siblings show as Running up to each known total.
    const before = [
      ['gate', 'Running'],
      [1, 'Passed'],
      [2, 'Running'],
      [3, 'Running'],
      ['stories', 'Running'],
      [1, 'Running'],
      [2, 'Passed'],
    ];
    const late = await written();
    expect(table(late.comments[0].body)).toEqual(before);
    await write(late.github, reset());
    expect(table(late.comments[0].body)).toEqual(before);
    expect(Object.keys(shardsOf(late.comments[0].body).gate)).toEqual(['1']);

    const retried = await written();
    expect(table(retried.comments[0].body)).toEqual(before);
    await write(retried.github, reset(), { attempt: 2 });
    expect(subRows(retried.comments[0].body)).toEqual([]);

    const next = await written();
    await write(next.github, reset(), { id: 43 });
    expect(subRows(next.comments[0].body)).toEqual([]);
  });

  it("drops a shard's write from an older run, and starts over a comment an older run left", async () => {
    const { github, comments } = fakeGitHub([]);
    await write(github, reset(), { id: 41 });
    for (const index of [1, 2, 3])
      await write(github, shard('gate', index, 3, 'failure'), { id: 41 });

    expect(await write(github, shard('gate', 1, 3))).toBe('written');

    expect(table(comments[0].body)).toEqual([
      ['gate', 'Running'],
      [1, 'Passed'],
      [2, 'Running'],
      [3, 'Running'],
      ['stories', 'Running'],
    ]);

    const before = comments[0].body;
    expect(await write(github, shard('gate', 2, 3, 'failure'), { id: 41 })).toBe('stale');
    expect(comments[0].body).toBe(before);
  });
});

// What the Playwright end job writes beside the suites' rows: each suite's note in the heading, as the Vitest
// merge writes its test count, and the final section that holds the coverage and the slowest files.
describe("the Playwright comment's heading and final section, as the end job writes them", () => {
  function write(slug: string, env: Record<string, string>, id = 42) {
    return lib.postComment({
      github: made.github,
      context: { ...context, runId: id, runAttempt: 1 },
      core,
      inputs: lib.inputsFromEnv({
        CHECK_NAME: slug === 'vitest' ? 'Vitest' : 'Playwright',
        MARKER_SLUG: slug,
        PR_NUMBER: String(PR),
        LOG_FILE: 'ci.log',
        ...env,
      }),
      readFile: () => LOG,
      sleep: async () => {},
      random: () => 0,
    });
  }
  let made = fakeGitHub([]);
  const body = (slug: string) =>
    made.comments.find((comment) => comment.body.includes(`<!-- ci-${slug} -->`))?.body ?? '';
  const final = {
    SECTION: 'coverage',
    OUTCOME: 'success',
    SUMMARY: 'Testwort coverage',
    DETAILS: 'Testwort table',
  };

  it("labels its final section as the Vitest comment labels its own, and carries each suite's note in suite order until a new run resets it", async () => {
    made = fakeGitHub([]);
    await write('vitest', { RESET: 'true' });
    await write('vitest', final);
    await write('playwright', { RESET: 'true' });
    await write('playwright', {
      SECTION: 'stories',
      OUTCOME: 'success',
      SUMMARY: 's',
      HEADING_NOTE: '2 stories',
    });
    await write('playwright', {
      SECTION: 'gate',
      OUTCOME: 'success',
      SUMMARY: 'g',
      HEADING_NOTE: '3 tests',
    });
    await write('playwright', final);

    const playwright = sectionsOf(body('playwright')).coverage.block;
    const vitest = sectionsOf(body('vitest')).coverage.block;
    // Preconditions: both final sections were written with their blocks.
    expect(vitest).toContain('Testwort table');
    expect(playwright).toContain('Testwort table');
    expect(blockLabelOf(playwright)).toBe(blockLabelOf(vitest));

    // The gate's note first, whichever suite wrote first; the final section adds none.
    expect(headingNotesOf(body('playwright'))).toEqual(['3 tests', '2 stories']);
    await write('playwright', { RESET: 'true' }, 43);
    expect(headingNotesOf(body('playwright'))).toEqual([]);
  });
});
