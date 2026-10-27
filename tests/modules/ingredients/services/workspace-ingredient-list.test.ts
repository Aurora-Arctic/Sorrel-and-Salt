import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden } from '@/lib/errors';
import { resolvePage } from '@/lib/pagination';
import type { Session } from '@/lib/session';
import { listWorkspaceIngredients, workspaceIngredientFacets } from '@/modules/ingredients';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertCupboardEntry } from '../../../support/db/insert-cupboard-entry';
import type { CupboardEntryFixture } from '../../../support/db/insert-cupboard-entry';
import { insertDeityLink, insertIngredient } from '../../../support/db/insert-ingredient';
import { insertStock } from '../../../support/db/insert-stock';
import { variantIdOf } from '../../../support/db/read-variants';
import { type IngredientFixture, makeIngredient, makeVariant } from '../../../support/fixtures';
import type { Overrides } from '../../../support/fixtures';
import { JAR_STATES } from '../../../support/jar-states';

// Story 14's list (M9.4, M12.18): a coven's ingredients are its own entries and
// the compendium entries its cupboard names, one live
// `workspace_compendium_entries` row each, filtered as the compendium is but
// under the coven's proof and over the coven's overrides. The ingredient tables are emptied per test, so every row
// a result could come from is one this file wrote.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

/** An entry, compendium by default, with no formal name unless stated. */
function add(name: string, overrides: Overrides<IngredientFixture> = {}): Promise<string> {
  return insertIngredient(sql, makeIngredient({ name, nomenclature: 'none', ...overrides }), A.id);
}

/** The compendium entry `ingredientId` in `workspaceId`'s cupboard, with `overrides`. */
function hold(
  ingredientId: string,
  workspaceId = WORKSPACE_W_ID,
  overrides: Omit<CupboardEntryFixture, 'workspaceId' | 'ingredientId'> = {},
): Promise<string> {
  return insertCupboardEntry(sql, { workspaceId, ingredientId, ...overrides }, A.id);
}

/** A compendium entry in W's cupboard. */
async function held(name: string, overrides: Overrides<IngredientFixture> = {}): Promise<string> {
  const id = await add(name, overrides);
  await hold(id);
  return id;
}

/** A jar in `workspaceId` of the ingredient's form `form`, written raw. */
async function stock(
  ingredientId: string,
  workspaceId = WORKSPACE_W_ID,
  form = 'Testform',
  deleted = false,
  quantityOnHand: string | null = null,
  lowStockThreshold: string | null = null,
): Promise<string> {
  const variantId = await variantIdOf(sql, ingredientId, form);
  return insertStock(
    sql,
    { workspaceId, ingredientId, variantId, deleted, quantityOnHand, lowStockThreshold },
    A.id,
  );
}

/** Every label `session` is listed in `workspaceId` under `filter`, in the list's order. */
async function listed(
  session: Session,
  workspaceId = WORKSPACE_W_ID,
  filter: Parameters<typeof listWorkspaceIngredients>[2] = {},
): Promise<string[]> {
  const page = await resolvePage({ first: 100 }, (request) =>
    listWorkspaceIngredients(session, workspaceId, filter, request),
  );
  return page.edges.map(({ node }) => node.name);
}

/** The ids `session` is listed in `workspaceId` under `filter`. */
async function idsListed(
  session: Session,
  workspaceId: string,
  filter: Parameters<typeof listWorkspaceIngredients>[2],
): Promise<string[]> {
  const page = await resolvePage({ first: 100 }, (request) =>
    listWorkspaceIngredients(session, workspaceId, filter, request),
  );
  return page.edges.map(({ node }) => node.id);
}

