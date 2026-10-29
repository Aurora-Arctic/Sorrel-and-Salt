import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden, NotFound } from '@/lib/errors';
import {
  compendiumFacets,
  compendiumFacetsHeldIn,
  countCompendium,
  countCompendiumHeldIn,
  createCompendiumEntry,
  getIngredient,
  listCompendium,
  listCompendiumHeldIn,
  promoteFolkName,
  readCompendiumEntry,
  readCompendiumReview,
  setCompendiumEntryReviewed,
  updateCompendiumEntry,
} from '@/modules/ingredients';
import { A, B, D, E, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import {
  type IngredientFixture,
  type Overrides,
  makeIngredient,
  makeVariant,
  variantInput,
} from '../../../support/fixtures';
import { curatedFormId } from '../../../support/db/curated-ids';

// A curator's review mark on a compendium entry. Set and cleared by hand through
// `setCompendiumEntryReviewed` alone, and left as it was by every other curator
// write to the entry; read
// back only through the curator's own read, never through the public one.
// The table is emptied per test, so every row read back is one this file wrote.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

let herb: string;
beforeAll(async () => {
  herb = await curatedFormId(sql, 'Herb');
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  await sql`truncate retired_ingredient_slugs`;
});

const LONG_AGO = '2020-01-01 00:00:00';

function compendiumInput(
  overrides: Overrides<IngredientFixture> = {},
): Parameters<typeof createCompendiumEntry>[1] {
  const fixture = makeIngredient({ variants: [makeVariant({ form: 'Herb' })], ...overrides });
  const { workspaceId: _tier, categories: _c, substitutes, deities, variants, ...input } = fixture;
  return {
    ...input,
    substitutes: substitutes.map((name) => ({ ingredientId: null, name })),
    deities: deities.map((name) => ({ deityId: null, name })),
    variants: variants.map((variant) => variantInput(variant, { formId: herb })),
  };
}

/** A compendium entry written raw by A, as the seed writes one: never reviewed. */
const seeded = (overrides: Partial<IngredientFixture> = {}) =>
  insertIngredient(sql, makeIngredient({ workspaceId: null, ...overrides }), A.id);

/** A coven's own ingredient, in W unless named. */
const local = (workspaceId = WORKSPACE_W_ID) =>
  insertIngredient(
    sql,
    makeIngredient({ workspaceId, nomenclature: 'none', canonicalName: null }),
    A.id,
  );

async function markOf(id: string) {
  const [row] = await sql<
    { curator_reviewed_at: Date | null; curator_reviewed_by: string | null }[]
  >`select curator_reviewed_at, curator_reviewed_by from ingredients where id = ${id}`;
  return row;
}

async function stampsOf(id: string) {
  const [row] = await sql<{ updated_at: Date; updated_by: string }[]>`
    select updated_at, updated_by from ingredients where id = ${id}`;
  return row;
}

/** Writes the row's `updated_at` far in the past, past the trigger that would hold it. */
async function backdate(id: string): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`alter table ingredients disable trigger set_updated_at`;
    await tx`update ingredients set updated_at = ${LONG_AGO} where id = ${id}`;
    await tx`alter table ingredients enable trigger set_updated_at`;
  });
}

async function folkIdOf(ingredientId: string, name: string) {
  const [row] = await sql`
    select id from ingredient_folk_names
    where ingredient_id = ${ingredientId} and name = ${name} and deleted_at is null`;
  return row.id as string;
}

