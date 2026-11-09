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
  planProjectPlacement,
  planReorder,
  reorderMutationArgs,
  shapeItem,
} = await import('../../scripts/task-board.mjs');
const { projectByNumber } = await import('../../scripts/task-projects.mjs');

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
  node_id: `I_${number}`,
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
  args[0] === 'project' ||
  ['PATCH', 'POST', 'DELETE'].some((method) => args.includes(method)) ||
  args.some((arg) => /^query=\s*mutation/.test(arg));

// The board: each issue's items, which the add, edit and delete stubs below change.
type BoardNode = ReturnType<typeof boardNode>;
const boardNode = (
  number: number,
  project: number,
  status: string | null,
  estimate: number | null,
) => ({
  id: `item-${project}-${number}`,
  project: { id: `P${project}`, number: project },
  status: status === null ? null : { name: status },
  estimate: estimate === null ? null : { number: estimate },
});
let board: Map<number, BoardNode[]>;
const STATUS_OPTIONS = ['Not Started', 'In Progress', 'In Review', 'Done'];
const projectMeta = (number: number) => ({
  id: `P${number}`,
  number,
  fields: {
    nodes: [
      {
        id: `F${number}-status`,
        name: 'Status',
        options: STATUS_OPTIONS.map((name) => ({ id: `O${number}-${name}`, name })),
      },
      { id: `F${number}-estimate`, name: 'Estimate' },
    ],
  },
});
const arg = (args: string[], key: string) =>
  args.find((candidate) => candidate.startsWith(`${key}=`))?.slice(key.length + 1) ?? '';

