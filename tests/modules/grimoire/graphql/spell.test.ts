import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { A, B, C, D, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { insertSpell } from '../../../support/db/insert-spell';
import { makeIngredient, makeSpell, makeVariant } from '../../../support/fixtures';
import { run } from '../../../support/graphql/run';

// The grimoire over the wire (M10.9): `grimoire`'s pages, `spell` and the
// fields a spell resolves through its loaders, and one refusal per code. Who
// may read which spell is services/spell-reads.test.ts's; this file holds what
// the transport adds — the shape, the order, the gaps worked out from the two
// category lists, and a page of spells costing the same reads as one.
const repository = vi.hoisted(() => ({
  findGrimoirePage: vi.fn(),
  findManyInSpells: vi.fn(),
  findIngredientsInSpellsIncludingSoftDeleted: vi.fn(),
  findManyOfSpellIngredientsIncludingSoftDeleted: vi.fn(),
  findFormsInSpellsIncludingSoftDeleted: vi.fn(),
  findManyByIds: vi.fn(),
}));
vi.mock('@/db/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/repository')>();
  for (const [name, spy] of Object.entries(repository)) {
    spy.mockImplementation(actual[name as keyof typeof repository]);
  }
  return { ...actual, ...repository };
});

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate spells, ingredients cascade`;
  for (const spy of Object.values(repository)) spy.mockClear();
});

const SPELL = `
  id title intent visibility status note
  categories { name }
  derivedCategories { name }
  categoryGaps { intendedNotPresent { name } presentNotIntended { name } }
  steps { position body name form quantity unit note ingredient { id } variant { form } }
  audit { createdBy }
