import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import type { Session } from '@/lib/session';
import { A } from '../../../support/as-user';
import { insertIngredient, insertSubstituteLink } from '../../../support/db/insert-ingredient';
import { run as runOperation } from '../../../support/graphql/run';
import { makeIngredient } from '../../../support/fixtures';
import type { CompendiumConnection, SubstituteNode } from './types';

// The `compendium` query over the standard seed's 26 entries: public, a page at a time, with folk names and categories batched.
// What each filter matches is tests/db/repository/ingredients.test.ts's and how the service reads it is services/compendium.test.ts's.
// Here: the arguments reaching the read, the edge's score, the page numbers, one read per page, and the one refusal on the wire.

// The reads a page makes, counted at the repository so the batching is a
// number rather than a hope; the role lookup is counted to show a public
// page never makes one, and the count to show it runs only when asked for.
const repository = vi.hoisted(() => ({
  findCompendiumCount: vi.fn(),
  findCompendiumPage: vi.fn(),
  findCuratedRowsByIds: vi.fn(),
  findDeitiesOfIngredients: vi.fn(),
  findManyOfIngredients: vi.fn(),
  findManyByIds: vi.fn(),
  findSubstitutesIncludingSoftDeleted: vi.fn(),
  findWorkspaceRole: vi.fn(),
}));
vi.mock('@/db/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/repository')>();
  for (const [name, spy] of Object.entries(repository)) {
    spy.mockImplementation(actual[name as keyof typeof repository]);
  }
  return { ...actual, ...repository };
});

let sql: ReturnType<typeof postgres>;
let categoryIds: Map<string, string>;

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string);
  // A coven's own row, beside the seed, to be left out of every answer below.
  await insertIngredient(
    sql,
    makeIngredient({ name: 'Fixture Wroot', workspaceId: WORKSPACE_W_ID, nomenclature: 'none' }),
    A.id,
  );
  const rows = await sql`select id, name from categories where deleted_at is null`;
  categoryIds = new Map(rows.map((row) => [row.name as string, row.id as string]));
});

beforeEach(() => {
  Object.values(repository).forEach((spy) => spy.mockClear());
});

function run(session: Session | null, variables: Record<string, unknown> = {}) {
  return runOperation<{ compendium: CompendiumConnection }>(
    session,
    `query (
      $query: String
      $categoryIds: [ID!]
      $categoryMode: CategoryMode
      $forms: [String!]
      $deityIds: [ID!]
      $zodiacSigns: [String!]
      $celestialBodies: [String!]
      $elements: [IngredientElement!]
      $toxic: ToxicFilter
      $withoutReferences: Boolean
      $withoutForms: Boolean
      $nomenclature: Nomenclature
      $first: Int
      $after: String
    ) {
      compendium(
        query: $query
        categoryIds: $categoryIds
        categoryMode: $categoryMode
        forms: $forms
        deityIds: $deityIds
        zodiacSigns: $zodiacSigns
        celestialBodies: $celestialBodies
        elements: $elements
        toxic: $toxic
        withoutReferences: $withoutReferences
        withoutForms: $withoutForms
        nomenclature: $nomenclature
        first: $first
        after: $after
      ) {
        edges {
          cursor
          score
          node {
            id name slug canonicalName nomenclature isGlobal folkNames { id name }
            categories { name group { name colorDark } }
            audit { createdBy }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }`,
    variables,
  );
}

// Fifty, not the maximum: a page of 100 with categories and their groups costs
// more than MAX_COST allows, by design (claude-docs/graphql/protections.md, "Protections"),
// and the seed holds 26.
async function nodesOf(variables: Record<string, unknown>, session: Session | null = null) {
  const result = await run(session, { first: 50, ...variables });
  expect(result.errors).toBeUndefined();
  const data = result.data as { compendium: CompendiumConnection };
  return data.compendium.edges.map((edge) => edge.node);
}

