import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import type { Session } from '@/lib/session';
import { A, B, D, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertDeityLink, insertIngredient } from '../../../support/db/insert-ingredient';
import { insertCupboardEntry } from '../../../support/db/insert-cupboard-entry';
import { insertReference, insertReferenceLink } from '../../../support/db/insert-reference';
import { type IngredientFixture, makeIngredient, makeVariant } from '../../../support/fixtures';
import type { Overrides } from '../../../support/fixtures';
import { run as runOperation } from '../../../support/graphql/run';

// The two queries, `compendiumFacets` and `workspaceIngredientFacets`.
// How each value is counted, and who may read which coven's counts, is services/ingredient-facets.test.ts's and tests/db/repository/ingredient-facets.test.ts's.
// Here: the arguments reaching the service, each value typed as its argument, and the one refusal on the wire. Signed-out answers are tests/db/graphql-query-scopes.test.ts's.

interface FacetCount {
  value: string;
  count: number;
}
type Facets = Record<
  'forms' | 'deities' | 'categories' | 'zodiacSigns' | 'celestialBodies' | 'elements' | 'toxic',
  FacetCount[]
>;

const SELECTION = `{
  forms { value count }
  deities { value count }
  categories { value count }
  zodiacSigns { value count }
  celestialBodies { value count }
  elements { value count }
  toxic { value count }
}`;

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

let hecate: string;
let protection: string;

/** Two compendium entries, one toxic, linked to Hecate, filed in Protection and fire, and both coming as a resin; and W's own entry in a form of its own. */
beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  [{ id: hecate }] = await sql`select id from deities where name = 'Hecate' and deleted_at is null`;
  [{ id: protection }] = await sql`
    select id from categories where name = 'Protection' and deleted_at is null`;
  const alpha = await add('Alphawort', {
    variants: [makeVariant({ form: 'Resin' })],
    categories: ['Protection'],
    elements: ['fire'],
    toxic: true,
  });
  await insertDeityLink(sql, alpha, hecate, 0, A.id);
  await add('Betawort', {
    variants: [makeVariant({ form: 'Resin' }), makeVariant({ form: 'Leaf' })],
  });
  await add('Covenwort', {
    workspaceId: WORKSPACE_W_ID,
    variants: [makeVariant({ form: 'Covenform' })],
  });
});

/** An entry, compendium by default, with no formal name. */
function add(name: string, overrides: Overrides<IngredientFixture> = {}): Promise<string> {
  return insertIngredient(sql, makeIngredient({ name, nomenclature: 'none', ...overrides }), A.id);
}

function compendiumFacets(variables: Record<string, unknown> = {}) {
  return runOperation<{
    compendiumFacets: Facets & { withoutReferences: number; withoutForms: number };
  }>(
    null,
    `query (
      $query: String
      $categoryIds: [ID!]
      $categoryMode: CategoryMode
      $forms: [String!]
      $toxic: ToxicFilter
      $nomenclature: Nomenclature
      $withoutReferences: Boolean
      $withoutForms: Boolean
    ) {
      compendiumFacets(
        query: $query
        categoryIds: $categoryIds
        categoryMode: $categoryMode
        forms: $forms
        toxic: $toxic
        nomenclature: $nomenclature
        withoutReferences: $withoutReferences
        withoutForms: $withoutForms
      ) ${SELECTION.slice(0, -1)} withoutReferences withoutForms }
    }`,
    variables,
  );
}

function workspaceFacets(session: Session, variables: Record<string, unknown> = {}) {
  return runOperation<{
    workspaceIngredientFacets: Facets & {
      source: FacetCount[];
      inStock: number;
      lowStockOnly: number;
    };
  }>(
    session,
    `query (
      $workspaceId: ID!
      $forms: [String!]
      $source: IngredientSource
      $inStock: Boolean
      $lowStockOnly: Boolean
    ) {
      workspaceIngredientFacets(
        workspaceId: $workspaceId
        forms: $forms
        source: $source
        inStock: $inStock
        lowStockOnly: $lowStockOnly
      ) ${SELECTION.slice(0, -1)} source { value count } inStock lowStockOnly }
    }`,
    { workspaceId: WORKSPACE_W_ID, ...variables },
  );
}