describe('setCompendiumEntryReviewed', () => {
  // The curator stands for the admin too: `assertCurator` passes either role,
  // which `tests/modules/identity/services/site-admin.test.ts` owns.
  it('lets a curator (F) set and clear the mark by direct id', async () => {
    const user = F;
    const id = await seeded();
    // Why setting it means something: the seeded row is unreviewed.
    expect((await markOf(id)).curator_reviewed_at).toBeNull();

    await setCompendiumEntryReviewed(asUser(user), id, true);
    const set = await markOf(id);
    expect(set.curator_reviewed_at).toBeInstanceOf(Date);
    expect(set.curator_reviewed_by).toBe(user.id);

    await setCompendiumEntryReviewed(asUser(user), id, false);
    expect(await markOf(id)).toEqual({ curator_reviewed_at: null, curator_reviewed_by: null });
  });

  it('refuses D even where D is a member writing in its own coven', async () => {
    const id = await seeded();
    const [membership] = await sql<{ role: string }[]>`
      select role from workspace_members where user_id = ${D.id} and workspace_id = ${WORKSPACE_X_ID}`;
    // The precondition: D may write ingredients in X, so the refusal is the curator check.
    expect(membership.role).toBe('member');

    await expect(setCompendiumEntryReviewed(asUser(D), id, true)).rejects.toBeInstanceOf(Forbidden);
  });

  it('answers NotFound for a coven own entry, and leaves it untouched', async () => {
    const id = await local();

    await expect(setCompendiumEntryReviewed(asUser(F), id, true)).rejects.toBeInstanceOf(NotFound);
    expect((await markOf(id)).curator_reviewed_at).toBeNull();
  });

  it('answers NotFound for an id that is not one', async () => {
    await expect(setCompendiumEntryReviewed(asUser(F), 'not-a-uuid', true)).rejects.toBeInstanceOf(
      NotFound,
    );
  });

  it('keeps the original date and reviewer when an entry already reviewed is marked reviewed again', async () => {
    const id = await seeded();
    await setCompendiumEntryReviewed(asUser(E), id, true);
    await sql`update ingredients set curator_reviewed_at = ${LONG_AGO} where id = ${id}`;
    const first = await markOf(id);
    // Why it could have moved: F is not E, and it is later than the first mark.
    expect(first.curator_reviewed_by).toBe(E.id);

    await setCompendiumEntryReviewed(asUser(F), id, true);

    expect(await markOf(id)).toEqual(first);
  });

  it('does not move updated_at or updated_by', async () => {
    const id = await seeded();
    await backdate(id);
    const before = await stampsOf(id);
    // Why it could have moved: a different user writes the row.
    expect(before.updated_by).not.toBe(F.id);

    await setCompendiumEntryReviewed(asUser(F), id, true);
    expect(await stampsOf(id)).toEqual(before);
    await setCompendiumEntryReviewed(asUser(F), id, false);
    expect(await stampsOf(id)).toEqual(before);
  });
});

describe('a curator write to an entry leaves the mark as it was (the owner, 2026-10-23)', () => {
  /** Reviewed by E at a date long past, or never reviewed. */
  async function entry(reviewed: boolean): Promise<string> {
    const created = await createCompendiumEntry(asUser(E), compendiumInput());
    if (reviewed) {
      await sql`update ingredients set curator_reviewed_at = ${LONG_AGO}, curator_reviewed_by = ${E.id}
        where id = ${created.id}`;
    }
    return created.id;
  }

  it('when it creates the entry, which starts unreviewed', async () => {
    const created = await createCompendiumEntry(asUser(F), compendiumInput());

    expect(await markOf(created.id)).toEqual({
      curator_reviewed_at: null,
      curator_reviewed_by: null,
    });
  });

  it.each([true, false])('when it edits the entry, reviewed being %s', async (reviewed) => {
    const id = await entry(reviewed);
    const before = await markOf(id);
    // Why an edit could have moved it: the row changes and F is not E.
    expect(before.curator_reviewed_by).toBe(reviewed ? E.id : null);

    await updateCompendiumEntry(
      asUser(F),
      id,
      compendiumInput({ description: 'A description written afresh by another curator.' }),
    );

    expect(await markOf(id)).toEqual(before);
  });

  it.each([true, false])('when it promotes a folk name, reviewed being %s', async (reviewed) => {
    const id = await seeded({ name: 'Testleaf', folkNames: ['Testwort'] });
    if (reviewed) {
      await sql`update ingredients set curator_reviewed_at = ${LONG_AGO}, curator_reviewed_by = ${E.id}
        where id = ${id}`;
    }
    const before = await markOf(id);

    await promoteFolkName(asUser(F), null, id, await folkIdOf(id, 'Testwort'));

    expect((await getIngredient(asUser(F), id)).name).toBe('Testwort');
    expect(await markOf(id)).toEqual(before);
  });

  it('never when a coven member promotes a folk name on its own entry', async () => {
    const id = await insertIngredient(
      sql,
      makeIngredient({
        workspaceId: WORKSPACE_W_ID,
        nomenclature: 'none',
        canonicalName: null,
        name: 'Testleaf',
        folkNames: ['Testwort'],
      }),
      A.id,
    );

    await promoteFolkName(asUser(A), WORKSPACE_W_ID, id, await folkIdOf(id, 'Testwort'));

    expect((await markOf(id)).curator_reviewed_at).toBeNull();
  });
});

