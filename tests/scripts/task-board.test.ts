import { describe, expect, it } from 'vitest';
import {
  BoardError,
  findIssue,
  planMoves,
  planReorder,
  reorderMutationArgs,
  requireItem,
  setStatus,
  shapeItem,
  shapeItems,
  shapeIssue,
  shapeMilestone,
  shapeTracked,
} from '../../scripts/task-board.mjs';
import { readTasksMd } from '../../scripts/tasks-md.mjs';

// The pure half of the board script: what REST and the one Project query
// answer is reshaped here, and the refusals that need no `gh` are decided
// here. Nothing in this file runs `gh` (claude-docs/task-tracking.md).

/** A REST issue, as `gh api repos/…/issues` lists it. */
function restIssue(overrides: Record<string, unknown> = {}) {
  return {
    number: 295,
    title: 'M4.8 — DataLoader base plus categoriesByIngredient',
    state: 'open',
    state_reason: null,
    html_url: 'https://github.com/Aurora-Arctic/Sorrel-and-Salt/issues/295',
    milestone: { title: 'Wave 08 — Compendium and admin' },
    labels: [{ name: 'tracked' }],
    ...overrides,
  };
}

describe('shapeIssue', () => {
  // The skills and project-progress read the GraphQL spellings the script
  // printed before the lookup moved to REST, so REST's are normalised.
  it('keeps the shape the skills read, with upper-case state spellings', () => {
    expect(shapeIssue(restIssue())).toEqual({
      number: 295,
      title: 'M4.8 — DataLoader base plus categoriesByIngredient',
      state: 'OPEN',
      stateReason: null,
      url: 'https://github.com/Aurora-Arctic/Sorrel-and-Salt/issues/295',
      milestone: 'Wave 08 — Compendium and admin',
      labels: ['tracked'],
    });
  });

  it.each([
    ['closed', 'completed', 'CLOSED', 'COMPLETED'],
    ['closed', 'not_planned', 'CLOSED', 'NOT_PLANNED'],
    ['open', 'reopened', 'OPEN', 'REOPENED'],
  ])('maps state %s / %s to %s / %s', (state, reason, expectedState, expectedReason) => {
    const shaped = shapeIssue(restIssue({ state, state_reason: reason }));

    expect(shaped.state).toBe(expectedState);
    expect(shaped.stateReason).toBe(expectedReason);
  });

  it('answers null for a missing milestone and an empty list for no labels', () => {
    const shaped = shapeIssue(restIssue({ milestone: null, labels: [] }));

    expect(shaped.milestone).toBeNull();
    expect(shaped.labels).toEqual([]);
  });
});

describe('shapeTracked', () => {
  // `--paginate --slurp` answers an array of pages; the issues endpoint lists
  // pull requests among issues, and a labelled PR would otherwise read as a task.
  it('flattens the pages and drops pull requests', () => {
    const pages = [
      [restIssue({ number: 1 }), restIssue({ number: 2, pull_request: { url: 'x' } })],
      [restIssue({ number: 3 })],
    ];

    expect(shapeTracked(pages).map((issue) => issue.number)).toEqual([1, 3]);
  });
});

describe('findIssue', () => {
  const issues = [
    shapeIssue(restIssue({ number: 10, title: 'M2.1 — Sign-in page' })),
    shapeIssue(restIssue({ number: 11, title: 'M2.10 — Sign-out everywhere' })),
  ];

  // Thirty of the board's ids are a strict prefix of another; the dash is
  // what keeps `M2.1` from matching `M2.10`.
  it('matches the id up to the dash, so a strict prefix is not a match', () => {
    expect(findIssue('M2.1', issues).number).toBe(10);
    expect(findIssue('m2.10', issues).number).toBe(11);
  });

  it('refuses zero matches and several, never guessing', () => {
    expect(() => findIssue('M2.2', issues)).toThrow(BoardError);
    expect(() =>
      findIssue('M2.1', [...issues, shapeIssue(restIssue({ number: 12, title: 'M2.1 — Twin' }))]),
    ).toThrow(/2 tracked issues/);
  });
});

/** One `projectItems` node, as the query answers it. */
function itemNode(overrides: Record<string, unknown> = {}) {
  return {
    id: 'PVTI_item',
    project: {
      id: 'PVT_project',
      number: 1,
      fields: {
        nodes: [
          { id: 'F_status', name: 'Status', options: [{ id: 'O_ns', name: 'Not Started' }] },
          { id: 'F_estimate', name: 'Estimate' },
          {},
        ],
      },
    },
    status: { name: 'Not Started' },
    estimate: { number: 3 },
    ...overrides,
  };
}

