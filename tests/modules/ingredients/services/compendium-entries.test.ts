import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { findIngredientsInSpellsIncludingSoftDeleted } from '@/db/repository';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { Forbidden, NotFound, ValidationError } from '@/lib/errors';
import { ingredientSlug } from '@/lib/slugify';
import {
  categoriesOf,
  countCompendium,
  createWorkspaceIngredient,
  createCompendiumEntry,
  deitiesOf,
  deleteCompendiumEntry,
  findPossibleDuplicates,
  folkNamesOf,
  getIngredient,
  getWorkspaceIngredient,
  listCompendium,
  referencesOf,
  resolveCompendiumSlug,
  substitutesOf,
  suggestCommonNames,
  suggestIngredients,
  updateCompendiumEntry,
} from '@/modules/ingredients';
import type { CompendiumIngredientInput } from '@/modules/ingredients/validation/ingredient';
import { assertMembership } from '@/modules/coven';
import {
  suggestDeities,
  suggestForms,
  suggestPlanets,
  suggestZodiacSigns,
} from '@/modules/vocabulary';
import type { PageRequest } from '@/lib/types';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { curatedDeityId, curatedFormId } from '../../../support/db/curated-ids';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { insertReference, insertReferenceLink } from '../../../support/db/insert-reference';
import { insertSpell } from '../../../support/db/insert-spell';
import {
  type IngredientFixture,
  type Overrides,
  makeIngredient,
  makeSpell,
  stated,
} from '../../../support/fixtures';

// Story 17's service: the compendium's writes, which the site admin makes and
// nobody else does, whatever their standing in a coven (claude-docs/db/compendium-writes.md,
// "Compendium writes"). The table is emptied per test, so every row a result
// could come from is one this file wrote.

// The holder lookup, wrapped so one test can have the holder gone by the time
// it is read without changing what it answers for the rest.
const repository = vi.hoisted(() => ({ findCompendiumEntryByIdentity: vi.fn() }));
vi.mock('@/db/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/repository')>();
  repository.findCompendiumEntryByIdentity.mockImplementation(actual.findCompendiumEntryByIdentity);
  return { ...actual, ...repository };
});

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

