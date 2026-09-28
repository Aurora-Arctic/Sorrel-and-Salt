import { describe, expect, it } from 'vitest';
import {
  BoardError,
  findIssue,
  requireItem,
  setStatus,
  shapeItem,
  shapeIssue,
  shapeTracked,
} from '../../scripts/task-board.mjs';

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