describe('compendiumFacets', () => {
  it("answers the compendium's counts, each value typed as the argument it would be sent as", async () => {
    const result = await compendiumFacets();

    expect(result.errors).toBeUndefined();
    const facets = result.data?.compendiumFacets;
    expect(facets?.forms).toEqual([
      { value: 'Leaf', count: 1 },
      { value: 'Resin', count: 2 },
    ]);
    expect(facets?.deities).toEqual([{ value: hecate, count: 1 }]);
    expect(facets?.categories).toEqual([{ value: protection, count: 1 }]);
    expect(facets?.elements).toContainEqual({ value: 'fire', count: 1 });
    expect(facets?.toxic).toEqual([
      { value: 'toxic', count: 1 },
      { value: 'not_toxic', count: 1 },
    ]);
  });

  it('counts the entries citing no reference, the No Refs switch on or off', async () => {
    const alpha = await sql`select id from ingredients where name = 'Alphawort'`;
    const book = await insertReference(sql, {}, A.id);
    await insertReferenceLink(sql, alpha[0].id as string, book, A.id);

    for (const withoutReferences of [null, true]) {
      const result = await compendiumFacets({ withoutReferences, forms: ['resin'] });
      expect(result.errors).toBeUndefined();
      // Betawort alone: Alphawort cites the book, and Covenwort is a coven's.
      expect(result.data?.compendiumFacets.withoutReferences).toBe(1);
    }
  });

  it('counts the entries with no live form, the No Form switch on or off, signed out', async () => {
    await add('Gammawort', { variants: [] });
    const withoutForms = async (variables: Record<string, unknown>) => {
      const result = await compendiumFacets(variables);
      expect(result.errors).toBeUndefined();
      return result.data?.compendiumFacets.withoutForms;
    };

    // Why it could have counted more: Alphawort and Betawort hold live forms
    // and Covenwort is a coven's, so Gammawort is the only one without.
    expect(await withoutForms({ query: 'alphawort' })).toBe(0);
    expect(await withoutForms({})).toBe(1);
    for (const switchOn of [null, true]) {
      expect(await withoutForms({ withoutForms: switchOn })).toBe(1);
    }
  });

  it('passes the search, category, facet and nomenclature arguments to the service', async () => {
    const count = async (variables: Record<string, unknown>) => {
      const result = await compendiumFacets(variables);
      expect(result.errors).toBeUndefined();
      return result.data?.compendiumFacets.toxic;
    };

    expect(await count({ forms: ['leaf'] })).toEqual([
      { value: 'toxic', count: 0 },
      { value: 'not_toxic', count: 1 },
    ]);
    expect(await count({ query: 'alphawort' })).toEqual([
      { value: 'toxic', count: 1 },
      { value: 'not_toxic', count: 0 },
    ]);
    expect(await count({ categoryIds: [protection], categoryMode: 'any' })).toEqual([
      { value: 'toxic', count: 1 },
      { value: 'not_toxic', count: 0 },
    ]);
    expect(await count({ nomenclature: 'unknown' })).toEqual([
      { value: 'toxic', count: 0 },
      { value: 'not_toxic', count: 0 },
    ]);
    const forms = await compendiumFacets({ toxic: 'not_toxic' });
    expect(forms.data?.compendiumFacets.forms).toEqual([
      { value: 'Leaf', count: 1 },
      { value: 'Resin', count: 1 },
    ]);
  });
});