function writeBoard(args: string[]) {
  const query = arg(args, 'query');
  if (query.includes('addProjectV2ItemById')) {
    const number = Number(arg(args, 'contentId').replace('I_', ''));
    const project = Number(arg(args, 'projectId').slice(1));
    const node = boardNode(number, project, 'Not Started', null);
    board.set(number, [...(board.get(number) ?? []), node]);
    return { data: { addProjectV2ItemById: { item: { id: node.id } } } };
  }
  if (query.includes('deleteProjectV2Item')) {
    const itemId = arg(args, 'itemId');
    for (const [number, nodes] of board)
      board.set(
        number,
        nodes.filter((node) => node.id !== itemId),
      );
    return {};
  }
  if (args[0] === 'project') {
    const itemId = args[args.indexOf('--id') + 1];
    const node = [...board.values()].flat().find((candidate) => candidate.id === itemId);
    if (!node) throw new Error(`no item ${itemId}`);
    if (args.includes('--number'))
      node.estimate = { number: Number(args[args.indexOf('--number') + 1]) };
    else
      node.status = {
        name: args[args.indexOf('--single-select-option-id') + 1].replace(/^O\d+-/, ''),
      };
    return {};
  }
  return {};
}
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
  board = new Map();
  answer = (args) => {
    if (isWrite(args)) return writeBoard(args);
    const query = arg(args, 'query');
    if (query.includes(': projectV2(number:')) {
      const numbers = [...query.matchAll(/p(\d+): projectV2/g)].map((match) => Number(match[1]));
      return {
        data: { organization: Object.fromEntries(numbers.map((n) => [`p${n}`, projectMeta(n)])) },
      };
    }
    if (query.includes(': issue(number:')) {
      const numbers = [...query.matchAll(/i(\d+): issue/g)].map((match) => Number(match[1]));
      const repository = Object.fromEntries(
        numbers.map((n) => [`i${n}`, { projectItems: { nodes: board.get(n) ?? [] } }]),
      );
      return { data: { repository } };
    }
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

// Several Projects: every item read is scoped to the configured Projects, and a task is acted on where it sits.

const node = (
  number: number,
  status: string | null,
  estimate: number | null,
  id = `item-${number}`,
) => ({
  id,
  project: { id: `P${number}`, number, fields: { nodes: [] } },
  status: status === null ? null : { name: status },
  estimate: estimate === null ? null : { number: estimate },
});

describe('shapeItem', () => {
  it('answers the item on the one configured Project that holds the issue', () => {
    expect(shapeItem([node(9, 'Done', 1), node(4, 'In Progress', 2)])).toMatchObject({
      id: 'item-4',
      projectNumber: 4,
      status: 'In Progress',
      estimate: 2,
    });
  });

  it('answers null when no configured Project holds it', () => {
    expect(shapeItem([node(9, 'Done', 1)])).toBeNull();
  });

  it('refuses an issue on two configured Projects, naming `place`', () => {
    expect(() => shapeItem([node(1, 'Not Started', null), node(4, 'Done', 3)])).toThrow(/place/);
  });

  it('answers the item on a named Project', () => {
    expect(shapeItem([node(1, 'Done', 1), node(4, null, null)], 1)?.status).toBe('Done');
  });
});

describe('planProjectPlacement', () => {
  const issue = (milestone: string | null, labels: string[] = ['tracked']) => ({
    number: 30,
    nodeId: 'I_30',
    title: 'M18.1 — Testwort task',
    milestone,
    labels,
  });
  const item = (projectNumber: number, status: string | null, estimate: number | null) => ({
    id: `item-${projectNumber}`,
    projectNumber,
    status,
    estimate,
  });

  it("moves an item to its milestone's Project, carrying Status and Estimate, labelling it", () => {
    expect(
      planProjectPlacement(issue('Wave 18 — Privacy'), [item(1, 'In Review', 2.5)]),
    ).toMatchObject({
      id: 'M18.1',
      to: 4,
      from: [{ projectNumber: 1, itemId: 'item-1' }],
      add: true,
      status: 'In Review',
      estimate: 2.5,
      addLabels: ['v1-next'],
      removeLabels: [],
    });
  });

  it('plans nothing for an item already on its Project alone and labelled', () => {
    expect(
      planProjectPlacement(issue('Wave 18 — Privacy', ['tracked', 'v1-next']), [
        item(4, 'Done', 1),
      ]),
    ).toBeNull();
    expect(planProjectPlacement(issue('Wave 03 — Testwort'), [item(1, 'Done', 1)])).toBeNull();
  });

  it('finishes a move that stopped part-way: the furthest Status and the source Estimate win', () => {
    const plan = planProjectPlacement(issue('Wave 18 — Privacy', ['tracked', 'v1-next']), [
      item(1, 'In Progress', 3),
      item(4, 'Not Started', null),
    ]);
    expect(plan).toMatchObject({ add: false, status: 'In Progress', estimate: 3, addLabels: [] });
    expect(plan?.from).toEqual([{ projectNumber: 1, itemId: 'item-1' }]);
  });

  it("drops a copy the default Project's auto-add put back, keeping the moved item's values", () => {
    const plan = planProjectPlacement(issue('Wave 18 — Privacy', ['tracked', 'v1-next']), [
      item(1, 'Not Started', null),
      item(4, 'In Review', 2),
    ]);
    expect(plan).toMatchObject({ add: false, status: 'In Review', estimate: 2 });
  });

  it('moves an item back to the default Project and removes the other label', () => {
    const plan = planProjectPlacement(issue('Z. Bugfixes', ['tracked', 'v1-next']), [
      item(4, 'In Progress', 1),
    ]);
    expect(plan).toMatchObject({ to: 1, add: true, addLabels: [], removeLabels: ['v1-next'] });
  });

  it('adds a new issue to a Project with no auto-add, and leaves one for an auto-add alone', () => {
    expect(planProjectPlacement(issue('Wave 18 — Privacy'), [])).toMatchObject({
      to: 4,
      add: true,
      from: [],
      status: null,
      estimate: null,
    });
    expect(planProjectPlacement(issue('Wave 03 — Testwort'), [])).toBeNull();
  });

  it('leaves a retired task, or one with no milestone, on the Project that holds it', () => {
    expect(planProjectPlacement(issue('Retired — not done'), [item(4, 'Done', 1)])).toBeNull();
    expect(planProjectPlacement(issue(null), [item(1, 'Done', 1)])).toBeNull();
  });
});

describe('planReorder', () => {
  const tasks = {
    order: ['M3.1', 'M18.1'],
    waves: [
      { number: 3, ids: ['M3.1'] },
      { number: 18, ids: ['M18.1'] },
    ],
  };
  const issues = [issue(1, 'M3.1', 'Wave 03 — Testwort'), issue(2, 'M18.1', 'Wave 18 — Privacy')];
  const milestones = [milestone(1, 'Wave 03 — Testwort'), milestone(2, 'Wave 18 — Privacy')];

  it("orders only the waves of the Project it is given, against that Project's listing", () => {
    const one = planReorder({
      issues,
      milestones,
      tasks,
      listing: { projectId: 'P1', items: [{ id: 'i1', number: 1 }] },
      project: projectByNumber(1),
    });
    expect(one.target).toEqual(['M3.1']);
    expect(one.missing).toEqual([]);
    const four = planReorder({
      issues,
      milestones,
      tasks,
      listing: { projectId: 'P4', items: [] },
      project: projectByNumber(4),
    });
    expect(four.missing).toEqual(['row 18: M18.1 (#2) is not on Project 4']);
  });
});

describe('main: place', () => {
  beforeEach(() => {
    rawIssues = [
      rawIssue(30, 'M18.1', 'Wave 18 — Privacy'),
      rawIssue(31, 'M18.2', 'Wave 18 — Privacy', 'closed', 'completed'),
      rawIssue(32, 'M3.1', 'Wave 03 — Testwort'),
    ];
    board.set(30, [boardNode(30, 1, 'In Progress', 2.5)]);
    board.set(31, [boardNode(31, 1, 'Done', 1)]);
    board.set(32, [boardNode(32, 1, 'Not Started', 3)]);
  });

  it('writes nothing without --apply', async () => {
    await main(['place', '--all']);
    expect(writes()).toEqual([]);
    expect(board.get(30)?.map((node) => node.project.number)).toEqual([1]);
  });

  it("moves each issue to its milestone's Project with its Status and Estimate, closed ones too", async () => {
    await main(['place', '--all', '--apply']);
    for (const [number, status, estimate] of [
      [30, 'In Progress', 2.5],
      [31, 'Done', 1],
    ] as const) {
      expect(board.get(number)).toEqual([
        expect.objectContaining({
          project: { id: 'P4', number: 4 },
          status: { name: status },
          estimate: { number: estimate },
        }),
      ]);
    }
    expect(board.get(32)?.map((node) => node.project.number)).toEqual([1]);
    const labelled = writes().filter((args) => args.includes('POST'));
    expect(labelled.map((args) => args[3])).toEqual([
      `repos/${REPO}/issues/30/labels`,
      `repos/${REPO}/issues/31/labels`,
    ]);
  });

  it('removes nothing from the old Project when the new item does not hold the values', async () => {
    const realWrite = writeBoard;
    answer = ((original) => (args: string[]) => {
      if (args[0] === 'project') return {};
      return isWrite(args) ? realWrite(args) : original(args);
    })(answer);
    await expect(main(['place', 'M18.1', '--apply'])).rejects.toThrow(/Not verified.*M18\.1/);
    expect(board.get(30)?.map((node) => node.project.number)).toEqual([1, 4]);
  });

  it('finishes a stopped move on a second run, and a third run plans nothing', async () => {
    board.set(30, [boardNode(30, 1, 'In Progress', 2.5), boardNode(30, 4, 'Not Started', null)]);
    rawIssues[0].labels.push({ name: 'v1-next' });
    await main(['place', 'M18.1', '--apply']);
    expect(board.get(30)).toEqual([
      expect.objectContaining({
        project: { id: 'P4', number: 4 },
        status: { name: 'In Progress' },
        estimate: { number: 2.5 },
      }),
    ]);
    expect(
      writes().filter(
        (args) => args.includes('POST') || /addProjectV2ItemById/.test(arg(args, 'query')),
      ),
    ).toEqual([]);
    calls.length = 0;
    await main(['place', 'M18.1', '--apply']);
    expect(writes()).toEqual([]);
  });

  it('refuses ids together with --all, and an unknown flag', async () => {
    await expect(main(['place', 'M18.1', '--all'])).rejects.toThrow(/usage:/);
    await expect(main(['place', 'M18.1', '--force'])).rejects.toThrow(/usage:/);
    await expect(main(['place'])).rejects.toThrow(/usage:/);
  });
});

describe('main: milestone across Projects', () => {
  it("moves the issue onto the new milestone's Project", async () => {
    rawIssues.push(rawIssue(40, 'MB.40', 'Z. Bugfixes'));
    rawMilestones.push(rawMilestone(20, 'Z. Bugfixes — V1.Next'));
    board.set(40, [boardNode(40, 1, 'In Progress', 1)]);
    await main(['milestone', 'MB.40', 'Z. Bugfixes — V1.Next']);
    expect(board.get(40)).toEqual([
      expect.objectContaining({
        project: { id: 'P4', number: 4 },
        status: { name: 'In Progress' },
      }),
    ]);
  });
});

describe('main: move on a second Project', () => {
  it("reads the listing of the Project the task's milestone belongs to", async () => {
    rawIssues.push(rawIssue(50, 'M18.1', 'Wave 18 — Privacy'));
    await expect(main(['move', 'M18.1', '--last'])).rejects.toThrow(/only item|not on the Project/);
    const listing = calls.find((args) =>
      args.some((candidate) => candidate.includes('projectV2(number: $number)')),
    );
    expect(listing).toContain('number=4');
  });
});