// The live curated forms by folded name, read once: a compendium entry's form
// is a pick (MB.167), so `entry` picks the row its text names unless the test
// states a `formId`, as the admin's autofill would.
let formIds: Map<string, string>;
beforeAll(async () => {
  const rows = await sql`
    select ingredient_forms.id, lower(ingredient_forms.name) as fold from ingredient_forms
    join ingredient_form_groups on ingredient_form_groups.id = group_id
    where ingredient_forms.deleted_at is null and ingredient_form_groups.deleted_at is null`;
  formIds = new Map(rows.map((row) => [row.fold as string, row.id as string]));
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

/**
 * The fixture as the service's input: everything but the tier and the
 * category names, its substitutes and deities typed.
 */
function inputOf(fixture: IngredientFixture): CompendiumIngredientInput {
  const { workspaceId: _tier, categories: _categories, substitutes, deities, ...input } = fixture;
  return {
    ...input,
    substitutes: substitutes.map((name) => ({ ingredientId: null, name })),
    deities: deities.map((name) => ({ deityId: null, name })),
  };
}

/** The fixture as an admin's input, its form picked unless `formId` is stated. */
function entry(overrides: Overrides<IngredientFixture> = {}): CompendiumIngredientInput {
  const input = inputOf(makeIngredient(overrides));
  if (stated(overrides, 'formId') || input.form == null) return input;
  return { ...input, formId: formIds.get(input.form.trim().toLowerCase()) ?? null };
}

/** Seeds a row through the shared inserter, stamped by A — not through the code under test. */
const seed = (overrides: Overrides<IngredientFixture> = {}) =>
  insertIngredient(sql, makeIngredient(overrides), A.id);

async function rowOf(id: string) {
  const [row] = await sql`select * from ingredients where id = ${id}`;
  return row;
}

const countIngredients = async () => {
  const [row] = await sql`select count(*)::int as n from ingredients`;
  return row.n as number;
};

const liveFolkNames = async (ingredientId: string) =>
  (
    await sql`
      select name from ingredient_folk_names
      where ingredient_id = ${ingredientId} and deleted_at is null`
  )
    .map((row) => row.name as string)
    .sort();

// Between them every workspace role there is, and a coven that is not W: none
// of it is the site role, which is the one thing a compendium write turns on.
const NON_ADMINS = [
  ['an owner of a coven', A],
  ['a member of a coven', B],
  ['a viewer in a coven', C],
  ['a member of another coven', D],
] as const;

const admin = asUser(E);

// Why a refusal of any of them could have been something else: the session
// the service reads says `user`, and E's says `admin`.
it('is testing sessions whose site role is `user`, beside an admin', () => {
  for (const [, user] of NON_ADMINS) expect(asUser(user).role).toBe('user');
  expect(admin.role).toBe('admin');
});

describe('createCompendiumEntry', () => {
  it('lets the site admin create one, in the compendium and stamped by them', async () => {
    const created = await createCompendiumEntry(admin, entry());

    expect(created).toMatchObject({
      workspaceId: null,
      name: 'Testwort',
      canonicalName: 'Fixtura testalis',
      nomenclature: 'botanical',
      // The fixture's `herb`, in the curated row's spelling (MB.162).
      form: 'Herb',
      createdBy: E.id,
      updatedBy: E.id,
      deletedAt: null,
    });
    expect(created.slug).toBe(ingredientSlug('Testwort', 'herb', 'Fixtura testalis'));
  });

  it('saves several elements, planets, signs and colours, each in the order entered', async () => {
    const created = await createCompendiumEntry(admin, {
      ...entry(),
      elements: ['spirit', 'air'],
      planets: ['Venus', 'Moon'],
      zodiacSigns: ['Taurus', 'Libra'],
      colors: ['Green', '', 'Pink'],
    });

    expect(await rowOf(created.id)).toMatchObject({
      elements: ['spirit', 'air'],
      planets: ['Venus', 'Moon'],
      zodiac_signs: ['Taurus', 'Libra'],
      colors: ['Green', 'Pink'],
    });
  });

  it('writes the folk names with the entry, stamped by the admin', async () => {
    const created = await createCompendiumEntry(
      admin,
      entry({ folkNames: ['Test Root', 'Fixture Herb'] }),
    );

    const rows = await sql`
      select name, created_by from ingredient_folk_names where ingredient_id = ${created.id}`;
    expect(rows.map((row) => row.name).sort()).toEqual(['Fixture Herb', 'Test Root']);
    expect(rows.every((row) => row.created_by === E.id)).toBe(true);
  });

  it.each(NON_ADMINS)('refuses %s, writing nothing', async (_who, user) => {
    await expect(createCompendiumEntry(asUser(user), entry())).rejects.toThrow(Forbidden);
    expect(await countIngredients()).toBe(0);
  });

  it('refuses a non-admin before reading the input, so a bad one earns the same refusal', async () => {
    await expect(
      createCompendiumEntry(asUser(B), { ...entry(), name: '   ' }),
    ).rejects.toBeInstanceOf(Forbidden);
  });

  it.each([
    ['left out', undefined],
    ['null', null],
  ])(
    'refuses an entry whose nomenclature is %s, before it reaches the database',
    async (_how, nomenclature) => {
      const attempt = createCompendiumEntry(admin, {
        ...entry(),
        nomenclature,
      } as unknown as CompendiumIngredientInput);

      // A ValidationError on the field is the parse's: the column's NOT NULL
      // would have answered with a driver error instead.
      await expect(attempt).rejects.toThrow(ValidationError);
      await expect(attempt).rejects.toMatchObject({
        issues: [
          { path: ['nomenclature'], message: 'Choose a classification — or "none" or "unknown"' },
        ],
      });
      expect(await countIngredients()).toBe(0);
    },
  );

  it('ignores a workspaceId in the input, so the entry lands in the compendium', async () => {
    const input = { ...entry(), workspaceId: WORKSPACE_W_ID } as CompendiumIngredientInput;

    const created = await createCompendiumEntry(admin, input);

    expect((await rowOf(created.id)).workspace_id).toBeNull();
  });
});

describe('updateCompendiumEntry', () => {
  it('lets the site admin rewrite it, stamping updated_by and keeping created_by', async () => {
    const id = await seed();

    const updated = await updateCompendiumEntry(admin, id, entry({ name: 'Testwort, relabelled' }));

    expect(updated).toMatchObject({
      id,
      workspaceId: null,
      name: 'Testwort, relabelled',
      createdBy: A.id,
      updatedBy: E.id,
    });
  });

  it('replaces the whole row, clearing a field the input leaves out', async () => {
    const id = await seed({ description: 'A fixture described' });

    await updateCompendiumEntry(admin, id, { ...entry(), description: undefined });

    expect((await rowOf(id)).description).toBeNull();
  });

  it('replaces each list whole, an empty one clearing it', async () => {
    const id = await seed({
      elements: ['water'],
      planets: ['Moon', 'Venus'],
      zodiacSigns: ['Cancer'],
      colors: ['Silver'],
    });

    await updateCompendiumEntry(admin, id, {
      ...entry(),
      elements: ['fire', 'water'],
      planets: ['Mars'],
      zodiacSigns: [],
      colors: ['White', 'Silver'],
    });

    expect(await rowOf(id)).toMatchObject({
      elements: ['fire', 'water'],
      planets: ['Mars'],
      zodiac_signs: null,
      colors: ['White', 'Silver'],
    });
  });

  it('brings its folk names to the list given, tombstoning the dropped as the admin', async () => {
    const id = await seed({ folkNames: ['Dropped Root', 'Kept Root'] });

    await updateCompendiumEntry(admin, id, entry({ folkNames: ['Kept Root', 'Added Root'] }));

    expect(await liveFolkNames(id)).toEqual(['Added Root', 'Kept Root']);
    const [dropped] = await sql`
      select deleted_by from ingredient_folk_names
      where ingredient_id = ${id} and name = ${'Dropped Root'}`;
    expect(dropped.deleted_by).toBe(E.id);
  });

  it.each(NON_ADMINS)('refuses %s and leaves the entry as it was', async (_who, user) => {
    const id = await seed();
    const before = await rowOf(id);

    await expect(
      updateCompendiumEntry(asUser(user), id, entry({ name: 'Testwort, relabelled' })),
    ).rejects.toThrow(Forbidden);

    // `updated_at` included: a refused write that had touched the row first
    // would have moved it, by the trigger.
    expect(await rowOf(id)).toEqual(before);
  });

  it("does not reach a coven's ingredient by direct id, the admin's own call included", async () => {
    const id = await seed({ workspaceId: WORKSPACE_W_ID });
    const before = await rowOf(id);
    // Why it could have been written: the row is there, and its coven reaches it by this id.
    await expect(getWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, id)).resolves.toMatchObject({
      id,
    });

    await expect(
      updateCompendiumEntry(admin, id, entry({ name: 'Testwort, relabelled' })),
    ).rejects.toThrow(NotFound);
    expect(await rowOf(id)).toEqual(before);
  });

  it('answers NotFound for a soft-deleted entry, leaving it as it was', async () => {
    const id = await seed();
    await sql`update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${id}`;
    const before = await rowOf(id);

    await expect(updateCompendiumEntry(admin, id, entry())).rejects.toThrow(NotFound);
    expect(await rowOf(id)).toEqual(before);
  });

  it('answers NotFound for an id that names nothing, and for one that is not a uuid', async () => {
    await expect(
      updateCompendiumEntry(admin, '99999999-9999-9999-9999-999999999999', entry()),
    ).rejects.toThrow(NotFound);
    await expect(updateCompendiumEntry(admin, 'not-a-uuid', entry())).rejects.toThrow(NotFound);
  });

  it('refuses an entry without a nomenclature, changing nothing', async () => {
    const id = await seed();
    const before = await rowOf(id);

    await expect(
      updateCompendiumEntry(admin, id, {
        ...entry(),
        nomenclature: undefined,
      } as unknown as CompendiumIngredientInput),
    ).rejects.toMatchObject({ issues: [expect.objectContaining({ path: ['nomenclature'] })] });
    expect(await rowOf(id)).toEqual(before);
  });
});

describe('deleteCompendiumEntry', () => {
  it('lets the site admin soft-delete it, stamping deleted_by and keeping the row', async () => {
    const id = await seed();

    await deleteCompendiumEntry(admin, id);

    const row = await rowOf(id);
    expect(row).toMatchObject({ deleted_by: E.id, created_by: A.id });
    expect(row.deleted_at).toBeInstanceOf(Date);
  });

  it.each(NON_ADMINS)('refuses %s and leaves the entry as it was', async (_who, user) => {
    const id = await seed();
    const before = await rowOf(id);

    await expect(deleteCompendiumEntry(asUser(user), id)).rejects.toThrow(Forbidden);
    expect(await rowOf(id)).toEqual(before);
  });

  it("does not reach a coven's ingredient by direct id, the admin's own call included", async () => {
    const id = await seed({ workspaceId: WORKSPACE_W_ID });
    const before = await rowOf(id);
    await expect(getWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, id)).resolves.toMatchObject({
      id,
    });

    await expect(deleteCompendiumEntry(admin, id)).rejects.toThrow(NotFound);
    expect(await rowOf(id)).toEqual(before);
  });

  it('answers NotFound for an entry already deleted, leaving who deleted it', async () => {
    const id = await seed();
    await sql`update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${id}`;
    const before = await rowOf(id);

    await expect(deleteCompendiumEntry(admin, id)).rejects.toThrow(NotFound);
    expect(await rowOf(id)).toEqual(before);
  });

  it('answers NotFound for an id that names nothing, and for one that is not a uuid', async () => {
    await expect(
      deleteCompendiumEntry(admin, '99999999-9999-9999-9999-999999999999'),
    ).rejects.toThrow(NotFound);
    await expect(deleteCompendiumEntry(admin, 'not-a-uuid')).rejects.toThrow(NotFound);
  });
});