describe('readCompendiumReview', () => {
  it('reads when a curator reviewed the entry, and null once cleared', async () => {
    const id = await seeded();
    expect(await readCompendiumReview(asUser(F), id)).toBeNull();

    await setCompendiumEntryReviewed(asUser(E), id, true);
    const [{ curator_reviewed_at: at }] = await sql<{ curator_reviewed_at: Date }[]>`
      select curator_reviewed_at from ingredients where id = ${id}`;
    expect(await readCompendiumReview(asUser(F), id)).toEqual({ reviewedAt: at });
  });

  it('refuses anyone but a curator or admin', async () => {
    const id = await seeded();
    await setCompendiumEntryReviewed(asUser(F), id, true);
    // Precondition: there is a mark to read.
    expect(await readCompendiumReview(asUser(E), id)).not.toBeNull();

    await expect(readCompendiumReview(asUser(D), id)).rejects.toBeInstanceOf(Forbidden);
  });

  it('answers NotFound for a coven own entry', async () => {
    const id = await local();
    await expect(readCompendiumReview(asUser(F), id)).rejects.toBeInstanceOf(NotFound);
  });
});

describe('the public compendium reads', () => {
  it('carry the date of the mark and never the reviewer', async () => {
    const id = await seeded();
    await setCompendiumEntryReviewed(asUser(F), id, true);
    // Precondition: the row holds both.
    expect((await markOf(id)).curator_reviewed_by).toBe(F.id);

    const page = await listCompendium({}, { limit: 26, inverted: false });
    const listed = page.find(({ node }) => node.id === id)?.node;
    expect(listed).toBeDefined();
    const entry = await getIngredient(null, id);
    const slug = (await stampsOfSlug(id)).slug;
    const shown = await readCompendiumEntry(slug);

    for (const row of [listed, entry, shown.kind === 'entry' ? shown.detail.entry : undefined]) {
      expect(row).toBeDefined();
      // The date is public; who marked it is not.
      expect(row).toHaveProperty('curatorReviewedAt', expect.any(Date));
      expect(row).not.toHaveProperty('curatorReviewedBy');
    }
  });
});

async function stampsOfSlug(id: string) {
  const [row] = await sql<{ slug: string }[]>`select slug from ingredients where id = ${id}`;
  return row;
}