/** The compendium's live ids in the finder's order, from the database's own collation. */
async function expectedOrder(): Promise<string[]> {
  const rows = await sql<{ id: string }[]>`
    select id from ingredients where workspace_id is null and deleted_at is null order by name, id`;
  return rows.map((row) => row.id);
}

const category = (name: string) => categoryIds.get(name) as string;

describe('compendium', () => {
  it('lists the seeded compendium to a signed-out visitor, a page at a time', async () => {
    const expected = await expectedOrder();
    expect(expected).toHaveLength(26);
    // The precondition for what is left out: a coven's row exists.
    const [{ count }] = await sql`
      select count(*)::int as count from ingredients where workspace_id is not null`;
    expect(count).toBe(1);

    const first = await run(null);
    expect(first.errors).toBeUndefined();
    const page = first.data?.compendium as CompendiumConnection;
    const rest = await run(null, { after: page.pageInfo.endCursor });
    const tail = rest.data?.compendium as CompendiumConnection;

    expect(page.edges).toHaveLength(25);
    expect(page.pageInfo.hasNextPage).toBe(true);
    expect(tail.edges).toHaveLength(1);
    const nodes = [...page.edges, ...tail.edges].map((edge) => edge.node);
    expect(nodes.map((node) => node.id)).toEqual(expected);
    expect(nodes.every((node) => node.isGlobal)).toBe(true);
    expect(nodes.map((node) => node.name)).not.toContain('Fixture Wroot');
  });

  // `sal` matches three seeded labels and Rosemary's formal name (Salvia rosmarinus), each holding it verbatim, so each scores a full 1.
  // It also matches a folk name of Mugwort and of Selenite (Sailor's Tobacco, Satin Spar) at a word similarity of 0.5, neither holding it.
  // Each field's weight sets the rank (label 1, formal name 0.9, folk name 0.8), so the order shows the weighted rank first and the name second.
  it('ranks a search best match first, with the score on each edge', async () => {
    const result = await run(null, { query: 'sal', first: 50 });
    expect(result.errors).toBeUndefined();
    const edges = (result.data as { compendium: CompendiumConnection }).compendium.edges;

    expect(edges.map((edge) => [edge.node.name, edge.score])).toEqual([
      // Each label holds `sal` verbatim, so all three score a full hit and
      // rank by where: Saltpetre at 1, Sea Salt at 5, Black Salt at 7.
      ['Saltpetre', 1],
      ['Sea Salt', 1],
      ['Black Salt', 1],
      // 1 × 0.9, which `real` holds only approximately.
      ['Rosemary', expect.closeTo(0.9, 5)],
      ['Mugwort', 0.4],
      ['Selenite', 0.4],
    ]);
  });

  // The facets: the four lists, the toxic setting and the two
  // to-do switches reach the read as the service parses them, and `any` as no
  // filter. What each matches is tests/db/repository/ingredients.test.ts's.
  it('passes the facet arguments to the read, the toxic setting as a ToxicFilter', async () => {
    const [hecate] = await sql`select id from deities where name = 'Hecate' and deleted_at is null`;

    await nodesOf({
      forms: [' Oil ', ''],
      deityIds: [hecate.id],
      zodiacSigns: ['Scorpio'],
      celestialBodies: ['Moon'],
      toxic: 'not_toxic',
      withoutReferences: true,
      withoutForms: true,
    });
    await nodesOf({ toxic: 'any' });

    expect(repository.findCompendiumPage.mock.calls.map(([filter]) => filter)).toEqual([
      {
        forms: ['Oil'],
        deityIds: [hecate.id],
        zodiacSigns: ['Scorpio'],
        celestialBodies: ['Moon'],
        toxic: 'not_toxic',
        withoutReferences: true,
        withoutForms: true,
      },
      {},
    ]);
  });

  // `all` is the default and no change, so only `any` reaches the read.
  it('passes categoryMode any to the read, takes all as the default, and refuses another mode', async () => {
    const ids = [category('Protection'), category('Cleansing')];
    await nodesOf({ categoryIds: ids, categoryMode: 'any' });
    await nodesOf({ categoryIds: ids, categoryMode: 'all' });
    await nodesOf({ categoryIds: ids });

    expect(repository.findCompendiumPage.mock.calls.map(([filter]) => filter)).toEqual([
      { categoryIds: ids, categoryMode: 'any' },
      { categoryIds: ids },
      { categoryIds: ids },
    ]);

    const refused = await run(null, { categoryIds: ids, categoryMode: 'some' });
    expect(refused.errors).toHaveLength(1);
    expect(repository.findCompendiumPage).toHaveBeenCalledTimes(3);
  });

  // The element list is a typed enum list, and reaches the read as the service parses it.
  it('passes the elements argument to the read, and refuses a name that is no element', async () => {
    await nodesOf({ elements: ['fire', 'water'] });
    await nodesOf({ elements: [] });

    expect(repository.findCompendiumPage.mock.calls.map(([filter]) => filter)).toEqual([
      { elements: ['fire', 'water'] },
      {},
    ]);

    const refused = await run(null, { elements: ['fixture'] });
    expect(refused.errors).toHaveLength(1);
    expect(repository.findCompendiumPage).toHaveBeenCalledTimes(2);
  });

  // Every entry on the page asks for its substitutes, and one read
  // answers them all, the linked ingredients joined in.
  it('resolves the substitutes of a page, linked and typed, in one read', async () => {
    const [mugwort, wormwood, lavender] = await Promise.all(
      ['Mugwort', 'Wormwood', 'Lavender'].map(async (name) => {
        const [row] = await sql`
          select id from ingredients where name = ${name} and workspace_id is null`;
        return row.id as string;
      }),
    );
    await insertSubstituteLink(sql, mugwort, wormwood, A.id);
    await insertSubstituteLink(sql, lavender, mugwort, A.id);
    await sql`insert into ingredient_substitutes ${sql({
      ingredient_id: mugwort,
      name: 'Fixture Root',
      created_by: A.id,
      updated_by: A.id,
    })}`;

    const result = await runOperation(
      null,
      `query {
        compendium(first: 50) {
          edges { node { id substitutes { name ingredient { id name } } } }
        }
      }`,
    );

    expect(result.errors).toBeUndefined();
    type Page = {
      compendium: { edges: { node: { id: string; substitutes: SubstituteNode[] } }[] };
    };
    const nodes = (result.data as Page).compendium.edges.map((edge) => edge.node);
    // Precondition: the page holds every entry, so each asked.
    expect(nodes.length).toBeGreaterThan(20);
    expect(nodes.find((node) => node.id === mugwort)?.substitutes).toEqual([
      { name: 'Fixture Root', ingredient: null },
      { name: 'Wormwood', ingredient: { id: wormwood, name: 'Wormwood' } },
    ]);
    expect(nodes.find((node) => node.id === lavender)?.substitutes).toEqual([
      { name: 'Mugwort', ingredient: { id: mugwort, name: 'Mugwort' } },
    ]);
    expect(nodes.find((node) => node.id === wormwood)?.substitutes).toEqual([]);
    expect(repository.findSubstitutesIncludingSoftDeleted).toHaveBeenCalledTimes(1);
  });

  // Every entry on the page asks for its forms' picks and its deities,
  // and one read answers each, the curated deities joined in.
  it('resolves the picked forms and the deities of a page in one read each', async () => {
    const result = await runOperation(
      null,
      `query {
        compendium(first: 30) {
          edges { node { name variants { form formChoice { name group { name } } } deities { name deity { name tradition { name } } } } }
        }
      }`,
    );

    expect(result.errors).toBeUndefined();
    type Node = {
      name: string;
      variants: { form: string; formChoice: { name: string; group: { name: string } } | null }[];
      deities: { name: string; deity: { name: string; tradition: { name: string } } | null }[];
    };
    const nodes = (result.data as { compendium: { edges: { node: Node }[] } }).compendium.edges.map(
      (edge) => edge.node,
    );
    // Precondition: the page holds every entry, and their picked forms among them.
    expect(nodes.length).toBeGreaterThan(20);
    const picked = nodes.flatMap((node) =>
      node.variants.flatMap((variant) => (variant.formChoice ? [{ node, variant }] : [])),
    );
    expect(picked.length).toBeGreaterThan(20);
    for (const { node, variant } of picked) {
      expect(variant.formChoice?.name, node.name).toBe(variant.form);
    }
    expect(nodes.find((node) => node.name === 'Mugwort')?.deities).toEqual([
      { name: 'Artemis', deity: { name: 'Artemis', tradition: { name: 'Greek' } } },
      { name: 'Diana', deity: { name: 'Diana', tradition: { name: 'Roman' } } },
    ]);
    expect(repository.findCuratedRowsByIds).toHaveBeenCalledTimes(1);
    expect(repository.findDeitiesOfIngredients).toHaveBeenCalledTimes(1);
  });

  it('resolves the categories, their groups and the folk names of a page in a read each', async () => {
    const result = await run(null);

    expect(result.errors).toBeUndefined();
    const page = result.data?.compendium as CompendiumConnection;
    expect(page.edges.some((edge) => edge.node.categories.length > 0)).toBe(true);
    expect(page.edges.some((edge) => edge.node.folkNames.length > 0)).toBe(true);
    // Folk names and category links, then categories and their groups.
    expect(repository.findManyOfIngredients).toHaveBeenCalledTimes(2);
    expect(repository.findManyByIds).toHaveBeenCalledTimes(2);
    expect(repository.findWorkspaceRole).not.toHaveBeenCalled();
  });

  describe('page numbers', () => {
    interface Counted {
      totalCount: number;
      countBefore: number | null;
      edges: { node: { id: string } }[];
      pageInfo: { endCursor: string | null };
    }

    async function counted(variables: Record<string, unknown>): Promise<Counted> {
      const result = await runOperation(
        null,
        `query ($query: String, $nomenclature: Nomenclature, $first: Int, $after: String, $last: Int) {
          compendium(query: $query, nomenclature: $nomenclature, first: $first, after: $after, last: $last) {
            totalCount countBefore edges { node { id } } pageInfo { endCursor }
          }
        }`,
        variables,
      );
      expect(result.errors).toBeUndefined();
      return (result.data as { compendium: Counted }).compendium;
    }

    // 26 entries at 10 a page: "Page 1 of 3", "Page 2 of 3", and Last asking
    // for the remainder, 26 % 10, rather than a whole page that would start
    // mid-page and read as page 2.
    it('gives a signed-out visitor the size of the list and the page’s place in it', async () => {
      const first = await counted({ first: 10 });
      const second = await counted({ first: 10, after: first.pageInfo.endCursor });
      const last = await counted({ last: first.totalCount % 10 || 10 });

      expect(first.totalCount).toBe(26);
      expect([first, second, last].map((page) => page.countBefore)).toEqual([0, 10, 20]);
      expect(last.edges).toHaveLength(6);
      expect([first, second, last].map((page) => page.totalCount)).toEqual([26, 26, 26]);
    });
  });

  // One id list is enough: deityIds goes through the same uuid parser.
  it('refuses a categoryIds entry that is not a uuid as VALIDATION', async () => {
    // Why it could have answered: a real category's id narrows the same list.
    expect((await run(null, { categoryIds: [category('Healing')] })).errors).toBeUndefined();

    const result = await run(null, { categoryIds: ['not-a-uuid'] });

    expect(result.data).toBeNull();
    expect(result.errors).toHaveLength(1);
    expect(result.errors?.[0]).toMatchObject({
      path: ['compendium'],
      extensions: { code: 'VALIDATION' },
    });
  });
});