// Story 25's promise, over the compendium: a deleted entry is gone from every
// read, and what it held is free again, while its row stays for a restore
// (claude-docs/db/compendium-writes.md, "Compendium writes").
describe('a deleted entry', () => {
  /** Room for every row a test here writes, so one page is the whole answer. */
  const PAGE: PageRequest = { limit: 26, inverted: false };
  const SLUG = 'testwort-herb-fixtura-testalis';
  const MOVED_OFF = 'testwort-before-a-relabel';

  /** Whether `read` answers, rather than refusing with NotFound. */
  const answers = <T>(read: Promise<T>, shows: (answer: T) => boolean) =>
    read.then(shows, (error: unknown) => {
      if (error instanceof NotFound) return false;
      throw error;
    });

  const member = asUser(B);

  // Every exported read an entry reaches anyone through — signed out, and a
  // coven's member typing into a form — each asked whether it still shows
  // this one: what owns the soft-delete filter of each, so no reader carries
  // a one-off of its own.
  const READS: [string, (id: string) => Promise<boolean>][] = [
    [
      'the compendium list',
      async (id) => (await listCompendium({}, PAGE)).some(({ node }) => node.id === id),
    ],
    ['the compendium count', async () => (await countCompendium({}, undefined)).totalCount > 0],
    ['a read by id', (id) => answers(getIngredient(null, id), (row) => row.id === id)],
    [
      'its address',
      (id) =>
        answers(
          resolveCompendiumSlug(SLUG),
          (address) => address.kind === 'entry' && address.entry.id === id,
        ),
    ],
    [
      'the address it moved off',
      () =>
        answers(
          resolveCompendiumSlug(MOVED_OFF),
          (address) => address.kind === 'moved' && address.slug === SLUG,
        ),
    ],
    [
      'its folk names',
      async (id) => {
        const [names] = await folkNamesOf(null, [{ id, workspaceId: null }]);
        return Array.isArray(names) && names.length > 0;
      },
    ],
    [
      'its categories',
      async (id) => {
        const [filed] = await categoriesOf(null, [{ id, workspaceId: null }]);
        return Array.isArray(filed) && filed.length > 0;
      },
    ],
    [
      'its substitutes',
      async (id) => {
        const [listed] = await substitutesOf(null, [{ id, workspaceId: null }]);
        return Array.isArray(listed) && listed.length > 0;
      },
    ],
    [
      'its deities',
      async (id) => {
        const [listed] = await deitiesOf(null, [{ id, workspaceId: null }]);
        return Array.isArray(listed) && listed.length > 0;
      },
    ],
    [
      'its references',
      async (id) => {
        const [cited] = await referencesOf(null, [{ id, workspaceId: null }]);
        return Array.isArray(cited) && cited.length > 0;
      },
    ],
    // A new link cannot reach a deleted ingredient, as a new spell layer cannot (M5.3).
    [
      "a coven's substitute picker",
      async (id) =>
        (await suggestIngredients(member, WORKSPACE_W_ID, 'Testwort', PAGE)).some(
          ({ node }) => node.id === id,
        ),
    ],
    [
      "a coven's duplicate warning",
      async (id) =>
        (await findPossibleDuplicates(member, WORKSPACE_W_ID, 'Testwort', PAGE)).some(
          ({ node }) => node.id === id,
        ),
    ],
    [
      "a coven's common-name suggestions",
      async () =>
        (await suggestCommonNames(member, WORKSPACE_W_ID, 'Testwort', PAGE)).some(({ node }) =>
          node.claimants.some((claimant) => claimant.name === 'Testwort'),
        ),
    ],
    [
      "a coven's form suggestions",
      async () =>
        (await suggestForms(member, WORKSPACE_W_ID, 'herb', PAGE)).some(({ node }) =>
          node.claimants.some((claimant) => claimant.name === 'Testwort'),
        ),
    ],
    [
      "a coven's planet suggestions",
      async () =>
        (await suggestPlanets(member, WORKSPACE_W_ID, 'fixture star', PAGE)).some(
          ({ node }) => node.value === 'Fixture Star',
        ),
    ],
    [
      "a coven's sign suggestions",
      async () =>
        (await suggestZodiacSigns(member, WORKSPACE_W_ID, 'fixture sign', PAGE)).some(
          ({ node }) => node.value === 'Fixture Sign',
        ),
    ],
    [
      "a coven's deity suggestions",
      async () =>
        (await suggestDeities(member, WORKSPACE_W_ID, 'fixture deity', PAGE)).some(
          ({ node }) => node.value === 'Fixture Deity',
        ),
    ],
  ];

  it.each(READS)('is gone from %s, which showed it until the delete', async (_read, shows) => {
    const id = await seed({
      folkNames: ['Test Root'],
      categories: ['Protection'],
      substitutes: ['Fixture Stand-in'],
      deities: ['Fixture Deity'],
      planets: ['Fixture Star'],
      zodiacSigns: ['Fixture Sign'],
    });
    await insertReferenceLink(sql, id, await insertReference(sql, {}, A.id), A.id);
    await sql`
      insert into retired_ingredient_slugs ${sql({
        ingredient_id: id,
        slug: MOVED_OFF,
        created_by: A.id,
        updated_by: A.id,
      })}`;
    // Why the read could have gone on showing it: it does, until the delete.
    expect(await shows(id)).toBe(true);

    await deleteCompendiumEntry(admin, id);

    expect(await shows(id)).toBe(false);
  });

  // M4.1a's partial index, through the service: without its `deleted_at IS
  // NULL`, deleting an entry would reserve its identity for good. On the
  // formal name, since two live entries may share a label anyway, so a label
  // coming back proves nothing about the index.
  it('frees its formal name and form for a new entry under another label', async () => {
    const id = await seed();
    const again = entry({ name: 'Fixture Leaf' });
    // Why the write could only go through by the delete: while the entry is
    // live, the identity index refuses it, and on nothing but the formal name.
    await expect(createCompendiumEntry(admin, again)).rejects.toMatchObject({
      issues: [{ path: ['canonicalName'] }],
    });

    await deleteCompendiumEntry(admin, id);
    const created = await createCompendiumEntry(admin, again);

    expect(created).toMatchObject({
      name: 'Fixture Leaf',
      canonicalName: 'Fixtura testalis',
      form: 'Herb',
    });
    const keys = await sql`
      select distinct canonical_key from ingredients where id in ${sql([id, created.id])}`;
    expect(keys).toHaveLength(1);
  });

  it('frees its address too, so the whole entry can be added again', async () => {
    const id = await seed();
    await expect(createCompendiumEntry(admin, entry())).rejects.toThrow(ValidationError);

    await deleteCompendiumEntry(admin, id);
    const created = await createCompendiumEntry(admin, entry());

    expect(created.id).not.toBe(id);
    expect(created.slug).toBe((await rowOf(id)).slug);
    await expect(resolveCompendiumSlug(SLUG)).resolves.toMatchObject({
      kind: 'entry',
      entry: { id: created.id },
    });
  });

  // A spell is a record of a working: what went into the jar stays in it
  // (claude-docs/db/spell-visibility.md, "What a spell holds").
  it('stays in a spell that holds it, for every member who may read the spell', async () => {
    const id = await seed();
    await insertSpell(sql, makeSpell({ layers: [{ ingredientId: id }] }), B.id);

    await deleteCompendiumEntry(admin, id);

    // Why only the spell could still answer it: the entry's own read has let it go.
    await expect(getIngredient(null, id)).rejects.toThrow(NotFound);
    const viewer = await assertMembership(asUser(C), WORKSPACE_W_ID, { spell: ['read'] });
    await expect(findIngredientsInSpellsIncludingSoftDeleted(viewer, [id])).resolves.toEqual([
      expect.objectContaining({ id, deletedBy: E.id }),
    ]);
  });

  // A layer is the spell's, and leaves it only when a member takes it out (MB.110).
  it('leaves every layer holding it as it was', async () => {
    const id = await seed();
    const spellId = await insertSpell(sql, makeSpell({ layers: [{ ingredientId: id }] }), B.id);
    const layerOf = async () => {
      const [layer] = await sql`select * from spell_ingredients where spell_id = ${spellId}`;
      return layer;
    };
    const before = await layerOf();

    await deleteCompendiumEntry(admin, id);

    // Why the layer could have been touched: what it holds is a tombstone now.
    const [ingredient] = await sql`select deleted_at from ingredients where id = ${id}`;
    expect(ingredient.deleted_at).toBeInstanceOf(Date);
    const after = await layerOf();
    expect(after.deleted_at).toBeNull();
    expect(after).toEqual(before);
  });

  // Two rows now carry the key, and the holder lookup reads by the key alone.
  it('is not the entry a later collision names', async () => {
    const id = await seed();
    await deleteCompendiumEntry(admin, id);
    await createCompendiumEntry(admin, entry({ name: 'Fixture Leaf' }));

    await expect(
      createCompendiumEntry(admin, entry({ name: 'Fixture Root' })),
    ).rejects.toMatchObject({
      issues: [
        {
          path: ['canonicalName'],
          message: 'Already in the compendium as "Fixture Leaf" (Fixtura testalis, Herb)',
        },
      ],
    });
  });
});

