import { beforeEach, describe, expect, it, vi } from 'vitest';

// Every `gh` call the script makes goes through execFileSync, so a stub here
// answers the reads from fixtures and records the writes: nothing reaches GitHub.
const calls: string[][] = [];
let answer: (args: string[]) => unknown = () => {
  throw new Error('no fixture');
};

vi.mock('node:child_process', () => ({
  execFileSync: (_command: string, args: string[]) => {
    calls.push(args);
    return JSON.stringify(answer(args));
  },
}));

vi.mock('node:timers/promises', () => ({ setTimeout: () => Promise.resolve() }));

const {
  BoardError,
  REPO,
  findMilestone,
  issueEditArgs,
  main,
  parseMoveArgs,
  planPlacement,
  reorderMutationArgs,
} = await import('../../scripts/task-board.mjs');

type Issue = { number: number; title: string; milestone: string | null; state?: string };

const issue = (number: number, id: string, milestone: string | null, state = 'OPEN'): Issue => ({
  number,
  title: `${id} — Testwort task`,
  milestone,
  state,
});

const milestone = (number: number, title: string, state = 'open') => ({
  number,
  title,
  state,
  openIssues: 1,
  closedIssues: 0,
  description: '',
});

describe('findMilestone', () => {
  const milestones = [
    milestone(1, 'Z. Bugfixes'),
    milestone(2, 'Z. Deferred'),
    milestone(3, 'Z. Outside the Website'),
    milestone(4, 'Wave 03 — Testwort'),
    milestone(5, 'Wave 03 — Testwort'),
    milestone(6, 'Retired — not done', 'closed'),
  ];

  it('returns the one open milestone with exactly that title', () => {
    expect(findMilestone('Z. Bugfixes', milestones).number).toBe(1);
    expect(findMilestone('Z. Outside the Website', milestones).number).toBe(3);
  });

  it('refuses a title no milestone has, including a prefix or a case variant', () => {
    expect(() => findMilestone('Z. Bug', milestones)).toThrow(BoardError);
    expect(() => findMilestone('z. bugfixes', milestones)).toThrow(/No open milestone/);
  });

  it('refuses a title several milestones share, naming them', () => {
    expect(() => findMilestone('Wave 03 — Testwort', milestones)).toThrow(/2 .*#4, #5/);
  });

  it('refuses a closed milestone unless closed ones are allowed', () => {
    expect(() => findMilestone('Retired — not done', milestones)).toThrow(/closed/);
    expect(findMilestone('Retired — not done', milestones, { open: false }).number).toBe(6);
  });
});

describe('issueEditArgs', () => {
  it('patches the issue through REST, sending a number as a typed field', () => {
    expect(issueEditArgs({ number: 7 }, { milestone: 3, state: 'closed' })).toEqual([
      'api',
      '-X',
      'PATCH',
      `repos/${REPO}/issues/7`,
      '-F',
      'milestone=3',
      '-f',
      'state=closed',
    ]);
  });
});

describe('parseMoveArgs', () => {
  it('reads --after and --last', () => {
    expect(parseMoveArgs(['MB.78', '--after', 'MB.12'])).toEqual({ id: 'MB.78', after: 'MB.12' });
    expect(parseMoveArgs(['MB.78', '--last'])).toEqual({ id: 'MB.78', last: true });
  });

  it.each([
    [[]],
    [['MB.78']],
    [['--last']],
    [['MB.78', '--after']],
    [['MB.78', '--after', '--last']],
    [['MB.78', '--last', '--after', 'MB.12']],
    [['MB.78', '--first']],
    [['MB.78', '--last', 'extra']],
  ])('refuses %j with the usage', (args) => {
    expect(() => parseMoveArgs(args)).toThrow(/usage:/);
  });
});

describe('planPlacement', () => {
  const issues = [
    issue(10, 'MB.1', 'Z. Bugfixes'),
    issue(11, 'M3.1', 'Wave 03 — Testwort'),
    issue(12, 'MB.2', 'Z. Bugfixes'),
    issue(13, 'MB.78', 'Z. Bugfixes'),
    issue(14, 'MB.3', 'Z. Bugfixes', 'CLOSED'),
    issue(15, 'M3.2', 'Wave 03 — Testwort'),
    issue(16, 'MB.9', null),
  ];
  // Board order: MB.1, MB.78, M3.1, MB.2, MB.3, M3.2.
  const listing = {
    projectId: 'P',
    items: [
      { id: 'i10', number: 10 },
      { id: 'i13', number: 13 },
      { id: 'i11', number: 11 },
      { id: 'i12', number: 12 },
      { id: 'i14', number: 14 },
      { id: 'i15', number: 15 },
      { id: 'i16', number: 16 },
      { id: 'draft', number: null },
    ],
  };
  const plan = (args: { id: string; after?: string; last?: boolean }) =>
    planPlacement({ issues, listing, ...args });

  it('--last moves the task after the last item on its own milestone, closed ones included', () => {
    expect(plan({ id: 'MB.78', last: true })).toEqual({
      projectId: 'P',
      move: { id: 'MB.78', itemId: 'i13', after: 'MB.3', afterId: 'i14' },
    });
  });

  it('--last plans nothing when the task already follows every item on its milestone', () => {
    expect(plan({ id: 'M3.2', last: true }).move).toBeNull();
  });

  it('--after moves the task directly after the named task', () => {
    expect(plan({ id: 'MB.78', after: 'MB.2' }).move).toEqual({
      id: 'MB.78',
      itemId: 'i13',
      after: 'MB.2',
      afterId: 'i12',
    });
  });

  it('--after plans nothing when the task already sits directly after it', () => {
    expect(plan({ id: 'MB.78', after: 'MB.1' }).move).toBeNull();
  });

  it('--after refuses a task on another milestone, the task itself, or one off the board', () => {
    expect(() => plan({ id: 'MB.78', after: 'M3.1' })).toThrow(/Wave 03/);
    expect(() => plan({ id: 'MB.78', after: 'MB.78' })).toThrow(BoardError);
    const offBoard = { projectId: 'P', items: listing.items.filter((item) => item.number !== 12) };
    expect(() => planPlacement({ issues, listing: offBoard, id: 'MB.78', after: 'MB.2' })).toThrow(
      /not on the Project/,
    );
  });

  it('refuses a task with no milestone, or alone on its milestone', () => {
    expect(() => plan({ id: 'MB.9', last: true })).toThrow(/no milestone/);
    const alone = [issue(20, 'MB.50', 'Z. Deferred'), ...issues];
    const withAlone = { projectId: 'P', items: [...listing.items, { id: 'i20', number: 20 }] };
    expect(() =>
      planPlacement({ issues: alone, listing: withAlone, id: 'MB.50', last: true }),
    ).toThrow(/only item/);
  });

  it('resolves both ids through the exact `<ID> — ` match', () => {
    expect(() => plan({ id: 'MB.7', last: true })).toThrow(/No tracked issue/);
    expect(() => plan({ id: 'MB.78', after: 'MB.99' })).toThrow(/No tracked issue/);
  });
});

// main(), with the reads answered from these fixtures.

const rawIssue = (
  number: number,
  id: string,
  milestoneTitle: string | null,
  state = 'open',
  reason: string | null = null,
) => ({
  number,
  title: `${id} — Testwort task`,
  state,
  state_reason: reason,
  html_url: `https://github.com/${REPO}/issues/${number}`,
  milestone: milestoneTitle ? { title: milestoneTitle } : null,
  labels: [{ name: 'tracked' }],
});

const rawMilestone = (number: number, title: string, state = 'open') => ({
  number,
  title,
  state,
  open_issues: 1,
  closed_issues: 0,
  description: '',
});

let rawIssues: ReturnType<typeof rawIssue>[];
let rawMilestones: ReturnType<typeof rawMilestone>[];

const isWrite = (args: string[]) =>
  args.includes('PATCH') || args.some((arg) => arg.includes('updateProjectV2ItemPosition'));
const writes = () => calls.filter(isWrite);

beforeEach(() => {
  calls.length = 0;
  rawIssues = [
    rawIssue(10, 'MB.1', 'Z. Bugfixes'),
    rawIssue(13, 'MB.78', 'Wave 03 — Testwort'),
    rawIssue(14, 'MB.3', 'Z. Bugfixes'),
    rawIssue(15, 'MB.4', 'Z. Bugfixes', 'closed', 'completed'),
  ];
  rawMilestones = [
    rawMilestone(1, 'Z. Bugfixes'),
    rawMilestone(2, 'Wave 03 — Testwort'),
    rawMilestone(3, 'Z. Deferred'),
    rawMilestone(4, 'Z. Deferred'),
    rawMilestone(9, 'Retired — not done', 'closed'),
  ];
  answer = (args) => {
    if (isWrite(args)) return {};
    const endpoint = args.find((arg) => arg.startsWith('repos/')) ?? '';
    if (endpoint.includes('/issues?')) return [rawIssues];
    if (endpoint.includes('/milestones?')) return [rawMilestones];
    if (args.some((arg) => arg.includes('projectV2(number'))) {
      const items = [10, 14, 13, 15].map((number) => ({ id: `i${number}`, content: { number } }));
      return [{ data: { organization: { projectV2: { id: 'P', items: { nodes: items } } } } }];
    }
    throw new Error(`unexpected gh call: ${args.join(' ')}`);
  };
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

describe('main: milestone', () => {
  it("sets the issue's milestone by the matched milestone's number", async () => {
    await main(['milestone', 'mb.78', 'Z. Bugfixes']);
    expect(writes()).toEqual([issueEditArgs({ number: 13 }, { milestone: 1 })]);
  });

  it('writes nothing when no milestone, or several, carry the title', async () => {
    await expect(main(['milestone', 'MB.78', 'Z. Bugfix'])).rejects.toThrow(/No open milestone/);
    await expect(main(['milestone', 'MB.78', 'Z. Deferred'])).rejects.toThrow(/#3, #4/);
    expect(writes()).toEqual([]);
  });

  it('writes nothing when the id matches no task, or the task is already there', async () => {
    await expect(main(['milestone', 'MB.7', 'Z. Bugfixes'])).rejects.toThrow(/No tracked issue/);
    await main(['milestone', 'MB.1', 'Z. Bugfixes']);
    expect(writes()).toEqual([]);
  });

  it('refuses missing arguments with the usage', async () => {
    await expect(main(['milestone', 'MB.78'])).rejects.toThrow(/usage:/);
  });
});

describe('main: retire', () => {
  it('closes the issue as not planned on the retired milestone in one write', async () => {
    await main(['retire', 'MB.78']);
    expect(writes()).toEqual([
      issueEditArgs({ number: 13 }, { milestone: 9, state: 'closed', state_reason: 'not_planned' }),
    ]);
  });

  it('refuses a task closed as completed, and writes nothing', async () => {
    await expect(main(['retire', 'MB.4'])).rejects.toThrow(/completed/);
    expect(writes()).toEqual([]);
  });

  it('writes nothing when the retired milestone is missing or doubled', async () => {
    rawMilestones = rawMilestones.filter((m) => m.number !== 9);
    await expect(main(['retire', 'MB.78'])).rejects.toThrow(/Retired — not done/);
    rawMilestones.push(
      rawMilestone(9, 'Retired — not done'),
      rawMilestone(10, 'Retired — not done'),
    );
    await expect(main(['retire', 'MB.78'])).rejects.toThrow(/#9, #10/);
    expect(writes()).toEqual([]);
  });

  it('writes nothing for a task already retired', async () => {
    rawIssues.push(rawIssue(16, 'MB.5', 'Retired — not done', 'closed', 'not_planned'));
    await main(['retire', 'MB.5']);
    expect(writes()).toEqual([]);
  });
});

describe('main: move', () => {
  it("makes reorder's position mutation once, after the milestone's last item", async () => {
    await main(['move', 'MB.1', '--last']);
    expect(writes()).toEqual([reorderMutationArgs('P', { itemId: 'i10', afterId: 'i15' })]);
  });

  it('writes nothing when the task is already in place', async () => {
    await main(['move', 'MB.3', '--after', 'MB.1']);
    expect(writes()).toEqual([]);
  });
});