`;

const ONE = `query ($workspaceId: ID!, $id: ID!) { spell(workspaceId: $workspaceId, id: $id) { ${SPELL} } }`;

const PAGE = `query (
  $workspaceId: ID!
  $first: Int
  $after: String
  $orderBy: GrimoireOrder
  $status: SpellStatus
  $query: String
) {
  grimoire(
    workspaceId: $workspaceId
    first: $first
    after: $after
    orderBy: $orderBy
    status: $status
    query: $query
  ) {
    edges { node { ${SPELL} } }
    pageInfo { hasNextPage endCursor }
  }
}`;

type SpellNode = {
  id: string;
  title: string | null;
  categories: { name: string }[];
  derivedCategories: { name: string }[];
  categoryGaps: {
    intendedNotPresent: { name: string }[];
    presentNotIntended: { name: string }[];
  };
  steps: {
    position: number;
    body: string | null;
    name: string | null;
    form: string | null;
    quantity: number | null;
    unit: string | null;
    ingredient: { id: string } | null;
    variant: { form: string } | null;
  }[];
};
type Page = {
  grimoire: {
    edges: { node: SpellNode }[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
};

/** A coven ingredient of W, its one form filed under `formCategories`. */
function ingredient(name: string, categories: string[], formCategories: string[] = []) {
  return insertIngredient(
    sql,
    makeIngredient({
      workspaceId: WORKSPACE_W_ID,
      name,
      nomenclature: 'none',
      categories,
      variants: [makeVariant({ form: 'Testform', categories: formCategories })],
    }),
    A.id,
  );
}

const names = (rows: { name: string }[]) => rows.map((row) => row.name);

describe('spell', () => {
  it('answers the recipe in order and both kinds of category, with the gap each way', async () => {
    const root = await ingredient('Testroot', ['Protection'], ['Banishing']);
    const id = await insertSpell(
      sql,
      makeSpell({
        workspaceId: WORKSPACE_W_ID,
        title: 'Testing Jar',
        categories: ['Protection', 'Release'],
        steps: [
          { body: 'Stir three times.' },
          { ingredientId: root, quantity: '2', unit: 'tsp' },
          { name: 'River Water', form: 'Bottled' },
        ],
      }),
      B.id,
    );

    const result = await run<{ spell: SpellNode }>(asUser(C), ONE, {
      workspaceId: WORKSPACE_W_ID,
      id,
    });

    expect(result.errors).toBeUndefined();
    const spell = result.data!.spell;
    expect(spell.title).toBe('Testing Jar');
    expect(spell.steps).toEqual([
      expect.objectContaining({
        position: 1,
        body: 'Stir three times.',
        name: null,
        ingredient: null,
      }),
      expect.objectContaining({
        position: 2,
        name: 'Testroot',
        form: 'Testform',
        quantity: 2,
        unit: 'tsp',
        ingredient: { id: root },
        variant: { form: 'Testform' },
      }),
      expect.objectContaining({ position: 3, name: 'River Water', form: 'Bottled', variant: null }),
    ]);
    expect(names(spell.categories)).toEqual(['Protection', 'Release']);
    expect(names(spell.derivedCategories)).toEqual(['Banishing', 'Protection']);
    expect(names(spell.categoryGaps.intendedNotPresent)).toEqual(['Release']);
    expect(names(spell.categoryGaps.presentNotIntended)).toEqual(['Banishing']);
  });

  it('answers NOT_FOUND for another author’s private spell, and FORBIDDEN outside the coven', async () => {
    const hidden = await insertSpell(
      sql,
      makeSpell({ workspaceId: WORKSPACE_W_ID, visibility: 'private' }),
      B.id,
    );
    // Why each refusal could have succeeded: the spell is there for its author.
    const own = await run<{ spell: SpellNode }>(asUser(B), ONE, {
      workspaceId: WORKSPACE_W_ID,
      id: hidden,
    });
    expect(own.data?.spell.id).toBe(hidden);

    const other = await run(asUser(A), ONE, { workspaceId: WORKSPACE_W_ID, id: hidden });
    expect(other.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
    const outsider = await run(asUser(D), ONE, { workspaceId: WORKSPACE_W_ID, id: hidden });
    expect(outsider.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    const elsewhere = await run(asUser(D), ONE, { workspaceId: WORKSPACE_X_ID, id: hidden });
    expect(elsewhere.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
  });
});

describe('grimoire', () => {
  it('pages last edited first by default, leaving out another author’s private spell', async () => {
    const titles = ['First Working', 'Second Working', 'Third Working'];
    for (const title of titles) {
      await insertSpell(sql, makeSpell({ workspaceId: WORKSPACE_W_ID, title }), B.id);
    }
    await insertSpell(
      sql,
      makeSpell({ workspaceId: WORKSPACE_W_ID, title: 'Private Working', visibility: 'private' }),
      B.id,
    );

    const first = await run<Page>(asUser(A), PAGE, { workspaceId: WORKSPACE_W_ID, first: 2 });
    expect(first.errors).toBeUndefined();
    expect(first.data!.grimoire.edges.map((edge) => edge.node.title)).toEqual([
      'Third Working',
      'Second Working',
    ]);
    expect(first.data!.grimoire.pageInfo.hasNextPage).toBe(true);

    const second = await run<Page>(asUser(A), PAGE, {
      workspaceId: WORKSPACE_W_ID,
      first: 2,
      after: first.data!.grimoire.pageInfo.endCursor,
    });
    expect(second.data!.grimoire.edges.map((edge) => edge.node.title)).toEqual(['First Working']);
    expect(second.data!.grimoire.pageInfo.hasNextPage).toBe(false);
  });

  it('takes the order and the status it is asked for', async () => {
    for (const [title, status] of [
      ['Cedar Knot', 'complete'],
      ['Alder Jar', 'complete'],
      ['Birch Charm', 'draft'],
    ] as const) {
      await insertSpell(sql, makeSpell({ workspaceId: WORKSPACE_W_ID, title, status }), B.id);
    }
    const titles = (page: { data?: Page | null }) =>
      page.data!.grimoire.edges.map((edge) => edge.node.title);

    const byTitle = await run<Page>(asUser(A), PAGE, {
      workspaceId: WORKSPACE_W_ID,
      orderBy: 'TITLE_ASC',
    });
    expect(byTitle.errors).toBeUndefined();
    expect(titles(byTitle)).toEqual(['Alder Jar', 'Birch Charm', 'Cedar Knot']);

    const complete = await run<Page>(asUser(A), PAGE, {
      workspaceId: WORKSPACE_W_ID,
      orderBy: 'TITLE_ASC',
      status: 'complete',
    });
    expect(titles(complete)).toEqual(['Alder Jar', 'Cedar Knot']);
  });

  it('narrows to a search, the title match ranked above the intent match', async () => {
    for (const [title, intent] of [
      ['Threshold Line', 'Keep the testroot hearth warm.'],
      ['Testroot Charm', null],
      ['Birch Jar', 'Nothing to find here.'],
    ] as const) {
      await insertSpell(sql, makeSpell({ workspaceId: WORKSPACE_W_ID, title, intent }), B.id);
    }

    const found = await run<Page>(asUser(A), PAGE, {
      workspaceId: WORKSPACE_W_ID,
      orderBy: 'TITLE_ASC',
      query: 'testroot',
    });
    expect(found.errors).toBeUndefined();
    // By title alone Threshold Line would come second; the search puts the title match first.
    expect(found.data!.grimoire.edges.map((edge) => edge.node.title)).toEqual([
      'Testroot Charm',
      'Threshold Line',
    ]);

    // One character is no search (MIN_QUERY_LENGTH): the whole shelf, in the asked-for order.
    const short = await run<Page>(asUser(A), PAGE, {
      workspaceId: WORKSPACE_W_ID,
      orderBy: 'TITLE_ASC',
      query: 't',
    });
    expect(short.errors).toBeUndefined();
    expect(short.data!.grimoire.edges.map((edge) => edge.node.title)).toEqual([
      'Birch Jar',
      'Testroot Charm',
      'Threshold Line',
    ]);
  });

  // M13.15 lets a draft go untitled, so the title reads as null rather than
  // failing the whole page, and an untitled draft sorts after every title.
  it('reads an untitled draft as a null title, last by title', async () => {
    for (const title of ['Birch Charm', 'Alder Jar']) {
      await insertSpell(sql, makeSpell({ workspaceId: WORKSPACE_W_ID, title }), B.id);
    }
    const untitled = await insertSpell(
      sql,
      makeSpell({ workspaceId: WORKSPACE_W_ID, title: null, status: 'draft' }),
      B.id,
    );

    const one = await run<{ spell: SpellNode }>(asUser(A), ONE, {
      workspaceId: WORKSPACE_W_ID,
      id: untitled,
    });
    expect(one.errors).toBeUndefined();
    expect(one.data!.spell).toMatchObject({ id: untitled, title: null });

    const byTitle = await run<Page>(asUser(A), PAGE, {
      workspaceId: WORKSPACE_W_ID,
      orderBy: 'TITLE_ASC',
    });
    expect(byTitle.errors).toBeUndefined();
    expect(byTitle.data!.grimoire.edges.map((edge) => edge.node.title)).toEqual([
      'Alder Jar',
      'Birch Charm',
      null,
    ]);
  });

  it('refuses a non-member FORBIDDEN', async () => {
    await insertSpell(sql, makeSpell({ workspaceId: WORKSPACE_X_ID }), D.id);
    // Why this could have succeeded: D lists X's grimoire.
    const own = await run<Page>(asUser(D), PAGE, { workspaceId: WORKSPACE_X_ID });
    expect(own.data?.grimoire.edges).toHaveLength(1);

    const result = await run(asUser(D), PAGE, { workspaceId: WORKSPACE_W_ID });
    expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
  });

  it.each([1, 4])(
    'resolves a page of %i spells and their fields in the same reads',
    async (count) => {
      for (let i = 0; i < count; i++) {
        const root = await ingredient(`Testroot ${i}`, ['Protection']);
        await insertSpell(
          sql,
          makeSpell({
            workspaceId: WORKSPACE_W_ID,
            categories: ['Warding'],
            steps: [{ ingredientId: root }, { body: 'Stir.' }],
          }),
          B.id,
        );
      }
      for (const spy of Object.values(repository)) spy.mockClear();

      const result = await run<Page>(asUser(C), PAGE, { workspaceId: WORKSPACE_W_ID });

      expect(result.errors).toBeUndefined();
      // Why the count means anything: every spell answered with its rows.
      const nodes = result.data!.grimoire.edges.map((edge) => edge.node);
      expect(nodes).toHaveLength(count);
      for (const node of nodes) {
        expect(node.steps).toHaveLength(2);
        expect(names(node.derivedCategories)).toEqual(['Protection']);
        expect(names(node.categoryGaps.intendedNotPresent)).toEqual(['Warding']);
      }
      const reads = Object.values(repository).reduce((sum, spy) => sum + spy.mock.calls.length, 0);
      // The page, then the eight of the three spell loaders (see
      // src/modules/grimoire/loaders/spell-children.ts), the gaps reading through the same two.
      expect(reads).toBe(9);
    },
  );
});