describe('shapeItem', () => {
  it("picks this Project's item off the issue and reads its fields", () => {
    const item = shapeItem(
      [itemNode({ project: { ...itemNode().project, number: 2 } }), itemNode()],
      '1',
    );

    expect(item).toMatchObject({
      id: 'PVTI_item',
      projectId: 'PVT_project',
      status: 'Not Started',
      estimate: 3,
    });
    // The unnamed node is a field type the query did not spell out; it carries nothing.
    expect(item?.fields.map((field) => field.name)).toEqual(['Status', 'Estimate']);
  });

  it('answers null when the issue is on no Project, or not this one', () => {
    expect(shapeItem([], '1')).toBeNull();
    expect(
      shapeItem([itemNode({ project: { ...itemNode().project, number: 2 } })], '1'),
    ).toBeNull();
  });

  it('answers null values for fields the workflows have not set yet', () => {
    expect(shapeItem([itemNode({ status: null, estimate: null })], '1')).toMatchObject({
      status: null,
      estimate: null,
    });
  });
});

describe('requireItem', () => {
  const issue = shapeIssue(restIssue());

  it('hands back the item when there is one', () => {
    const item = shapeItem([itemNode()], '1');

    expect(requireItem(issue, item)).toBe(item);
  });

  // The auto-add workflow places every tracked issue; the script never adds
  // one itself, so the only answer to "not there yet" is to say so.
  it('refuses an issue the auto-add has not placed, naming the workflow', () => {
    expect(() => requireItem(issue, null)).toThrow(/auto-add/);
    expect(() => requireItem(issue, null)).toThrow(BoardError);
  });
});

describe('setStatus refusals, decided before any write', () => {
  const issue = shapeIssue(restIssue());
  const at = (status: string) => shapeItem([itemNode({ status: { name: status } })], '1');

  it('refuses a status the field does not carry', () => {
    expect(() => setStatus(issue, 'Blocked', { item: at('Not Started') })).toThrow(BoardError);
  });

  it("refuses Done, which is the merge's", () => {
    expect(() => setStatus(issue, 'Done', { item: at('In Review') })).toThrow(/merge/);
  });

  it('refuses a step back', () => {
    expect(() => setStatus(issue, 'In Progress', { item: at('In Review') })).toThrow(/step back/);
  });

  it('is a no-op when already there', () => {
    expect(setStatus(issue, 'In Review', { item: at('In Review') })).toEqual({
      from: 'In Review',
      to: 'In Review',
      changed: false,
    });
  });
});

/** A REST milestone, as `gh api repos/…/milestones` lists it. */
function restMilestone(overrides: Record<string, unknown> = {}) {
  return {
    number: 8,
    title: 'Wave 08 — Compendium and admin',
    state: 'open',
    open_issues: 33,
    closed_issues: 15,
    description: 'M4.5 · MB.91\n\nWhy here.',
    ...overrides,
  };
}

describe('shapeMilestone', () => {
  it('reads the counts the done-wave rule needs, and the description', () => {
    expect(shapeMilestone(restMilestone())).toEqual({
      number: 8,
      title: 'Wave 08 — Compendium and admin',
      state: 'open',
      openIssues: 33,
      closedIssues: 15,
      description: 'M4.5 · MB.91\n\nWhy here.',
    });
  });

  it('reads a missing description as empty', () => {
    expect(shapeMilestone(restMilestone({ description: null })).description).toBe('');
  });
});

/** One page of the items listing, as `gh api graphql --paginate --slurp` answers it. */
function itemsPage(nodes: Record<string, unknown>[]) {
  return { data: { organization: { projectV2: { id: 'PVT_project', items: { nodes } } } } };
}

describe('shapeItems', () => {
  // Position is only observable as listing order, so the order across pages
  // is the whole point; a draft or a pull request carries no issue number.
  it('keeps position order across pages and numbers only the issues', () => {
    const pages = [
      itemsPage([
        { id: 'PVTI_1', content: { number: 11 } },
        { id: 'PVTI_2', content: {} },
      ]),
      itemsPage([
        { id: 'PVTI_3', content: { number: 13 } },
        { id: 'PVTI_4', content: null },
      ]),
    ];

    expect(shapeItems(pages)).toEqual({
      projectId: 'PVT_project',
      items: [
        { id: 'PVTI_1', number: 11 },
        { id: 'PVTI_2', number: null },
        { id: 'PVTI_3', number: 13 },
        { id: 'PVTI_4', number: null },
      ],
    });
  });
});