describe('the Reviewed filter (M14.8)', () => {
  const PAGE = { limit: 26, inverted: false } as const;

  /** A compendium entry of its own name and no formal one, so several can stand together. */
  const named = (name: string) => seeded({ name, nomenclature: 'none', canonicalName: null });

  /** Two compendium entries, one reviewed by F, and a coven's own entry. */
  async function twoEntries() {
    const reviewed = await named('Alphawort');
    const unreviewed = await named('Betawort');
    await local();
    await setCompendiumEntryReviewed(asUser(F), reviewed, true);
    return { reviewed, unreviewed };
  }

  const idsOf = (page: Awaited<ReturnType<typeof listCompendium>>) =>
    page.map(({ node }) => node.id);

  // The curator stands for the admin, as on the mark.
  it('lists and counts the reviewed entries, or the ones needing review, for a curator (F)', async () => {
    const { reviewed, unreviewed } = await twoEntries();
    const session = asUser(F);
    // Why the filter is doing the narrowing: without it both entries list.
    expect(idsOf(await listCompendium({}, PAGE, session)).sort()).toEqual(
      [reviewed, unreviewed].sort(),
    );

    expect(idsOf(await listCompendium({ reviewed: true }, PAGE, session))).toEqual([reviewed]);
    expect(idsOf(await listCompendium({ reviewed: false }, PAGE, session))).toEqual([unreviewed]);
    expect((await countCompendium({ reviewed: true }, undefined, session)).totalCount).toBe(1);
    expect((await countCompendium({ reviewed: false }, undefined, session)).totalCount).toBe(1);
  });

  it.each([
    ['a signed-out visitor', null],
    ['a coven owner (A)', A],
  ])('refuses %s the filter, on the list, the count and the facets', async (_who, user) => {
    await twoEntries();
    const session = user && asUser(user);
    // Why it could have answered: the same read without the filter does, and a
    // curator's with it does.
    await expect(listCompendium({}, PAGE, session)).resolves.toHaveLength(2);
    await expect(listCompendium({ reviewed: true }, PAGE, asUser(F))).resolves.toHaveLength(1);

    for (const reviewed of [true, false]) {
      await expect(listCompendium({ reviewed }, PAGE, session)).rejects.toBeInstanceOf(Forbidden);
      await expect(countCompendium({ reviewed }, undefined, session)).rejects.toBeInstanceOf(
        Forbidden,
      );
      await expect(compendiumFacets({ reviewed }, session)).rejects.toBeInstanceOf(Forbidden);
    }
  });

  // The coven-held reads filter the compendium by what covens hold, and
  // must keep the gate: a read that parses the filter without it answers anyone.
  it.each([
    ['no coven picked, the cached read', []],
    ['W picked, the scoped read', [WORKSPACE_W_ID]],
  ])(
    'refuses a member (B) the filter on the coven-held list, count and facets, with %s',
    async (_what, covenIds) => {
      await twoEntries();
      const covens = { covenIds, covensNot: false };
      const member = asUser(B);
      // Why it could have answered: B belongs to W, and the same reads without the
      // filter succeed for B; a curator (F) with the same arguments succeeds.
      await expect(listCompendiumHeldIn(member, covens, {}, PAGE)).resolves.toBeDefined();
      for (const reviewed of [true, false]) {
        const filter = { reviewed };
        await expect(listCompendiumHeldIn(asUser(F), covens, filter, PAGE)).resolves.toBeDefined();
        await expect(
          countCompendiumHeldIn(asUser(F), covens, filter, undefined),
        ).resolves.toBeDefined();
        await expect(compendiumFacetsHeldIn(asUser(F), covens, filter)).resolves.toBeDefined();

        await expect(listCompendiumHeldIn(member, covens, filter, PAGE)).rejects.toBeInstanceOf(
          Forbidden,
        );
        await expect(
          countCompendiumHeldIn(member, covens, filter, undefined),
        ).rejects.toBeInstanceOf(Forbidden);
        await expect(compendiumFacetsHeldIn(member, covens, filter)).rejects.toBeInstanceOf(
          Forbidden,
        );
      }
    },
  );

  it('counts each setting for a curator, under the rest of the filter and not its own', async () => {
    await twoEntries();
    await named('Gammawort');

    const counts = await compendiumFacets({ reviewed: true }, asUser(F));
    expect(counts.reviewed).toEqual([
      { value: 'reviewed', count: 1 },
      { value: 'needs_review', count: 2 },
    ]);
    // Under the rest of the filter: a search for one name counts that one.
    const searched = await compendiumFacets({ query: 'Gammawort' }, asUser(F));
    expect(searched.reviewed).toEqual([
      { value: 'reviewed', count: 0 },
      { value: 'needs_review', count: 1 },
    ]);
  });

  it('gives the counts to nobody else, and the rest of the facets unchanged', async () => {
    await twoEntries();
    const curator = await compendiumFacets({}, asUser(F));
    // The precondition: there are counts to withhold.
    expect(curator.reviewed).toHaveLength(2);

    for (const session of [null, asUser(A), asUser(D)]) {
      const facets = await compendiumFacets({}, session);
      expect(facets.reviewed).toBeNull();
      expect(facets.toxic).toEqual(curator.toxic);
    }
  });
});