// The compendium's two unique indexes, each met as a `ValidationError` on the
// field that caused it rather than as the raw index error — and the identity
// one naming the entry that holds the identity (DESIGN.md §5).
describe('a collision with another compendium entry', () => {
  /** The issues a refused write carried; fails the test if it was not refused that way. */
  async function issuesOf(attempt: Promise<unknown>) {
    const error = await attempt.then(
      () => expect.fail('the write was not refused'),
      (thrown: unknown) => thrown,
    );
    expect(error).toBeInstanceOf(ValidationError);
    return (error as ValidationError).issues;
  }

  it('refuses a formal name and form already in the compendium, on `canonicalName`, naming the entry', async () => {
    await seed();

    const issues = await issuesOf(createCompendiumEntry(admin, entry({ name: 'Fixture Leaf' })));

    expect(issues).toEqual([
      {
        path: ['canonicalName'],
        message: 'Already in the compendium as "Testwort" (Fixtura testalis, herb)',
      },
    ]);
    expect(await countIngredients()).toBe(1);
  });

  // The COALESCE case: the label keys as the other entry's formal name, and
  // the admin filled in no formal name for the message to sit beside.
  it("refuses a label that is another entry's formal name, on `name`, naming that entry", async () => {
    await seed();

    const issues = await issuesOf(
      createCompendiumEntry(admin, entry({ name: 'Fixtura Testalis', nomenclature: 'none' })),
    );

    expect(issues).toEqual([
      {
        path: ['name'],
        message: 'Already in the compendium as "Testwort" (Fixtura testalis, herb)',
      },
    ]);
  });

  it("refuses a rewrite onto another entry's identity, leaving the row as it was", async () => {
    await seed({ name: 'Testwort', form: 'root' });
    const id = await seed({ name: 'Testwort', form: 'leaf' });
    const before = await rowOf(id);

    const issues = await issuesOf(updateCompendiumEntry(admin, id, entry({ form: 'Root' })));

    expect(issues).toEqual([
      {
        path: ['canonicalName'],
        message: 'Already in the compendium as "Testwort" (Fixtura testalis, root)',
      },
    ]);
    expect(await rowOf(id)).toEqual(before);
  });

  it('names no entry when the holder is gone by the time it is read, rather than surfacing the raw error', async () => {
    await seed();
    repository.findCompendiumEntryByIdentity.mockResolvedValueOnce(undefined);

    expect(await issuesOf(createCompendiumEntry(admin, entry({ name: 'Fixture Leaf' })))).toEqual([
      { path: ['canonicalName'], message: 'Already in the compendium' },
    ]);
  });

  it('refuses a name whose address another entry already has, on `name`', async () => {
    await seed({ name: 'Testwort', nomenclature: 'none', form: 'root' });

    // Why only the slug index is left to catch it: label and identity both differ.
    expect(ingredientSlug('Testwort Root', null, null)).toBe(
      ingredientSlug('Testwort', 'root', null),
    );

    expect(
      await issuesOf(
        createCompendiumEntry(
          admin,
          entry({ name: 'Testwort Root', nomenclature: 'none', form: null }),
        ),
      ),
    ).toEqual([
      {
        path: ['name'],
        message:
          '"Testwort" (root) already has the address "testwort-root" — change the name, form or formal name',
      },
    ]);
  });

  it('lets two entries share a label, told apart by their formal names', async () => {
    await seed();

    await expect(
      createCompendiumEntry(admin, entry({ nomenclature: 'fungal' })),
    ).resolves.toMatchObject({ name: 'Testwort', canonicalName: 'Fixturomyces testalis' });
  });

  it("does not collide with a coven's ingredient, which is not the compendium's", async () => {
    await seed({ workspaceId: WORKSPACE_W_ID });

    await expect(createCompendiumEntry(admin, entry())).resolves.toMatchObject({
      workspaceId: null,
    });
  });
});

