import { describe, expect, it, vi } from 'vitest';
import {
  LAYOUTS,
  planSectionWrite,
  postComment,
  renderComment,
  type CommentInputs,
  type GitHubClient,
} from '../../../../.github/scripts/lib/pr-comment.cjs';

// The PR comments every CI job posts through .github/actions/pr-comment: one
// layout for all of them, and the two sectioned comments (Vitest, Playwright)
// that several jobs write into at once. Fed a fake GitHub that keeps comments
// in memory and answers every call a tick later, so concurrent writers
// interleave the way two jobs finishing together do.

interface FakeComment {
  id: number;
  node_id: string;
  body: string;
}

function fakeGitHub(seed: string[] = []) {
  let nextId = 1;
  const comments: FakeComment[] = seed.map((body) => ({
    id: nextId,
    node_id: `node-${nextId++}`,
    body,
  }));
  const writes: string[] = [];
  const tick = () => new Promise((resolve) => setTimeout(resolve, 1));
  const find = (id: number) => {
    const comment = comments.find((candidate) => candidate.id === id);
    if (!comment) throw new Error(`no comment ${id}`);
    return comment;
  };
  const graphql = vi.fn(async () => ({}));
  const github: GitHubClient = {
    rest: {
      issues: {
        listComments: async ({ per_page = 30, page = 1 }) => {
          await tick();
          const data = comments
            .slice((page - 1) * per_page, page * per_page)
            .map((comment) => ({ ...comment }));
          return { data };
        },
        createComment: async ({ body }) => {
          await tick();
          const comment = { id: nextId, node_id: `node-${nextId++}`, body };
          comments.push(comment);
          writes.push(body);
          return { data: { ...comment } };
        },
        updateComment: async ({ comment_id, body }) => {
          await tick();
          find(comment_id).body = body;
          writes.push(body);
          return { data: { ...find(comment_id) } };
        },
        deleteComment: async ({ comment_id }) => {
          await tick();
          comments.splice(comments.indexOf(find(comment_id)), 1);
          return { data: {} };
        },
      },
    },
    paginate: async (method, params) => {
      const all = [];
      for (let page = 1; ; page++) {
        const { data } = await method({ ...params, page });
        all.push(...data);
        if (data.length < (params.per_page ?? 30)) return all;
      }
    },
    graphql,
  };
  return { github, comments, writes, graphql };
}

function context(runId: number, { attempt = 1, sha = `${runId}`.padEnd(40, 'a') } = {}) {
  return {
    repo: { owner: 'owner', repo: 'repo' },
    serverUrl: 'https://github.example',
    runId,
    runAttempt: attempt,
    sha: 'f'.repeat(40),
    payload: { pull_request: { head: { sha } } },
  };
}

const core = { info: () => {}, warning: () => {} };
const quickSleep = () => new Promise<void>((resolve) => setTimeout(resolve, 20));

function inputs(overrides: Partial<CommentInputs>): CommentInputs {
  return {
    checkName: 'Vitest',
    slug: 'vitest',
    prNumber: '7',
    mergeQueue: false,
    outcome: 'success',
    logFile: '',
    successMode: 'comment',
    summary: '',
    details: '',
    duration: '',
    section: '',
    reset: false,
    skippedSections: [],
    ...overrides,
  };
}

function post(
  fake: ReturnType<typeof fakeGitHub>,
  runId: number,
  overrides: Partial<CommentInputs>,
  options: { attempt?: number; maxAttempts?: number; readFile?: (path: string) => string } = {},
) {
  return postComment({
    github: fake.github,
    context: context(runId, { attempt: options.attempt }),
    core,
    inputs: inputs(overrides),
    sleep: quickSleep,
    random: () => 0,
    maxAttempts: options.maxAttempts,
    readFile: options.readFile ?? (() => 'the log'),
  });
}

// The rendered status of one row of a sectioned comment's table.
function rowStatus(body: string, label: string): string | undefined {
  const row = body.split('\n').find((line) => line.startsWith(`| ${label} |`));
  return row?.split('|')[2]?.trim();
}

const vitestLabel = (key: string) =>
  LAYOUTS.vitest.sections.find((section) => section.key === key)!.label;
const playwrightLabel = (key: string) =>
  LAYOUTS.playwright.sections.find((section) => section.key === key)!.label;

