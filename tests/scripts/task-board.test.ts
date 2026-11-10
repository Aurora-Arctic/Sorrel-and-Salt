import { type MockInstance, beforeEach, describe, expect, it, vi } from 'vitest';

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

// The Project writes: Status and Estimate through `gh project item-edit`, and
// `place`'s adds and removals. The stub keeps a small board that the writes
// change, so a read after a write sees it, as GitHub's would.

type BoardItem = { id: string; project: number; status: string | null; estimate: number | null };

type Field = { id?: string; name?: string; options?: { id: string; name: string }[] };
const FIELDS = (project: number): Field[] => [
  {
    id: `F${project}-status`,
    name: 'Status',
    options: STATUS_NAMES.map((name) => ({ id: `O${project}-${name}`, name })),
  },
  { id: `F${project}-estimate`, name: 'Estimate' },
  {},
];
const STATUS_NAMES = ['Not Started', 'In Progress', 'In Review', 'Done'];
const PROJECT_IDS: Record<number, string> = { 1: 'P1', 4: 'P4', 9: 'P9' };

/** A `gh api graphql` call as its operation and variables, `-F` ones typed. */
function graphqlCall(args: string[]) {
  const variables: Record<string, string | number> = {};
  let query = '';
  for (let i = 2; i < args.length; i += 2) {
    const [key, ...value] = args[i + 1].split('=');
    const text = value.join('=');
    if (key === 'query') query = text;
    else variables[key] = args[i] === '-F' ? Number(text) : text;
  }
  const operation =
    /(updateProjectV2ItemPosition|addProjectV2ItemById|deleteProjectV2Item)\(/.exec(query)?.[1] ??
    'query';
  return { operation, variables, query };
}

const isGraphql = (args: string[]) => args[0] === 'api' && args[1] === 'graphql';

describe('the Project writes', () => {
  let board: Map<number, BoardItem[]>;
  let fieldsOf: (project: number) => unknown[];
  let editsTakeEffect: boolean;
  let added: number;
  let log: MockInstance;

  const node = (item: BoardItem) => ({
    id: item.id,
    project: {
      id: PROJECT_IDS[item.project],
      number: item.project,
      fields: { nodes: fieldsOf(item.project) },
    },
    status: item.status === null ? null : { name: item.status },
    estimate: item.estimate === null ? null : { number: item.estimate },
  });
  const nodesOf = (number: number) => ({
    projectItems: { nodes: (board.get(number) ?? []).map(node) },
  });

  function answerGraphql(args: string[]) {
    const { operation, variables, query } = graphqlCall(args);
    if (operation === 'addProjectV2ItemById') {
      added += 1;
      const project = Number(String(variables.projectId).slice(1));
      const number = Number(String(variables.contentId).replace('I_', ''));
      const id = `new${added}`;
      board.get(number)?.push({ id, project, status: 'Not Started', estimate: null });
      return { data: { addProjectV2ItemById: { item: { id } } } };
    }
    if (operation === 'deleteProjectV2Item') {
      for (const [number, items] of board) {
        board.set(
          number,
          items.filter((item) => item.id !== variables.itemId),
        );
      }
      return {};
    }
    const projects = [...query.matchAll(/p(\d+): projectV2\(number: (\d+)\)/g)];
    if (projects.length) {
      const organization = Object.fromEntries(
        projects
          .filter(([, number]) => PROJECT_IDS[Number(number)])
          .map(([, number]) => [
            `p${number}`,
            {
              id: PROJECT_IDS[Number(number)],
              number: Number(number),
              fields: { nodes: fieldsOf(Number(number)) },
            },
          ]),
      );
      return { data: { organization } };
    }
    const aliases = [...query.matchAll(/i(\d+): issue\(number: \d+\)/g)];
    if (aliases.length) {
      const repository = Object.fromEntries(
        aliases.map(([, number]) => [`i${number}`, nodesOf(Number(number))]),
      );
      return { data: { repository } };
    }
    if (query.includes('issue(number: $number)')) {
      return { data: { repository: { issue: nodesOf(Number(variables.number)) } } };
    }
    throw new Error(`unexpected graphql call: ${query}`);
  }

  function answerEdit(args: string[]) {
    const value = (flag: string) => args[args.indexOf(flag) + 1];
    if (!editsTakeEffect) return {};
    const item = [...board.values()].flat().find((candidate) => candidate.id === value('--id'));
    if (!item) throw new Error(`no item ${value('--id')}`);
    if (args.includes('--number')) item.estimate = Number(value('--number'));
    else item.status = value('--single-select-option-id').replace(/^O\d+-/, '');
    return {};
  }

  const rest = (args: string[]) => args[0] === 'api' && ['POST', 'DELETE'].includes(args[2]);
  const projectWrites = () =>
    calls
      .filter(
        (args) =>
          args[0] === 'project' ||
          rest(args) ||
          (isGraphql(args) && graphqlCall(args).operation !== 'query'),
      )
      .map((args) => {
        if (!isGraphql(args)) return args;
        const { operation, variables } = graphqlCall(args);
        return { operation, variables };
      });
  const edit = (itemId: string, projectId: string, field: string, value: string[]) => [
    'project',
    'item-edit',
    '--id',
    itemId,
    '--project-id',
    projectId,
    '--field-id',
    field,
    ...value,
  ];
  const output = () => log.mock.calls.map((call) => String(call[0]));

  beforeEach(() => {
    board = new Map([[13, [{ id: 'i13', project: 1, status: 'Not Started', estimate: null }]]]);
    fieldsOf = FIELDS;
    editsTakeEffect = true;
    added = 0;
    log = vi.spyOn(console, 'log').mockImplementation(() => {});
    rawIssues.push({ ...rawIssue(20, 'N1.1', 'N · Wave 01'), node_id: 'I_20' } as never);
    board.set(20, [{ id: 'i20', project: 1, status: 'In Progress', estimate: 2 }]);
    const rest = answer;
    answer = (args) => {
      if (args[0] === 'project') return answerEdit(args);
      if (isGraphql(args) && !args.some((arg) => arg.includes('projectV2(number: $number)'))) {
        return answerGraphql(args);
      }
      if (args[0] === 'api' && ['POST', 'DELETE'].includes(args[2])) return {};
      return rest(args);
    };
  });

  describe('reading the item', () => {
    it('asks for the issue by number, typed, in the configured repository', async () => {
      await main(['find', 'MB.78']);
      const reads = calls.filter(isGraphql).map(graphqlCall);
      expect(reads).toHaveLength(1);
      expect(reads[0].variables).toEqual({
        owner: 'Aurora-Arctic',
        name: 'Sorrel-and-Salt',
        number: 13,
      });
      expect(reads[0].query).toMatch(/fieldValueByName\(name: "Status"\)/);
      expect(reads[0].query).toMatch(/fieldValueByName\(name: "Estimate"\)/);
    });

    it("reports the item's Project and Status, ignoring a Project the board does not configure", async () => {
      board.get(13)?.unshift({ id: 'other', project: 9, status: 'Done', estimate: 1 });
      await main(['find', 'MB.78']);
      expect(JSON.parse(output()[0])).toMatchObject({
        number: 13,
        project: 1,
        status: 'Not Started',
      });
    });

    it('refuses an issue on two configured Projects, pointing at place', async () => {
      board.get(13)?.push({ id: 'i13b', project: 4, status: null, estimate: null });
      await expect(main(['status', 'MB.78', 'In Progress'])).rejects.toThrow(
        /Projects 1 and 4.*place/,
      );
      expect(projectWrites()).toEqual([]);
    });

    it('refuses an issue on no Project, naming the auto-add', async () => {
      board.set(13, []);
      await expect(main(['status', 'MB.78', 'In Progress'])).rejects.toThrow(/auto-add/);
      await expect(main(['status', 'N1.1', 'In Progress'])).resolves.toBeUndefined();
      board.set(20, []);
      await expect(main(['status', 'N1.1', 'In Review'])).rejects.toThrow(
        /not on Project 4 yet.*place/,
      );
    });
  });

  describe('status', () => {
    it("writes the target option of the item's own Status field", async () => {
      await main(['status', 'mb.78', 'In Progress']);
      expect(projectWrites()).toEqual([
        edit('i13', 'P1', 'F1-status', ['--single-select-option-id', 'O1-In Progress']),
      ]);
      expect(output()).toEqual(['MB.78: Not Started → In Progress']);
    });

    it('writes nothing for the status the item already has', async () => {
      await main(['status', 'MB.78', 'Not Started']);
      expect(projectWrites()).toEqual([]);
      expect(output()).toEqual(['MB.78: Not Started → Not Started (already there)']);
    });

    it('refuses a step back, Done, an unknown status and a missing option, writing nothing', async () => {
      board.set(13, [{ id: 'i13', project: 1, status: 'In Review', estimate: null }]);
      await expect(main(['status', 'MB.78', 'In Progress'])).rejects.toThrow(/step back/);
      await expect(main(['status', 'MB.78', 'Done'])).rejects.toThrow(/set by the merge/);
      await expect(main(['status', 'MB.78', 'Started'])).rejects.toThrow(/Unknown status/);
      board.set(13, [{ id: 'i13', project: 1, status: null, estimate: null }]);
      fieldsOf = (project) =>
        FIELDS(project).map((field) =>
          field.options
            ? { ...field, options: field.options.filter((o) => o.name !== 'In Review') }
            : field,
        );
      await expect(main(['status', 'MB.78', 'In Review'])).rejects.toThrow(/has no "In Review"/);
      expect(projectWrites()).toEqual([]);
    });

    it('moves an unset Status to any state but Done', async () => {
      board.set(13, [{ id: 'i13', project: 1, status: null, estimate: null }]);
      await main(['status', 'MB.78', 'In Review']);
      expect(projectWrites()).toEqual([
        edit('i13', 'P1', 'F1-status', ['--single-select-option-id', 'O1-In Review']),
      ]);
      expect(output()).toEqual(['MB.78: (unset) → In Review']);
    });
  });

  describe('estimate', () => {
    it("writes the hours as a number to the item's Estimate field", async () => {
      await main(['estimate', 'MB.78', '2.5']);
      expect(projectWrites()).toEqual([edit('i13', 'P1', 'F1-estimate', ['--number', '2.5'])]);
      expect(output()).toEqual(['MB.78: (unset) → 2.5h']);
    });

    it('writes nothing for the estimate the item already has', async () => {
      await main(['estimate', 'N1.1', '2']);
      expect(projectWrites()).toEqual([]);
      expect(output()).toEqual(['N1.1: 2 → 2h (already there)']);
    });

    it('refuses hours that are not a number of hours, and a Project with no Estimate field', async () => {
      await expect(main(['estimate', 'MB.78', '-1'])).rejects.toThrow(/number of hours/);
      await expect(main(['estimate', 'MB.78', 'three'])).rejects.toThrow(/number of hours/);
      fieldsOf = (project) => FIELDS(project).filter((field) => field.name !== 'Estimate');
      await expect(main(['estimate', 'MB.78', '3'])).rejects.toThrow(
        /Project 1 has no "Estimate" field/,
      );
      expect(projectWrites()).toEqual([]);
    });
  });

  describe('place --apply', () => {
    it('labels, adds, carries Status and Estimate, then removes the old item, in that order', async () => {
      await main(['place', 'N1.1', '--apply']);
      expect(projectWrites()).toEqual([
        ['api', '-X', 'POST', `repos/${REPO}/issues/20/labels`, '-f', 'labels[]=v1-next'],
        { operation: 'addProjectV2ItemById', variables: { projectId: 'P4', contentId: 'I_20' } },
        edit('new1', 'P4', 'F4-status', ['--single-select-option-id', 'O4-In Progress']),
        edit('new1', 'P4', 'F4-estimate', ['--number', '2']),
        { operation: 'deleteProjectV2Item', variables: { projectId: 'P1', itemId: 'i20' } },
      ]);
      expect(board.get(20)).toEqual([
        { id: 'new1', project: 4, status: 'In Progress', estimate: 2 },
      ]);
    });

    it('carries Done, which status refuses to set by hand', async () => {
      board.set(20, [{ id: 'i20', project: 1, status: 'Done', estimate: null }]);
      await main(['place', 'N1.1', '--apply']);
      expect(projectWrites()).toContainEqual(
        edit('new1', 'P4', 'F4-status', ['--single-select-option-id', 'O4-Done']),
      );
      expect(board.get(20)).toEqual([{ id: 'new1', project: 4, status: 'Done', estimate: null }]);
    });

    it('writes only what differs on an item already on the target Project', async () => {
      board.set(20, [
        { id: 'i20', project: 1, status: 'In Review', estimate: 3 },
        { id: 'j20', project: 4, status: 'In Progress', estimate: 3 },
      ]);
      await main(['place', 'N1.1', '--apply']);
      expect(projectWrites()).toEqual([
        ['api', '-X', 'POST', `repos/${REPO}/issues/20/labels`, '-f', 'labels[]=v1-next'],
        edit('j20', 'P4', 'F4-status', ['--single-select-option-id', 'O4-In Review']),
        { operation: 'deleteProjectV2Item', variables: { projectId: 'P1', itemId: 'i20' } },
      ]);
    });

    it('keeps the old item when the written values do not read back', async () => {
      editsTakeEffect = false;
      await expect(main(['place', 'N1.1', '--apply'])).rejects.toThrow(/Not verified.*N1\.1/);
      expect(
        projectWrites().filter(
          (write) => 'operation' in write && write.operation === 'deleteProjectV2Item',
        ),
      ).toEqual([]);
      expect(board.get(20)?.map((item) => item.project)).toEqual([1, 4]);
    });

    it('refuses a target Project whose Status lacks the carried option, before removing anything', async () => {
      fieldsOf = (project) =>
        FIELDS(project).map((field) =>
          field.options && project === 4
            ? { ...field, options: field.options.filter((o) => o.name !== 'In Progress') }
            : field,
        );
      await expect(main(['place', 'N1.1', '--apply'])).rejects.toThrow(
        /Status has no "In Progress"/,
      );
      expect(
        projectWrites().some(
          (write) => 'operation' in write && write.operation === 'deleteProjectV2Item',
        ),
      ).toBe(false);
    });

    it('reads the items fifty issues a query, each by number in the configured repository', async () => {
      for (let number = 100; number < 151; number++)
        rawIssues.push(rawIssue(number, `MB.${number}`, 'Z. Bugfixes'));
      await main(['place', '--all']);
      const reads = calls.filter(isGraphql).map(graphqlCall);
      expect(reads.map((read) => read.variables)).toEqual([
        { owner: 'Aurora-Arctic', name: 'Sorrel-and-Salt' },
        { owner: 'Aurora-Arctic', name: 'Sorrel-and-Salt' },
      ]);
      expect(reads.map((read) => read.query.match(/i\d+: issue/g)?.length)).toEqual([
        50,
        rawIssues.length - 50,
      ]);
      expect(projectWrites()).toEqual([]);
    });
  });

  describe('the reorder mutation’s arguments', () => {
    it('sends the position mutation its ids as string variables', () => {
      expect(graphqlCall(reorderMutationArgs('P', { itemId: 'a', afterId: 'b' }))).toMatchObject({
        operation: 'updateProjectV2ItemPosition',
        variables: { projectId: 'P', itemId: 'a', afterId: 'b' },
      });
    });
  });
});