describe('workspaceIngredientFacets', () => {
  it("answers a member the coven's counts, with the arguments passed", async () => {
    const result = await workspaceFacets(asUser(B));

    expect(result.errors).toBeUndefined();
    expect(result.data?.workspaceIngredientFacets.forms).toEqual([
      { value: 'Covenform', count: 1 },
    ]);
    expect(result.data?.workspaceIngredientFacets.toxic).toContainEqual({
      value: 'not_toxic',
      count: 1,
    });
    // How Source, In Stock and Low Stock count is services/ingredient-facets.test.ts's.
    // Covenwort is W's own and has no jar; W holds no compendium entry.
    expect(result.data?.workspaceIngredientFacets).toMatchObject({
      source: [
        { value: 'local', count: 1 },
        { value: 'compendium', count: 0 },
      ],
      inStock: 0,
      lowStockOnly: 0,
    });

    // W holds no resin, so nothing is left to count by toxicity.
    const narrowed = await workspaceFacets(asUser(B), { forms: ['resin'] });
    expect(narrowed.errors).toBeUndefined();
    expect(narrowed.data?.workspaceIngredientFacets.toxic).toEqual([
      { value: 'toxic', count: 0 },
      { value: 'not_toxic', count: 0 },
    ]);
  });

  it('takes a source and inStock, counting the coven under each', async () => {
    const forms = async (variables: Record<string, unknown>) => {
      const result = await workspaceFacets(asUser(B), variables);
      expect(result.errors).toBeUndefined();
      return result.data?.workspaceIngredientFacets.forms;
    };
    const covenform = [{ value: 'Covenform', count: 1 }];

    // Why each could have answered the same: the unfiltered count holds Covenform.
    expect(await forms({})).toEqual(covenform);
    expect(await forms({ source: 'local' })).toEqual(covenform);
    expect(await forms({ source: 'compendium' })).toEqual([]);
    // Covenwort has no jar, so it is out of stock.
    expect(await forms({ inStock: true })).toEqual([]);
    expect(await forms({ inStock: false })).toEqual(covenform);
  });

  it('is FORBIDDEN to a caller naming by id a coven they are not in', async () => {
    // Why D could have read them: W's counts hold a value for its member.
    const own = await workspaceFacets(asUser(B));
    expect(own.data?.workspaceIngredientFacets.forms).toHaveLength(1);

    const result = await workspaceFacets(asUser(D));

    expect(result.data).toBeNull();
    expect(result.errors).toHaveLength(1);
    expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
  });
});

describe('compendiumFacets covenIds (M12.55)', () => {
  const heldToxic = async (session: Session | null) => {
    const result = await runOperation<{ compendiumFacets: Facets }>(
      session,
      `query ($covenIds: [ID!]) { compendiumFacets(covenIds: $covenIds) { toxic { value count } } }`,
      { covenIds: [WORKSPACE_W_ID] },
    );
    expect(result.errors).toBeUndefined();
    return result.data?.compendiumFacets.toxic;
  };

  beforeEach(async () => {
    const [{ id }] = await sql`select id from ingredients where name = 'Betawort'`;
    await insertCupboardEntry(
      sql,
      { workspaceId: WORKSPACE_W_ID, ingredientId: id as string },
      A.id,
    );
  });

  it("counts only the entries the viewer's picked coven holds", async () => {
    expect(await heldToxic(asUser(B))).toEqual([
      { value: 'toxic', count: 0 },
      { value: 'not_toxic', count: 1 },
    ]);
  });

  describe('with covensNot', () => {
    const notHeldToxic = async (session: Session | null, covenIds?: string[]) => {
      const result = await runOperation<{ compendiumFacets: Facets }>(
        session,
        `query ($covenIds: [ID!]) { compendiumFacets(covenIds: $covenIds, covensNot: true) { toxic { value count } } }`,
        { covenIds },
      );
      expect(result.errors).toBeUndefined();
      return result.data?.compendiumFacets.toxic;
    };
    const rest = [
      { value: 'toxic', count: 1 },
      { value: 'not_toxic', count: 0 },
    ];

    it('counts only the entries the picked coven does not hold', async () => {
      expect(await notHeldToxic(asUser(B), [WORKSPACE_W_ID])).toEqual(rest);
    });
  });
});