// MB.82's rule (claude-docs/db/ingredient-slugs.md, "Ingredient slugs"): the address follows the
// label, the form and the formal name; the one it leaves redirects to the entry
// for 180 days; and a write that would take another entry's redirected address
// ends that redirect only once the admin confirms it. The clock is pinned, so
// every window below is exact.
describe('the slug', () => {
  const NOW = new Date('2026-03-01T12:00:00.000Z');
  // Midnight of 1 March, plus 180 days.
  const EXPIRES = new Date('2026-08-28T00:00:00.000Z');

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const retirements = () =>
    sql`
      select ingredient_id, workspace_id, slug, retired_at, expires_at, created_by
      from retired_ingredient_slugs order by retired_at, slug`;

  /** An issue list, or the test fails because the write went through. */
  async function issuesOf(attempt: Promise<unknown>) {
    const error = await attempt.then(
      () => expect.fail('the write was not refused'),
      (thrown: unknown) => thrown,
    );
    expect(error).toBeInstanceOf(ValidationError);
    return (error as ValidationError).issues;
  }

  it.each([
    ['label', { name: 'Testwort, relabelled' }, 'testwort-relabelled-herb-fixtura-testalis'],
    ['form', { form: 'root' }, 'testwort-root-fixtura-testalis'],
    ['formal name', { canonicalName: 'Fixtura altera' }, 'testwort-herb-fixtura-altera'],
  ] as const)(
    'moves with the %s, retiring the old one as the admin',
    async (_part, change, moved) => {
      const id = await seed();

      const updated = await updateCompendiumEntry(admin, id, entry(change));

      expect(updated.slug).toBe(moved);
      expect(await retirements()).toEqual([
        {
          ingredient_id: id,
          workspace_id: null,
          slug: 'testwort-herb-fixtura-testalis',
          retired_at: NOW,
          expires_at: EXPIRES,
          created_by: E.id,
        },
      ]);
    },
  );

  it('stays put, retiring nothing, when none of the three changes', async () => {
    const id = await seed();

    const updated = await updateCompendiumEntry(admin, id, entry({ description: 'Redescribed' }));

    expect(updated.slug).toBe('testwort-herb-fixtura-testalis');
    expect(await retirements()).toEqual([]);
  });

  it('takes its own old slug back at once, without a confirmation', async () => {
    const id = await seed();
    await updateCompendiumEntry(admin, id, entry({ name: 'Testwort, relabelled' }));

    const back = await updateCompendiumEntry(admin, id, entry());

    expect(back.slug).toBe('testwort-herb-fixtura-testalis');
  });

  describe('an address another entry moved off, inside its window', () => {
    let movedId: string;

    // Graveyard-dirt-shaped: no formal name, so the relabel frees the identity
    // and a new entry may spell the old address.
    beforeEach(async () => {
      movedId = await seed({ name: 'Testdirt', nomenclature: 'none', form: 'earth' });
      await updateCompendiumEntry(
        admin,
        movedId,
        entry({ name: 'Testsoil', nomenclature: 'none', form: 'earth' }),
      );
    });

    const taker = () => entry({ name: 'Testdirt', nomenclature: 'none', form: 'earth' });

    it('refuses a create that would end its redirect, on `endRedirect`, writing nothing', async () => {
      const issues = await issuesOf(createCompendiumEntry(admin, taker()));

      expect(issues).toEqual([
        {
          path: ['endRedirect'],
          message:
            '"testdirt-earth" redirects to "Testsoil" (Earth) until 28 August 2026, 00:00 UTC — confirm to end that redirect',
        },
      ]);
      expect(await countIngredients()).toBe(1);
    });

    it('refuses a rename into it the same way, leaving the row as it was', async () => {
      const id = await seed({ name: 'Testclay', nomenclature: 'none', form: 'earth' });
      const before = await rowOf(id);

      const [issue] = await issuesOf(updateCompendiumEntry(admin, id, taker()));

      expect(issue.path).toEqual(['endRedirect']);
      expect(await rowOf(id)).toEqual(before);
    });

    it('lets a confirmed write take it, keeping the retirement that says where the old entry went', async () => {
      const created = await createCompendiumEntry(admin, { ...taker(), endRedirect: true });

      expect(created.slug).toBe('testdirt-earth');
      expect((await retirements()).map((row) => row.ingredient_id)).toEqual([movedId]);
    });

    it('answers the new entry there, naming the one that moved, until the window closes', async () => {
      const created = await createCompendiumEntry(admin, { ...taker(), endRedirect: true });

      await expect(resolveCompendiumSlug('testdirt-earth')).resolves.toEqual({
        kind: 'entry',
        entry: expect.objectContaining({ id: created.id }),
        movedAway: expect.objectContaining({ id: movedId, slug: 'testsoil-earth' }),
      });

      vi.setSystemTime(EXPIRES);
      await expect(resolveCompendiumSlug('testdirt-earth')).resolves.toMatchObject({
        kind: 'entry',
        movedAway: null,
      });
    });

    it('asks nothing once the window has closed', async () => {
      vi.setSystemTime(EXPIRES);

      await expect(createCompendiumEntry(admin, taker())).resolves.toMatchObject({
        slug: 'testdirt-earth',
      });
    });
  });

  it("refuses a rewrite onto another entry's current address, on `name`, naming it", async () => {
    await seed({ name: 'Testwort', nomenclature: 'none', form: 'root' });
    const id = await seed({ name: 'Testwort', nomenclature: 'none', form: 'leaf' });

    expect(
      await issuesOf(
        updateCompendiumEntry(
          admin,
          id,
          entry({ name: 'Testwort Root', nomenclature: 'none', form: null }),
        ),
      ),
    ).toEqual([
      {
        path: ['name'],
        message:
          '"Testwort" (root) already has the address "testwort-root" — change the name, form or formal name',
      },
    ]);
    expect(await retirements()).toEqual([]);
  });

  it('clears the compendium retirements that have lapsed on the next slug write', async () => {
    const id = await seed();
    await updateCompendiumEntry(admin, id, entry({ name: 'Testwort, relabelled' }));
    expect(await retirements()).toHaveLength(1);

    vi.setSystemTime(EXPIRES);
    await createCompendiumEntry(admin, entry({ name: 'Testleaf', nomenclature: 'none' }));

    expect(await retirements()).toEqual([]);
  });
});