describe('the layout every comment shares', () => {
  it('opens with the marker, then a status heading, and ends with the commit and run footer', () => {
    const single = renderComment({
      marker: '<!-- ci-lint -->',
      title: 'Lint',
      status: 'failed',
      summary: '3 errors across 2 files',
      details: '',
      log: 'error one',
      footer: { sha: 'abc1234def', runUrl: 'https://run' },
    });
    const sectioned = planSectionWrite(null, {
      layout: LAYOUTS.vitest,
      marker: '<!-- ci-vitest -->',
      run: { id: 1, attempt: 1, sha: 'abc1234def', url: 'https://run' },
      mergeQueue: false,
      write: { reset: true, skipped: [] },
      token: 't',
    }).body!;

    for (const [body, title] of [
      [single, 'Lint'],
      [sectioned, 'Vitest'],
    ] as const) {
      const lines = body.split('\n');
      expect(lines[0]).toMatch(/^<!-- ci-[a-z]+ -->$/);
      expect(lines.find((line) => line.startsWith('### '))).toMatch(
        new RegExp(`^### \\S+ ${title} · (Passed|Failed|Running|Skipped|Warning)$`),
      );
      expect(lines[lines.length - 1]).toBe('<sub>Commit `abc1234` · [View Run](https://run)</sub>');
    }
  });

  it('fences a log with more backticks than the log holds, so the fence cannot close early', () => {
    const body = renderComment({
      marker: '<!-- ci-lint -->',
      title: 'Lint',
      status: 'failed',
      summary: '',
      details: '',
      log: 'before\n```\nafter',
      footer: {},
    });
    expect(body).toContain('````text\nbefore\n```\nafter\n````');
  });
});

describe('a sectioned comment reset for a run', () => {
  const plan = (body: string | null, run: number, skipped: string[] = [], attempt = 1) =>
    planSectionWrite(body, {
      layout: LAYOUTS.playwright,
      marker: '<!-- ci-playwright -->',
      run: { id: run, attempt, sha: 'abc1234', url: 'https://run' },
      mergeQueue: false,
      write: { reset: true, skipped },
      token: `reset-${run}`,
    });
  const section = (body: string | null, run: number, key: string, status: 'passed' | 'failed') =>
    planSectionWrite(body, {
      layout: LAYOUTS.playwright,
      marker: '<!-- ci-playwright -->',
      run: { id: run, attempt: 1, sha: 'abc1234', url: 'https://run' },
      mergeQueue: false,
      write: { key, status, summary: `${key} ${status}`, details: `${key} details`, log: '' },
      token: `${key}-${run}`,
    });

  it('shows every section as running', () => {
    const { action, body } = plan(null, 1);
    expect(action).toBe('write');
    for (const { label } of LAYOUTS.playwright.sections) {
      expect(rowStatus(body!, label)).toBe('⏳ Running');
    }
  });

  it('shows a section the path filter skipped as skipped, not running', () => {
    const { body } = plan(null, 1, ['stories']);
    expect(rowStatus(body!, playwrightLabel('stories'))).toBe('⏭️ Skipped');
    expect(rowStatus(body!, playwrightLabel('gate'))).toBe('⏳ Running');
  });

  it('posts nothing when every section is skipped and no comment exists yet', () => {
    expect(plan(null, 1, ['gate', 'stories', 'coverage']).action).toBe('none');
  });

  it('marks an existing comment skipped when every section is, so it keeps no earlier result', () => {
    const finished = section(plan(null, 1).body!, 1, 'gate', 'failed').body!;
    const { action, body } = plan(finished, 2, ['gate', 'stories', 'coverage']);
    expect(action).toBe('write');
    expect(rowStatus(body!, playwrightLabel('gate'))).toBe('⏭️ Skipped');
    expect(body).not.toContain('gate details');
  });

  it('resets the previous commit’s finished sections to running on a new run', () => {
    let body = plan(null, 1).body!;
    body = section(body, 1, 'gate', 'failed').body!;
    body = section(body, 1, 'stories', 'passed').body!;
    expect(rowStatus(body, playwrightLabel('gate'))).toBe('❌ Failed');

    const reset = plan(body, 2).body!;
    for (const { label } of LAYOUTS.playwright.sections) {
      expect(rowStatus(reset, label)).toBe('⏳ Running');
    }
    expect(reset).not.toContain('gate details');
    expect(reset).not.toContain('stories passed');
  });

  it('keeps a section this attempt already reported when its reset arrives late', () => {
    const early = section(null, 5, 'gate', 'passed').body!;
    const late = plan(early, 5).body!;
    expect(rowStatus(late, playwrightLabel('gate'))).toBe('✅ Passed');
    expect(late).toContain('gate details');
  });

  it('clears that section when the reset belongs to a later attempt of the run', () => {
    const early = section(null, 5, 'gate', 'passed').body!;
    const rerun = plan(early, 5, [], 2).body!;
    expect(rowStatus(rerun, playwrightLabel('gate'))).toBe('⏳ Running');
  });

  it('refuses a write from an older run, so a cancelled run cannot overwrite a newer one', () => {
    const newer = plan(null, 9).body!;
    expect(section(newer, 8, 'gate', 'failed').action).toBe('stale');
    expect(plan(newer, 8).action).toBe('stale');
  });
});