/** Replays a plan on a list of item ids: take the item out, put it back after `afterId`. */
function replay(list: string[], moves: { itemId: string; afterId: string | null }[]) {
  const order = [...list];
  for (const { itemId, afterId } of moves) {
    order.splice(order.indexOf(itemId), 1);
    order.splice(afterId === null ? 0 : order.indexOf(afterId) + 1, 0, itemId);
  }
  return order;
}

const DONE = ['done1', 'done2', 'done3'];

/** The plan for a board, given the considered items' target order; positions are read off the board. */
function planFor(board: string[], target: string[]) {
  return planMoves(
    target.map((itemId) => ({ id: itemId.toUpperCase(), itemId, position: board.indexOf(itemId) })),
  );
}

describe('planMoves', () => {
  it('makes no move when the considered items already sit in relative order', () => {
    expect(planFor([...DONE, 'a', 'x', 'b', 'c'], ['a', 'b', 'c'])).toEqual([]);
    expect(planFor(DONE, [])).toEqual([]);
    expect(planFor([...DONE, 'a'], ['a'])).toEqual([]);
  });

  it('moves only what is out of place, each after its predecessor in target order', () => {
    const board = [...DONE, 'c', 'a', 'b'];
    const moves = planFor(board, ['a', 'b', 'c']);

    expect(moves).toEqual([{ id: 'C', itemId: 'c', after: 'B', afterId: 'b' }]);
    expect(replay(board, moves)).toEqual([...DONE, 'a', 'b', 'c']);
  });

  it('takes n − 1 moves for a reversed board and never moves the anchor', () => {
    const board = [...DONE, 'e', 'd', 'c', 'b', 'a'];
    const moves = planFor(board, ['a', 'b', 'c', 'd', 'e']);

    expect(moves.map((move) => move.itemId)).toEqual(['b', 'c', 'd', 'e']);
    expect(moves.map((move) => move.afterId)).toEqual(['a', 'b', 'c', 'd']);
    expect(replay(board, moves)).toEqual([...DONE, 'a', 'b', 'c', 'd', 'e']);
  });

  // The first item in target order is the anchor: it stays where it sits and
  // the rest line up behind it, so no move is ever "to the top" and nothing
  // climbs above the done waves the plan leaves alone. Without that rule the
  // longest ordered run would keep `b` and `c` and send `a` to the top — the
  // hand-written plan below — which the same replay exposes.
  it('keeps the anchor where it sits, so nothing climbs above the items left alone', () => {
    const board = ['done1', 'done2', 'b', 'c', 'done3', 'a'];
    const moves = planFor(board, ['a', 'b', 'c']);
    const withoutAnchorRule = [{ itemId: 'a', afterId: null }];

    expect(moves.map((move) => move.itemId)).not.toContain('a');
    expect(moves.every((move) => move.afterId !== null)).toBe(true);
    expect(replay(board, moves)).toEqual(['done1', 'done2', 'done3', 'a', 'b', 'c']);
    expect(replay(board, withoutAnchorRule)).toEqual(['a', 'done1', 'done2', 'b', 'c', 'done3']);
  });
});

describe('reorderMutationArgs', () => {
  it('passes every id as a variable and selects nothing but the mutation id', () => {
    const args = reorderMutationArgs('PVT_p', {
      id: 'M8.2',
      itemId: 'PVTI_i',
      after: 'M8.1',
      afterId: 'PVTI_a',
    });
    const query = args.find((arg) => arg.startsWith('query=')) ?? '';

    expect(args.slice(0, 2)).toEqual(['api', 'graphql']);
    expect(args).toEqual(
      expect.arrayContaining([
        '-f',
        'projectId=PVT_p',
        '-f',
        'itemId=PVTI_i',
        '-f',
        'afterId=PVTI_a',
      ]),
    );
    expect(query).toContain('updateProjectV2ItemPosition');
    expect(query).toContain('clientMutationId');
    expect(query).not.toContain('items');
    expect(query).not.toContain('PVT');
  });
});