describe('listWorkspaceIngredients under source and inStock (M9.7)', () => {
  /** A local entry, a held compendium entry and a local one with no jar. */
  async function seedSources(): Promise<void> {
    await stock(await add('Covenwort', { workspaceId: WORKSPACE_W_ID }));
    await add('Barecovenwort', { workspaceId: WORKSPACE_W_ID });
    await stock(await held('Heldwort'));
    await add('Unheldwort');
    await add('Elsewort', { workspaceId: WORKSPACE_X_ID });
  }

  it('lists both sources when none is chosen, the coven only for local, the compendium only for compendium', async () => {
    await seedSources();

    expect(await listed(asUser(B))).toEqual(['Barecovenwort', 'Covenwort', 'Heldwort']);
    expect(await listed(asUser(B), WORKSPACE_W_ID, { source: 'local' })).toEqual([
      'Barecovenwort',
      'Covenwort',
    ]);
    expect(await listed(asUser(B), WORKSPACE_W_ID, { source: 'compendium' })).toEqual(['Heldwort']);
  });

  it('keeps an entry with any jar not at 0, and one whose only jar has no quantity', async () => {
    const mixed = await held('Mixedwort', {
      variants: [makeVariant({ form: 'Herb' }), makeVariant({ form: 'Oil' })],
    });
    await stock(mixed, WORKSPACE_W_ID, 'Herb', false, '0');
    await stock(mixed, WORKSPACE_W_ID, 'Oil', false, '2');
    await stock(await held('Unweighedwort'));
    await stock(await held('Weighedwort'), WORKSPACE_W_ID, 'Testform', false, '3.5');
    await stock(await held('Emptywort'), WORKSPACE_W_ID, 'Testform', false, '0');
    const spent = await held('Spentwort', {
      variants: [makeVariant({ form: 'Herb' }), makeVariant({ form: 'Oil' })],
    });
    await stock(spent, WORKSPACE_W_ID, 'Herb', false, '0');
    await stock(spent, WORKSPACE_W_ID, 'Oil', false, '0');
    await add('Barecovenwort', { workspaceId: WORKSPACE_W_ID });
    await stock(
      await add('Covenwort', { workspaceId: WORKSPACE_W_ID }),
      WORKSPACE_W_ID,
      'Testform',
      false,
      '1',
    );

    // Why they could have been listed: without the filter every one is.
    expect(await listed(asUser(B))).toHaveLength(7);
    expect(await listed(asUser(B), WORKSPACE_W_ID, { inStock: true })).toEqual([
      'Covenwort',
      'Mixedwort',
      'Unweighedwort',
      'Weighedwort',
    ]);
  });

  it("does not count a deleted jar as in stock, nor another coven's jar", async () => {
    const entry = await held('Deletedjarwort');
    await stock(entry, WORKSPACE_W_ID, 'Testform', false, '0');
    await stock(entry, WORKSPACE_W_ID, 'Testform', true, '5');
    await stock(entry, WORKSPACE_X_ID, 'Testform', false, '5');
    await stock(await held('Livejarwort'), WORKSPACE_W_ID, 'Testform', false, '5');

    expect(await listed(asUser(B))).toEqual(['Deletedjarwort', 'Livejarwort']);
    expect(await listed(asUser(B), WORKSPACE_W_ID, { inStock: true })).toEqual(['Livejarwort']);
  });

  it('combines source with inStock', async () => {
    await stock(
      await add('Covenwort', { workspaceId: WORKSPACE_W_ID }),
      WORKSPACE_W_ID,
      'Testform',
      false,
      '1',
    );
    await stock(await held('Heldwort'), WORKSPACE_W_ID, 'Testform', false, '1');
    await stock(
      await add('Emptywort', { workspaceId: WORKSPACE_W_ID }),
      WORKSPACE_W_ID,
      'Testform',
      false,
      '0',
    );

    expect(
      await listed(asUser(B), WORKSPACE_W_ID, { source: 'compendium', inStock: true }),
    ).toEqual(['Heldwort']);
    expect(await listed(asUser(B), WORKSPACE_W_ID, { source: 'local', inStock: true })).toEqual([
      'Covenwort',
    ]);
  });
});