describe('a section write', () => {
  const write = (
    body: string | null,
    run: number,
    key: string,
    status: 'passed' | 'failed',
    mergeQueue = false,
  ) =>
    planSectionWrite(body, {
      layout: LAYOUTS.vitest,
      marker: '<!-- ci-vitest -->',
      run: { id: run, attempt: 1, sha: 'abc1234', url: 'https://run' },
      mergeQueue,
      write: { key, status, summary: `${key} summary`, details: `${key} details`, log: '' },
      token: `${key}-${run}`,
    });

  it('changes only its own section and keeps the others’ rows and details', () => {
    let body = write(null, 1, 'dom', 'passed').body!;
    body = write(body, 1, 'result', 'failed').body!;
    body = write(body, 1, 'node', 'passed').body!;

    expect(rowStatus(body, vitestLabel('dom'))).toBe('✅ Passed');
    expect(rowStatus(body, vitestLabel('node'))).toBe('✅ Passed');
    expect(rowStatus(body, vitestLabel('db'))).toBe('⏳ Running');
    expect(rowStatus(body, vitestLabel('result'))).toBe('❌ Failed');
    expect(body).toContain('result details');
    expect(body).toContain('dom details');
  });

  it('from a new run starts from running, not from the previous commit’s results', () => {
    const previous = write(null, 1, 'dom', 'failed').body!;
    const body = write(previous, 2, 'node', 'passed').body!;
    expect(rowStatus(body, vitestLabel('dom'))).toBe('⏳ Running');
    expect(body).not.toContain('dom details');
  });

  it('takes over a comment in the old, unsectioned layout', () => {
    const old = '<!-- ci-vitest -->\n> [!NOTE]\n> ✅ **Vitest passed** — 10 passed';
    const body = write(old, 1, 'dom', 'passed').body!;
    expect(body).not.toContain('Vitest passed');
    expect(rowStatus(body, vitestLabel('dom'))).toBe('✅ Passed');
  });

  it('in a merge queue posts no passing section when no comment exists', () => {
    expect(write(null, 1, 'dom', 'passed', true).action).toBe('none');
    expect(write(null, 1, 'dom', 'failed', true).action).toBe('write');
  });
});

describe('posting the Vitest comment through a run', () => {
  it('posts one comment at the start and updates it in place as each part and the merge finish', async () => {
    const fake = fakeGitHub();
    await post(fake, 1, { reset: true });
    expect(fake.comments).toHaveLength(1);
    for (const key of ['dom', 'node', 'db', 'result']) {
      expect(rowStatus(fake.comments[0].body, vitestLabel(key))).toBe('⏳ Running');
    }

    for (const key of ['dom', 'node', 'db']) {
      await post(fake, 1, { section: key, outcome: 'success' });
      expect(fake.comments).toHaveLength(1);
      expect(rowStatus(fake.comments[0].body, vitestLabel(key))).toBe('✅ Passed');
    }
    await post(fake, 1, {
      section: 'result',
      outcome: 'success',
      summary: '120 passed — 91% lines',
      details: 'coverage table',
    });

    expect(fake.comments).toHaveLength(1);
    const [{ body }] = fake.comments;
    expect(rowStatus(body, vitestLabel('result'))).toBe('✅ Passed');
    expect(body).toContain('coverage table');
    expect(body.split('\n').find((line) => line.startsWith('### '))).toContain('Passed');
  });

  it('shows two parts that finish at once, though the second write first overwrote the first', async () => {
    const fake = fakeGitHub();
    await post(fake, 1, { reset: true });

    await Promise.all([
      post(fake, 1, { section: 'dom', outcome: 'success' }),
      post(fake, 1, { section: 'node', outcome: 'failure', logFile: '/log' }),
    ]);

    // The race happened: some write left one of the two parts still running.
    const lostOne = fake.writes.some(
      (body) =>
        rowStatus(body, vitestLabel('dom')) === '⏳ Running' ||
        rowStatus(body, vitestLabel('node')) === '⏳ Running',
    );
    expect(lostOne).toBe(true);
    expect(fake.comments).toHaveLength(1);
    expect(rowStatus(fake.comments[0].body, vitestLabel('dom'))).toBe('✅ Passed');
    expect(rowStatus(fake.comments[0].body, vitestLabel('node'))).toBe('❌ Failed');
  });

  it('loses one of the two without the check after writing, which is what that check is for', async () => {
    const fake = fakeGitHub();
    await post(fake, 1, { reset: true });

    await Promise.all([
      post(fake, 1, { section: 'dom', outcome: 'success' }, { maxAttempts: 1 }),
      post(fake, 1, { section: 'node', outcome: 'success' }, { maxAttempts: 1 }),
    ]);

    const statuses = ['dom', 'node'].map((key) =>
      rowStatus(fake.comments[0].body, vitestLabel(key)),
    );
    expect(statuses).toContain('⏳ Running');
  });

  it('leaves one comment when two parts both find none and both create one', async () => {
    const fake = fakeGitHub();
    await Promise.all([
      post(fake, 1, { section: 'dom', outcome: 'success' }),
      post(fake, 1, { section: 'db', outcome: 'success' }),
    ]);

    expect(
      fake.writes.filter((body) => body.includes('<!-- ci-vitest -->')).length,
    ).toBeGreaterThan(1);
    expect(fake.comments).toHaveLength(1);
    expect(rowStatus(fake.comments[0].body, vitestLabel('dom'))).toBe('✅ Passed');
    expect(rowStatus(fake.comments[0].body, vitestLabel('db'))).toBe('✅ Passed');
  });

  it('finds its comment past the first page of a long thread rather than posting a second', async () => {
    const fake = fakeGitHub([
      ...Array.from({ length: 40 }, (_, index) => `review comment ${index}`),
    ]);
    await post(fake, 1, { reset: true });
    expect(fake.comments[fake.comments.length - 1].body).toContain('<!-- ci-vitest -->');
    fake.comments.push(
      ...Array.from({ length: 140 }, (_, index) => ({
        id: 1000 + index,
        node_id: `late-${index}`,
        body: `later comment ${index}`,
      })),
    );

    await post(fake, 1, { section: 'dom', outcome: 'success' });

    expect(
      fake.comments.filter((comment) => comment.body.includes('<!-- ci-vitest -->')),
    ).toHaveLength(1);
  });
});