describe('planReorder', () => {
  const tasks = readTasksMd(
    [
      '| **1 — FK root** | M2.2 · M2.3 | prose |',
      '| **8 — Compendium and admin** | M4.5 · MB.37 · M8.2 · M5.1 | prose |',
      '| **9 — Workspaces** | M6.1 · M6.7 | prose |',
      '| **12 — Ingredient UI** | M8.9 | prose |',
      '**M0.1 — Scaffold** · 1h',
      '**M2.2 — Better Auth** · 1h',
      '**M2.3 — Users table** · 1h',
      '**M4.5 — Zod schemas** · 1h',
      '**M5.1 — Scaffold 17–18** · 1h',
      '**M6.1 — Scaffold 3–13** · 1h',
      '**M6.7 — Create a workspace** · 1h',
      '**M8.2 — Local ingredient service** · 1h',
      '**MB.10 — usersById loader** · 1h',
    ].join('\n'),
  );
  const issue = (number: number, title: string, milestone: string) =>
    shapeIssue(restIssue({ number, title, milestone: { title: milestone } }));
  const issues = [
    issue(1, 'M0.1 — Scaffold', 'M0 · Repo bootstrap'),
    issue(2, 'M2.2 — Better Auth', 'Wave 01 — FK root'),
    issue(3, 'M2.3 — Users table', 'Wave 01 — FK root'),
    issue(4, 'M4.5 — Zod schemas', 'Wave 08 — Compendium and admin'),
    issue(5, 'M8.2 — Local ingredient service', 'Wave 09 — Workspaces'),
    issue(6, 'M5.1 — Scaffold 17–18', 'Wave 08 — Compendium and admin'),
    issue(7, 'M6.1 — Scaffold 3–13', 'Wave 09 — Workspaces'),
    issue(8, 'M6.7 — Create a workspace', 'Wave 09 — Workspaces'),
    issue(9, 'MB.10 — usersById loader', 'Wave 09 — Workspaces'),
    issue(10, 'M1.29 — [RETIRED] Compress', 'Retired — not done'),
  ];
  const milestone = (title: string, overrides: Record<string, unknown>) =>
    shapeMilestone(restMilestone({ title, ...overrides }));
  const milestones = [
    milestone('M0 · Repo bootstrap', { state: 'closed', open_issues: 0 }),
    milestone('Wave 01 — FK root', { state: 'open', open_issues: 0 }),
    milestone('Wave 08 — Compendium and admin', {
      open_issues: 2,
      description: 'M4.5 · MB.37 · M8.2 · M5.1\n\nprose',
    }),
    milestone('Wave 09 — Workspaces', { open_issues: 3, description: 'M6.7 · M6.1\n\nprose' }),
    milestone('Retired — not done', { state: 'closed', open_issues: 0 }),
  ];
  // Current position order: the done and retired items interleaved with the open waves'.
  const listing = shapeItems([
    itemsPage(
      [10, 1, 2, 3, 9, 8, 6, 4, 7, 5].map((number) => ({
        id: `PVTI_${number}`,
        content: { number },
      })),
    ),
  ]);
  const plan = planReorder({ issues, milestones, listing, tasks });

  it('orders the open waves by their rows and leaves the done ones where they sit', () => {
    expect(plan.projectId).toBe('PVT_project');
    expect(plan.target).toEqual(['M4.5', 'M8.2', 'M5.1', 'M6.1', 'M6.7', 'MB.10']);
    expect(plan.considered).toBe(6);
    expect(plan.skipped).toEqual([
      expect.stringContaining('Wave 01 — FK root'),
      expect.stringContaining('Wave 12'),
    ]);
  });

  it('reports every way the rows and the board disagree, and still plans around it', () => {
    expect(plan.missing).toEqual([expect.stringContaining('MB.37')]);
    expect(plan.misplaced).toEqual([expect.stringMatching(/M8\.2.*Wave 09/)]);
    expect(plan.unlisted).toEqual([expect.stringMatching(/Wave 09.*MB\.10/)]);
    expect(plan.descriptions).toEqual([expect.stringContaining('Wave 09')]);
  });

  it('plans the minimal moves, which replayed put the open waves in target order', () => {
    const board = listing.items.map((item) => item.id);
    const considered = new Set(
      plan.target.map((id) => `PVTI_${issues.find((i) => i.title.startsWith(`${id} — `))?.number}`),
    );

    expect(plan.moves.length).toBe(4);
    expect(plan.moves.map((move) => move.itemId)).not.toContain('PVTI_4');
    expect(replay(board, plan.moves).filter((id) => considered.has(id))).toEqual([
      'PVTI_4',
      'PVTI_5',
      'PVTI_6',
      'PVTI_7',
      'PVTI_8',
      'PVTI_9',
    ]);
    // The retired item at the top stays at the top: nothing is moved above it.
    expect(replay(board, plan.moves)[0]).toBe('PVTI_10');
  });
});