describe('listWorkspaceIngredients under lowStockOnly (M9.8)', () => {
  /** A held entry with one jar of `quantity` against `threshold`. */
  async function jarred(
    name: string,
    quantity: string | null,
    threshold: string | null,
  ): Promise<string> {
    const id = await held(name);
    await stock(id, WORKSPACE_W_ID, 'Testform', false, quantity, threshold);
    return id;
  }

  it('keeps exactly the entries whose jar the badge rule flags, over the shared jar states', async () => {
    for (const state of JAR_STATES) {
      await jarred(
        state.name,
        state.quantity?.toString() ?? null,
        state.threshold?.toString() ?? null,
      );
    }
    await add('Barewort', { workspaceId: WORKSPACE_W_ID });

    // Why they could have been listed: without the filter every one is.
    expect(await listed(asUser(B))).toHaveLength(JAR_STATES.length + 1);
    expect(await listed(asUser(B), WORKSPACE_W_ID, { lowStockOnly: true })).toEqual(
      JAR_STATES.filter((state) => state.expected !== 'ok')
        .map((state) => state.name)
        .sort(),
    );
  });

  it('keeps an entry when any one of its jars is badged', async () => {
    const forms = [makeVariant({ form: 'Herb' }), makeVariant({ form: 'Oil' })];
    const mixed = await held('Mixedwort', { variants: forms });
    await stock(mixed, WORKSPACE_W_ID, 'Herb', false, '50', '10');
    await stock(mixed, WORKSPACE_W_ID, 'Oil', false, '1', '3');
    const full = await held('Fullwort', { variants: forms });
    await stock(full, WORKSPACE_W_ID, 'Herb', false, '50', '10');
    await stock(full, WORKSPACE_W_ID, 'Oil', false, '40', '3');

    expect(await listed(asUser(B), WORKSPACE_W_ID, { lowStockOnly: true })).toEqual(['Mixedwort']);
  });

  it("does not count a deleted jar, nor another coven's jar", async () => {
    const entry = await held('Deletedjarwort');
    await stock(entry, WORKSPACE_W_ID, 'Testform', true, '0', '3');
    await stock(entry, WORKSPACE_W_ID, 'Testform', false, '50', '3');
    await stock(entry, WORKSPACE_X_ID, 'Testform', false, '0', '3');
    await jarred('Livejarwort', '1', '3');

    expect(await listed(asUser(B))).toEqual(['Deletedjarwort', 'Livejarwort']);
    expect(await listed(asUser(B), WORKSPACE_W_ID, { lowStockOnly: true })).toEqual([
      'Livejarwort',
    ]);
    // Why X's jar could have counted: X lists the entry too, and its own jar is out.
    await hold(entry, WORKSPACE_X_ID);
    expect(await listed(asUser(D), WORKSPACE_X_ID, { lowStockOnly: true })).toEqual([
      'Deletedjarwort',
    ]);
  });

  it('combines with source and inStock', async () => {
    await jarred('Lowheldwort', '1', '3');
    await jarred('Outheldwort', '0', '3');
    await stock(
      await add('Lowcovenwort', { workspaceId: WORKSPACE_W_ID }),
      WORKSPACE_W_ID,
      'Testform',
      false,
      '1',
      '3',
    );

    expect(
      await listed(asUser(B), WORKSPACE_W_ID, { lowStockOnly: true, source: 'local' }),
    ).toEqual(['Lowcovenwort']);
    expect(await listed(asUser(B), WORKSPACE_W_ID, { lowStockOnly: true, inStock: true })).toEqual([
      'Lowcovenwort',
      'Lowheldwort',
    ]);
  });
});