describe('posting the Playwright comment', () => {
  it('keeps the gate, stories and coverage sections in one comment', async () => {
    const fake = fakeGitHub();
    const playwright = { checkName: 'Playwright', slug: 'playwright' };
    await post(fake, 3, { ...playwright, reset: true, skippedSections: ['stories'] });
    await post(fake, 3, {
      ...playwright,
      section: 'gate',
      outcome: 'success',
      summary: '40 passed',
    });
    await post(fake, 3, {
      ...playwright,
      section: 'coverage',
      outcome: 'success',
      details: 'merged table',
    });

    expect(fake.comments).toHaveLength(1);
    const [{ body }] = fake.comments;
    expect(rowStatus(body, playwrightLabel('gate'))).toBe('✅ Passed');
    expect(rowStatus(body, playwrightLabel('stories'))).toBe('⏭️ Skipped');
    expect(rowStatus(body, playwrightLabel('coverage'))).toBe('✅ Passed');
    expect(body).toContain('merged table');
  });

  it('leaves an older Stories or Playwright Coverage comment as it is', async () => {
    const stories = '<!-- ci-stories -->\nold stories';
    const coverage = '<!-- ci-playwright-coverage -->\nold coverage';
    const fake = fakeGitHub([stories, coverage]);
    await post(fake, 3, { checkName: 'Playwright', slug: 'playwright', reset: true });

    expect(fake.comments.map((comment) => comment.body).slice(0, 2)).toEqual([stories, coverage]);
    expect(fake.comments).toHaveLength(3);
  });
});

describe('posting a single-result comment', () => {
  const lint = { checkName: 'Lint', slug: 'lint', successMode: 'minimize' };

  it('posts nothing for a pass when the check never failed', async () => {
    const fake = fakeGitHub();
    await post(fake, 1, { ...lint, outcome: 'success' });
    expect(fake.comments).toHaveLength(0);
  });

  it('posts a failure with its log, then resolves the same comment when the check passes', async () => {
    const fake = fakeGitHub();
    await post(fake, 1, { ...lint, outcome: 'failure', logFile: '/log' });
    expect(fake.comments).toHaveLength(1);
    expect(fake.comments[0].body).toContain('the log');

    await post(fake, 2, { ...lint, outcome: 'success' });
    expect(fake.comments).toHaveLength(1);
    expect(fake.comments[0].body).not.toContain('the log');
    expect(fake.graphql).toHaveBeenCalledWith(
      expect.stringContaining('minimizeComment'),
      expect.objectContaining({ id: fake.comments[0].node_id }),
    );
  });

  it('still posts the failure when the check wrote no log', async () => {
    const fake = fakeGitHub();
    await post(
      fake,
      1,
      { ...lint, outcome: 'failure', logFile: '/missing' },
      {
        readFile: () => {
          throw new Error('ENOENT');
        },
      },
    );
    expect(fake.comments).toHaveLength(1);
  });
});