// The redirect's window and what a retirement answers are
// tests/db/repository/slugs.test.ts's (findCompendiumSlugRedirect), and the
// service's answer for a moved slug is the READS table's 'the address it moved
// off' row above: what stays here is the entry, and a coven's slug kept private.
describe('resolveCompendiumSlug', () => {
  it('answers the entry at its slug, with no session and no moved-away entry', async () => {
    const id = await seed();

    await expect(resolveCompendiumSlug('testwort-herb-fixtura-testalis')).resolves.toEqual({
      kind: 'entry',
      entry: expect.objectContaining({ id }),
      movedAway: null,
    });
  });

  it("answers NotFound for a coven's slug — its existence is private — and for one that names nothing", async () => {
    const localId = await seed({ workspaceId: WORKSPACE_W_ID });
    // Why the coven's could have answered: the row is there, at that slug.
    expect((await rowOf(localId)).slug).toBe('testwort-herb-fixtura-testalis');

    await expect(resolveCompendiumSlug('testwort-herb-fixtura-testalis')).rejects.toThrow(NotFound);
    await expect(resolveCompendiumSlug('nothing-here')).rejects.toThrow(NotFound);
  });
});

// MB.162, moved onto the links by MB.167: a compendium entry's form and
// deities each pick a curated row, and its planets and signs name one, where a
// coven's ingredients keep free text (claude-docs/db/compendium-writes.md).
// Retired vocabulary rows are put back after each test, since the clone is
// shared by the file and the seed retires nothing.
describe('the curated vocabularies a compendium entry is held to', () => {
  afterEach(async () => {
    for (const table of [
      'ingredient_forms',
      'ingredient_form_groups',
      'planets',
      'zodiac_signs',
      'deities',
      'deity_traditions',
    ]) {
      await sql`update ${sql(table)} set deleted_at = null, deleted_by = null where deleted_at is not null`;
    }
  });

  async function issuesOf(attempt: Promise<unknown>) {
    const error = await attempt.then(
      () => expect.fail('the write was not refused'),
      (thrown: unknown) => thrown,
    );
    expect(error).toBeInstanceOf(ValidationError);
    return (error as ValidationError).issues;
  }

  async function retire(table: string, name: string) {
    const rows = await sql`
      update ${sql(table)} set deleted_at = now(), deleted_by = ${E.id}
      where name = ${name} returning id`;
    // Why the value could have saved: it names a curated row, retired here.
    expect(rows).toHaveLength(1);
  }

  /** Saves `input` on a coven's ingredient: the precondition that only the tier refuses it. */
  async function savesInACoven(input: CompendiumIngredientInput) {
    const saved = await createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, {
      ...input,
      name: 'Testwort, kept',
    });
    expect(saved.workspaceId).toBe(WORKSPACE_W_ID);
    return saved;
  }

  const compendiumCount = async () => {
    const [row] = await sql`select count(*)::int as n from ingredients where workspace_id is null`;
    return row.n as number;
  };

  const liveDeities = async (ingredientId: string) =>
    sql`
      select deity_id, name from ingredient_deities
      where ingredient_id = ${ingredientId} and deleted_at is null order by position`;

  // A curated value before the stranger in each list, so the refusal is
  // placed at the entry rather than the field.
  const UNCURATED: [string, Overrides<IngredientFixture>, (string | number)[], string][] = [
    ['planets', { planets: ['Venus', 'Testplanet'] }, ['planets', 1], 'Testplanet'],
    ['zodiacSigns', { zodiacSigns: ['Taurus', 'Testsign'] }, ['zodiacSigns', 1], 'Testsign'],
  ];

  it.each(UNCURATED)(
    'refuses an uncurated %s on create, beside it, that a coven saves',
    async (_field, overrides, path, value) => {
      await savesInACoven(entry(overrides));

      const issues = await issuesOf(createCompendiumEntry(admin, entry(overrides)));

      expect(issues).toEqual([{ path, message: expect.stringContaining(`"${value}"`) }]);
      expect(await compendiumCount()).toBe(0);
    },
  );

  it.each(UNCURATED)(
    'refuses an uncurated %s on update, beside it, and leaves the entry as it was',
    async (_field, overrides, path, value) => {
      await savesInACoven(entry(overrides));
      const id = await seed({ name: 'Testwort' });

      const issues = await issuesOf(
        updateCompendiumEntry(admin, id, entry({ name: 'Testwort, relabelled', ...overrides })),
      );

      expect(issues).toEqual([{ path, message: expect.stringContaining(`"${value}"`) }]);
      expect((await rowOf(id)).name).toBe('Testwort');
    },
  );

  // MB.167: a form and a deity are held to a pick, not a spelling — a curated
  // name typed rather than picked is refused, as an uncurated one is.
  const UNPICKED: [string, Overrides<IngredientFixture>, (string | number)[]][] = [
    ['a typed form, curated or not', { form: 'Herb', formId: null }, ['form']],
    ['an uncurated form', { form: 'Testform', formId: null }, ['form']],
    ['a typed deity, curated or not', { deities: ['Thor'] }, ['deities', 0]],
    ['an uncurated deity', { deities: ['Testgod'] }, ['deities', 0]],
  ];

  it.each(UNPICKED)(
    'refuses %s on create and on update, beside it, that a coven saves',
    async (_case, overrides, path) => {
      await savesInACoven(entry(overrides));
      const id = await seed({ name: 'Testwort' });

      expect(await issuesOf(createCompendiumEntry(admin, entry(overrides)))).toEqual([
        { path, message: expect.any(String) },
      ]);
      expect(
        await issuesOf(
          updateCompendiumEntry(admin, id, entry({ name: 'Testwort, relabelled', ...overrides })),
        ),
      ).toEqual([{ path, message: expect.any(String) }]);
      expect(await compendiumCount()).toBe(1);
      expect((await rowOf(id)).name).toBe('Testwort');
    },
  );

  // A two-tier row is curated only while its group or tradition is live too.
  const RETIRED: [string, string, string, Overrides<IngredientFixture>, (string | number)[]][] = [
    ['a retired planet', 'planets', 'Mars', { planets: ['Venus', 'Mars'] }, ['planets', 1]],
    ['a retired sign', 'zodiac_signs', 'Aries', { zodiacSigns: ['Aries'] }, ['zodiacSigns', 0]],
  ];

  it.each(RETIRED)(
    'refuses %s on create and on update, that a coven saves',
    async (_case, table, retired, overrides, path) => {
      const id = await seed({ name: 'Testwort' });
      // Why the write could have saved: the value is curated until retired.
      await expect(
        updateCompendiumEntry(admin, id, entry({ name: 'Testwort', ...overrides })),
      ).resolves.toBeDefined();

      await retire(table, retired);
      await savesInACoven(entry(overrides));

      expect(
        await issuesOf(
          createCompendiumEntry(
            admin,
            entry({ name: 'Testbloom', canonicalName: 'Fixtura floris', ...overrides }),
          ),
        ),
      ).toEqual([{ path, message: expect.any(String) }]);
      expect(
        await issuesOf(updateCompendiumEntry(admin, id, entry({ name: 'Testwort', ...overrides }))),
      ).toEqual([{ path, message: expect.any(String) }]);
    },
  );

  // A pick of a retired row is refused on either tier (MB.167); what the
  // compendium adds is that a pick it already holds is refused too, where a
  // coven's is kept, so no compendium entry goes on holding an uncurated one.
  const RETIRED_PICKS: [string, string, string, (string | number)[]][] = [
    ['a retired form', 'ingredient_forms', 'Leaf', ['formId']],
    ['a form of a retired group', 'ingredient_form_groups', 'Botanical', ['formId']],
    ['a retired deity', 'deities', 'Thor', ['deities', 0]],
    ['a deity of a retired tradition', 'deity_traditions', 'Norse', ['deities', 0]],
  ];

  it.each(RETIRED_PICKS)(
    'refuses %s, picked anew or already held',
    async (_case, table, retired, path) => {
      const picks = {
        ...entry({ name: 'Testwort', form: 'Leaf' }),
        deities: [{ deityId: await curatedDeityId(sql, 'Thor') }],
      };
      const id = await seed({ name: 'Testwort' });
      // Why the write could have saved: both are curated until retired.
      await expect(updateCompendiumEntry(admin, id, picks)).resolves.toBeDefined();

      await retire(table, retired);

      expect(
        await issuesOf(
          createCompendiumEntry(admin, {
            ...picks,
            name: 'Testbloom',
            canonicalName: 'Fixtura floris',
          }),
        ),
      ).toEqual([{ path, message: expect.any(String) }]);
      expect(await issuesOf(updateCompendiumEntry(admin, id, picks))).toEqual([
        { path, message: expect.any(String) },
      ]);
    },
  );

  it('places a list refusal at the entry the input sent, blanks counted', async () => {
    const issues = await issuesOf(
      createCompendiumEntry(admin, entry({ planets: ['', 'Venus', ' ', 'Testplanet'] })),
    );

    expect(issues).toEqual([{ path: ['planets', 3], message: expect.any(String) }]);
  });

  it('refuses every unpicked or uncurated value at once, each beside its own field', async () => {
    const issues = await issuesOf(
      createCompendiumEntry(
        admin,
        entry({
          form: 'Testform',
          formId: null,
          planets: ['Testplanet'],
          deities: ['Testgod', 'Thor'],
        }),
      ),
    );

    expect(issues.map((issue) => issue.path)).toEqual([
      ['form'],
      ['planets', 0],
      ['deities', 0],
      ['deities', 1],
    ]);
  });

  it("stores a value matching a curated row but for case and spacing in the row's spelling", async () => {
    const created = await createCompendiumEntry(admin, {
      ...entry({ form: '  hERB ', planets: [' venus', 'MOON '], zodiacSigns: ['taurus'] }),
      deities: [{ deityId: await curatedDeityId(sql, 'Thor') }],
    });

    expect(await rowOf(created.id)).toMatchObject({
      form: 'Herb',
      form_id: await curatedFormId(sql, 'Herb'),
      planets: ['Venus', 'Moon'],
      zodiac_signs: ['Taurus'],
    });
    expect(await liveDeities(created.id)).toEqual([
      { deity_id: await curatedDeityId(sql, 'Thor'), name: 'Thor' },
    ]);
  });

  it("stores the row's spelling on update too, and keeps the coven's own as typed", async () => {
    const id = await seed({ name: 'Testwort' });
    const local = await savesInACoven(entry({ form: 'hERB', formId: null, planets: ['venus'] }));

    await updateCompendiumEntry(admin, id, entry({ form: 'hERB', planets: ['venus'] }));

    expect(await rowOf(id)).toMatchObject({ form: 'Herb', planets: ['Venus'] });
    expect(await rowOf(local.id)).toMatchObject({
      form: 'hERB',
      form_id: null,
      planets: ['venus'],
    });
  });
});