describe('listWorkspaceIngredients', () => {
  it("lists the coven's own entries and the compendium entries its cupboard names, and nothing else", async () => {
    await add('Covenwort', { workspaceId: WORKSPACE_W_ID });
    await held('Heldwort');
    await add('Unheldwort');
    // A jar alone no longer puts an entry in the list: only the cupboard row does.
    await stock(await add('Jaronlywort'));
    await add('Elsewort', { workspaceId: WORKSPACE_X_ID });
    // X's cupboard row does not put a compendium entry in W's list.
    await hold(await add('Xheldwort'), WORKSPACE_X_ID);

    expect(await listed(asUser(B))).toEqual(['Covenwort', 'Heldwort']);
    // Why W's list could have held the rest: they are live, and X lists its own.
    expect(await listed(asUser(D), WORKSPACE_X_ID)).toEqual(['Elsewort', 'Xheldwort']);
  });

  it('lists a held entry once, however many of its forms the coven holds', async () => {
    const entry = await held('Heldwort', {
      variants: [makeVariant({ form: 'Herb' }), makeVariant({ form: 'Oil' })],
    });
    await stock(entry, WORKSPACE_W_ID, 'Herb');
    await stock(entry, WORKSPACE_W_ID, 'Oil');

    expect(await listed(asUser(B))).toEqual(['Heldwort']);
  });

  it('leaves out an entry whose cupboard row is deleted, and one whose row names a coven entry', async () => {
    await hold(await add('Removedwort'), WORKSPACE_W_ID, { deleted: true });
    // A row naming the coven's own entry is not a cupboard entry; the entry
    // lists once, as the coven's own.
    await hold(await add('Ownwort', { workspaceId: WORKSPACE_W_ID }));
    // Why the first could have been listed: a live row puts it there.
    await held('Heldwort');

    expect(await listed(asUser(B))).toEqual(['Heldwort', 'Ownwort']);
  });

  // A deleted compendium entry the coven still holds stays listed (M12.32):
  // retired-entry-list.test.ts owns that case.
  it("leaves out the coven's deleted entry", async () => {
    await add('Covenwort', { workspaceId: WORKSPACE_W_ID });
    const deleted = await add('Deletedwort', { workspaceId: WORKSPACE_W_ID });
    await sql`
      update ingredients set deleted_at = now(), deleted_by = ${A.id}
      where id = ${deleted}`;

    expect(await listed(asUser(B))).toEqual(['Covenwort']);
  });

  // M12.18 decision 2: the coven chose both entries, so both are listed; a
  // name match hides neither (M12.28).
  it('lists a local entry beside the held compendium entry it matches', async () => {
    const entry = await held('Fixturewort', {
      canonicalName: 'Fixtura vulgaris',
      nomenclature: 'botanical',
    });
    const local = await add('Cronefixture', {
      canonicalName: 'Fixtura vulgaris',
      nomenclature: 'botanical',
      workspaceId: WORKSPACE_W_ID,
    });

    expect(await idsListed(asUser(B), WORKSPACE_W_ID, {})).toEqual([local, entry]);
  });

  it('sorts and finds a relabelled entry under its label, and still finds it by its compendium name', async () => {
    const relabelled = await add('Zorvaxine');
    await hold(relabelled, WORKSPACE_W_ID, { label: 'Amblequist' });
    const own = await add('Midfixture', { workspaceId: WORKSPACE_W_ID });
    // X's label is not W's: it neither sorts nor finds W's entry.
    await hold(relabelled, WORKSPACE_X_ID, { label: 'Pellhaven' });

    expect(await idsListed(asUser(B), WORKSPACE_W_ID, {})).toEqual([relabelled, own]);
    expect(await idsListed(asUser(B), WORKSPACE_W_ID, { query: 'amblequist' })).toEqual([
      relabelled,
    ]);
    expect(await idsListed(asUser(B), WORKSPACE_W_ID, { query: 'zorvaxine' })).toEqual([
      relabelled,
    ]);
    expect(await idsListed(asUser(B), WORKSPACE_W_ID, { query: 'pellhaven' })).toEqual([]);
    // Why X's label could have found it: X's list finds it so.
    expect(await idsListed(asUser(D), WORKSPACE_X_ID, { query: 'pellhaven' })).toEqual([
      relabelled,
    ]);
  });

  it('pages a relabelled entry by its label, one at a time', async () => {
    const relabelled = await add('Zedfixture');
    await hold(relabelled, WORKSPACE_W_ID, { label: 'Midfixture' });
    const first = await add('Amberfixture', { workspaceId: WORKSPACE_W_ID });
    const last = await held('Quillfixture');

    const ids: string[] = [];
    let after: string | undefined;
    for (let i = 0; i < 4; i++) {
      const page = await resolvePage({ first: 1, after }, (request) =>
        listWorkspaceIngredients(asUser(B), WORKSPACE_W_ID, {}, request),
      );
      ids.push(...page.edges.map(({ node }) => node.id));
      if (!page.pageInfo.hasNextPage) break;
      after = page.pageInfo.endCursor ?? undefined;
    }

    expect(ids).toEqual([first, relabelled, last]);
  });

  it('ranks by score alone, an own entry and a compendium entry of one name side by side', async () => {
    const own = await add('Tiefixture', { workspaceId: WORKSPACE_W_ID });
    const entry = await held('Tiefixture');
    // A folk name scores below a name, so the rank, not the kind, orders the rest.
    const byFolk = await add('Aafixture', {
      workspaceId: WORKSPACE_W_ID,
      folkNames: ['Tiefixture'],
    });

    const page = await resolvePage({ first: 10 }, (request) =>
      listWorkspaceIngredients(asUser(B), WORKSPACE_W_ID, { query: 'tiefixture' }, request),
    );
    const ranked = page.edges.map(({ node, score }) => ({ id: node.id, score }));
    // The two named entries tie at the top and fall back to name, then id.
    expect(ranked.map(({ id }) => id)).toEqual([...[own, entry].sort(), byFolk]);
    expect(ranked[0].score).toBe(ranked[1].score);
    expect(ranked[2].score).toBeLessThan(ranked[1].score as number);
  });

  it("filters by search, category and forms, under the coven's proof", async () => {
    await add('Mugfixture', {
      workspaceId: WORKSPACE_W_ID,
      folkNames: ['Cronefixture'],
      categories: ['Protection'],
    });
    await held('Oilfixture', {
      variants: [makeVariant({ form: 'Oil' })],
      categories: ['Protection'],
    });
    await add('Plainfixture', { workspaceId: WORKSPACE_W_ID });
    // X's entry matches every filter below, so a filter reading past the
    // proof would list it.
    await add('Elsefixture', {
      workspaceId: WORKSPACE_X_ID,
      folkNames: ['Cronefixture'],
      categories: ['Protection'],
      variants: [makeVariant({ form: 'Oil' })],
    });
    const [protection] = await sql`
      select id from categories where name = 'Protection' and deleted_at is null`;

    expect(await listed(asUser(B), WORKSPACE_W_ID, { query: 'cronefixture' })).toEqual([
      'Mugfixture',
    ]);
    expect(await listed(asUser(B), WORKSPACE_W_ID, { categoryIds: [protection.id] })).toEqual([
      'Mugfixture',
      'Oilfixture',
    ]);
    expect(await listed(asUser(B), WORKSPACE_W_ID, { forms: ['oil'] })).toEqual(['Oilfixture']);

    // M8.12: Mugfixture and Oilfixture hold Protection and neither holds
    // Cleansing, so only the mode decides whether the pair lists them.
    const [cleansing] = await sql`
      select id from categories where name = 'Cleansing' and deleted_at is null`;
    const pair = [protection.id, cleansing.id];
    expect(await listed(asUser(B), WORKSPACE_W_ID, { categoryIds: pair })).toEqual([]);
    expect(
      await listed(asUser(B), WORKSPACE_W_ID, { categoryIds: pair, categoryMode: 'any' }),
    ).toEqual(['Mugfixture', 'Oilfixture']);
  });

  // The viewer stands for every role: reading the list is one permission
  // that owner, member and viewer all hold (tests/modules/coven/services/access-control.test.ts).
  it('lists W to C, a viewer', async () => {
    await add('Covenwort', { workspaceId: WORKSPACE_W_ID });

    expect(await listed(asUser(C))).toEqual(['Covenwort']);
  });

  it('refuses D, who belongs to X, naming W', async () => {
    await add('Covenwort', { workspaceId: WORKSPACE_W_ID });
    // Why it could have answered: D is admitted to a coven, and W has a row.
    expect(await listed(asUser(B))).toEqual(['Covenwort']);
    await expect(listed(asUser(D), WORKSPACE_X_ID)).resolves.toEqual([]);

    await expect(listed(asUser(D))).rejects.toThrow(Forbidden);
  });

  it('refuses the site admin, who belongs to no coven', async () => {
    await add('Covenwort', { workspaceId: WORKSPACE_W_ID });
    expect(await listed(asUser(B))).toEqual(['Covenwort']);

    await expect(listed(asUser(E))).rejects.toThrow(Forbidden);
  });

  // A curator cannot delete a deity or category a compendium entry holds, but
  // a coven's own entry keeps its link through the delete. The filter reads
  // the row a link points to as the facets do, so the list and the count
  // agree that the deleted value matches nothing.
  it('lists nothing under a deleted deity or category, as the facets count it', async () => {
    const entry = await add('Linkfixture', { workspaceId: WORKSPACE_W_ID, categories: ['Love'] });
    const [selene] = await sql`
      select id from deities where name = 'Selene' and deleted_at is null`;
    const [love] = await sql`
      select id from categories where name = 'Love' and deleted_at is null`;
    await insertDeityLink(sql, entry, selene.id, 0, A.id);
    const byDeity = { deityIds: [selene.id as string] };
    const byCategory = { categoryIds: [love.id as string] };
    const countOf = async (
      kind: 'deities' | 'categories',
      filter: typeof byDeity | typeof byCategory,
      id: string,
    ) =>
      (await workspaceIngredientFacets(asUser(B), WORKSPACE_W_ID, filter))[kind].find(
        ({ value }) => value === id,
      )?.count;
    // Why it could have listed: before the deletes, each filter lists it and counts it.
    expect(await idsListed(asUser(B), WORKSPACE_W_ID, byDeity)).toEqual([entry]);
    expect(await idsListed(asUser(B), WORKSPACE_W_ID, byCategory)).toEqual([entry]);
    expect(await countOf('deities', byDeity, selene.id)).toBe(1);
    expect(await countOf('categories', byCategory, love.id)).toBe(1);

    await sql`update deities set deleted_at = now(), deleted_by = ${A.id} where id = ${selene.id}`;
    await sql`update categories set deleted_at = now(), deleted_by = ${A.id} where id = ${love.id}`;

    expect(await idsListed(asUser(B), WORKSPACE_W_ID, byDeity)).toEqual([]);
    expect(await idsListed(asUser(B), WORKSPACE_W_ID, byCategory)).toEqual([]);
    expect(await countOf('deities', byDeity, selene.id)).toBe(0);
    expect(await countOf('categories', byCategory, love.id)).toBe(0);
  });

  // M11.22's facets all read through the one coven scope
  // (`workspaceListScopeIncludingSoftDeleted`), and their arms are the
  // compendium list's, which tests/db/repository/ingredients.test.ts proves.
  // So one facet stands for all five: the deity facet, the one that reaches
  // through a link table. W's row matches it and so does X's, so a facet read
  // past the proof would list W's row to D. Each coven also holds a row
  // matching none, so a facet the read ignored would list it.
  describe('under a facet', () => {
    let covenRow: string;
    let elseRow: string;
    let byDeity: Parameters<typeof listWorkspaceIngredients>[2];

    beforeEach(async () => {
      const [deity] = await sql`
        select id from deities where name = 'Hecate' and deleted_at is null`;
      byDeity = { deityIds: [deity.id as string] };
      covenRow = await add('Facetfixture', { workspaceId: WORKSPACE_W_ID });
      await insertDeityLink(sql, covenRow, deity.id as string, 0, A.id);
      elseRow = await add('Elsefixture', { workspaceId: WORKSPACE_X_ID });
      await insertDeityLink(sql, elseRow, deity.id as string, 0, A.id);
      for (const workspaceId of [WORKSPACE_W_ID, WORKSPACE_X_ID]) {
        await add('Plainfixture', { workspaceId });
      }
    });

    it('lists the row to B by its id and refuses D naming W', async () => {
      // Unfiltered, W lists both its rows, so the facet is what narrows.
      expect(await idsListed(asUser(B), WORKSPACE_W_ID, {})).toHaveLength(2);
      // Why the read could have answered D: the facet matches W's row, D is
      // admitted to a coven, and the same facet lists X's row to D there.
      expect(await idsListed(asUser(B), WORKSPACE_W_ID, byDeity)).toEqual([covenRow]);
      expect(await idsListed(asUser(D), WORKSPACE_X_ID, byDeity)).toEqual([elseRow]);

      await expect(idsListed(asUser(D), WORKSPACE_W_ID, byDeity)).rejects.toThrow(Forbidden);
    });
  });
});
