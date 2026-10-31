import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { findIngredientsInSpellsIncludingSoftDeleted } from '@/db/repository';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { Forbidden, NotFound, ValidationError } from '@/lib/errors';
import { ingredientSlug } from '@/lib/slugify';
import {
  categoriesOf,
  countCompendium,
  countCompendiumEntryUsers,
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
  variantsOf,
} from '@/modules/ingredients';
import { assertMembership } from '@/modules/coven';
import {
  suggestDeities,
  suggestForms,
  suggestCelestialBodies,
  suggestZodiacSigns,
} from '@/modules/vocabulary';
import type { PageRequest } from '@/lib/types';
import { A, B, C, E, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertCupboardEntry } from '../../../support/db/insert-cupboard-entry';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { insertReference, insertReferenceLink } from '../../../support/db/insert-reference';
import { insertSpell } from '../../../support/db/insert-spell';
import {
  type IngredientFixture,
  type Overrides,
  makeIngredient,
  makeSpell,
} from '../../../support/fixtures';
import { useCompendiumEntryInput } from '../../../support/db/compendium-entry-input';

// The compendium's writes, which only the site admin makes whatever their standing in a coven (claude-docs/db/compendium-writes.md, "Compendium writes").
// The table is emptied per test, so every row a result could come from is one this file wrote.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const entry = useCompendiumEntryInput(() => sql);

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

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

// The site role is the one thing a compendium write turns on, so one non-admin
// stands for every one (claude-docs/testing/acting-as-fixture-users.md): an
// owner, whose workspace role is the highest and is still no site role.
const NON_ADMINS = [['an owner of a coven', A]] as const;
// Every other case calls as the site admin, E, so the curator alone stands
// here for the second role a compendium write admits.
const CURATORS = [['a curator', F]] as const;

const admin = asUser(E);

describe('createCompendiumEntry', () => {
  it.each(CURATORS)(
    'lets %s create one, in the compendium and stamped by them',
    async (_who, user) => {
      const created = await createCompendiumEntry(asUser(user), entry());

      expect(created).toMatchObject({
        workspaceId: null,
        name: 'Testwort',
        canonicalName: 'Fixtura testalis',
        nomenclature: 'botanical',
        createdBy: user.id,
        updatedBy: user.id,
        deletedAt: null,
      });
      expect(created.slug).toBe(ingredientSlug('Testwort', 'Fixtura testalis'));
    },
  );

  it('saves several elements, celestial bodies, signs and colours, each in the order entered', async () => {
    const created = await createCompendiumEntry(admin, {
      ...entry(),
      elements: ['spirit', 'air'],
      celestialBodies: ['Venus', 'Moon'],
      zodiacSigns: ['Taurus', 'Libra'],
      colors: ['Green', '', 'Pink'],
    });

    expect(await rowOf(created.id)).toMatchObject({
      elements: ['spirit', 'air'],
      celestial_bodies: ['Venus', 'Moon'],
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
    // Why the refusal could have been something else: the session the service
    // reads says `user`, where E's says `admin` and F's `curator`.
    expect(asUser(user).role).toBe('user');
    expect(admin.role).toBe('admin');
    expect(asUser(F).role).toBe('curator');

    await expect(createCompendiumEntry(asUser(user), entry())).rejects.toThrow(Forbidden);
    expect(await countIngredients()).toBe(0);
  });

  it('refuses a non-admin before reading the input, so a bad one earns the same refusal', async () => {
    await expect(
      createCompendiumEntry(asUser(B), { ...entry(), name: '   ' }),
    ).rejects.toBeInstanceOf(Forbidden);
  });

  it.each([['null', null]])(
    'refuses an entry whose nomenclature is %s, before it reaches the database',
    async (_how, nomenclature) => {
      const attempt = createCompendiumEntry(admin, {
        ...entry(),
        nomenclature,
      } as unknown as Parameters<typeof createCompendiumEntry>[1]);

      // A ValidationError on the field is the parse's: the column's NOT NULL
      // would have answered with a driver error instead.
      await expect(attempt).rejects.toThrow(ValidationError);
      await expect(attempt).rejects.toMatchObject({
        issues: [{ path: ['nomenclature'] }],
      });
      expect(await countIngredients()).toBe(0);
    },
  );

  it('ignores a workspaceId in the input, so the entry lands in the compendium', async () => {
    const input = { ...entry(), workspaceId: WORKSPACE_W_ID } as Parameters<
      typeof createCompendiumEntry
    >[1];

    const created = await createCompendiumEntry(admin, input);

    expect((await rowOf(created.id)).workspace_id).toBeNull();
  });
});

describe('updateCompendiumEntry', () => {
  it.each(CURATORS)(
    'lets %s rewrite it, stamping updated_by and keeping created_by',
    async (_who, user) => {
      const id = await seed();

      const updated = await updateCompendiumEntry(
        asUser(user),
        id,
        entry({ name: 'Testwort, relabelled' }),
      );

      expect(updated).toMatchObject({
        id,
        workspaceId: null,
        name: 'Testwort, relabelled',
        createdBy: A.id,
        updatedBy: user.id,
      });
    },
  );

  it('replaces the whole row, clearing a field the input leaves out', async () => {
    const id = await seed({ description: 'A fixture described' });

    await updateCompendiumEntry(admin, id, { ...entry(), description: undefined });

    expect((await rowOf(id)).description).toBeNull();
  });

  it('replaces each list whole, an empty one clearing it', async () => {
    const id = await seed({
      elements: ['water'],
      celestialBodies: ['Moon', 'Venus'],
      zodiacSigns: ['Cancer'],
      colors: ['Silver'],
    });

    await updateCompendiumEntry(admin, id, {
      ...entry(),
      elements: ['fire', 'water'],
      celestialBodies: ['Mars'],
      zodiacSigns: [],
      colors: ['White', 'Silver'],
    });

    expect(await rowOf(id)).toMatchObject({
      elements: ['fire', 'water'],
      celestial_bodies: ['Mars'],
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
});

describe('deleteCompendiumEntry', () => {
  it.each(CURATORS)(
    'lets %s soft-delete it, stamping deleted_by and keeping the row',
    async (_who, user) => {
      const id = await seed();

      await deleteCompendiumEntry(asUser(user), id);

      const row = await rowOf(id);
      expect(row).toMatchObject({ deleted_by: user.id, created_by: A.id });
      expect(row.deleted_at).toBeInstanceOf(Date);
    },
  );

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

// The number the delete confirm shows. Only a curator or admin may ask,
// and only of a compendium entry, because the count is a fact about covens.
describe('countCompendiumEntryUsers', () => {
  it.each(CURATORS)('answers how many covens hold the entry for %s', async (_who, user) => {
    const id = await seed();
    await insertCupboardEntry(sql, { workspaceId: WORKSPACE_W_ID, ingredientId: id }, A.id);

    expect(await countCompendiumEntryUsers(asUser(user), id)).toBe(1);
  });

  it.each(NON_ADMINS)(
    'refuses %s, though a coven holds the entry so the count would be 1',
    async (_who, user) => {
      const id = await seed();
      await insertCupboardEntry(sql, { workspaceId: WORKSPACE_W_ID, ingredientId: id }, A.id);
      // Why the refusal is the guard's: a curator reads that same 1.
      expect(await countCompendiumEntryUsers(asUser(E), id)).toBe(1);

      await expect(countCompendiumEntryUsers(asUser(user), id)).rejects.toThrow(Forbidden);
    },
  );

  it("answers NotFound for a coven's ingredient, a deleted entry, a missing id and a non-uuid", async () => {
    const own = await seed({ workspaceId: WORKSPACE_W_ID, nomenclature: 'none' });
    const gone = await seed({ name: 'Goneroot', canonicalName: 'Fixtura goneroot' });
    await deleteCompendiumEntry(asUser(E), gone);
    const admin = asUser(E);

    await expect(countCompendiumEntryUsers(admin, own)).rejects.toThrow(NotFound);
    await expect(countCompendiumEntryUsers(admin, gone)).rejects.toThrow(NotFound);
    await expect(
      countCompendiumEntryUsers(admin, '00000000-0000-4000-8000-000000000000'),
    ).rejects.toThrow(NotFound);
    await expect(countCompendiumEntryUsers(admin, 'not-a-uuid')).rejects.toThrow(NotFound);
  });
});

// Deleting, over the compendium: a deleted entry is gone from every
// read, and what it held is free again, while its row stays for a restore
// (claude-docs/db/compendium-writes.md, "Compendium writes").
describe('a deleted entry', () => {
  /** Room for every row a test here writes, so one page is the whole answer. */
  const PAGE: PageRequest = { limit: 26, inverted: false };
  const SLUG = 'testwort-fixtura-testalis';
  const MOVED_OFF = 'testwort-before-a-relabel';

  /** Whether `read` answers, rather than refusing with NotFound. */
  const answers = <T>(read: Promise<T>, shows: (answer: T) => boolean) =>
    read.then(shows, (error: unknown) => {
      if (error instanceof NotFound) return false;
      throw error;
    });

  const member = asUser(B);

  // Every exported read an entry reaches anyone through (signed out, and a coven member typing into a form) is asked whether it still shows this one.
  // That is what owns the soft-delete filter of each, so no reader carries a one-off of its own.
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
    // The fixture's own form.
    [
      'its variants',
      async (id) => {
        const [forms] = await variantsOf(null, [{ id, workspaceId: null }]);
        return Array.isArray(forms) && forms.length > 0;
      },
    ],
    // A new link cannot reach a deleted ingredient, as a new spell layer cannot.
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
        (await suggestForms(member, WORKSPACE_W_ID, 'testform', PAGE)).some(({ node }) =>
          node.claimants.some((claimant) => claimant.name === 'Testwort'),
        ),
    ],
    [
      "a coven's celestial body suggestions",
      async () =>
        (await suggestCelestialBodies(member, WORKSPACE_W_ID, 'fixture star', PAGE)).some(
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
      celestialBodies: ['Fixture Star'],
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

  // The partial index, through the service: without its `deleted_at IS NULL`, deleting an entry would reserve its identity for good.
  // It is tested on the formal name, since two live entries may share a label anyway, so a label coming back proves nothing about the index.
  it('frees its formal name for a new entry under another label', async () => {
    const id = await seed();
    const again = entry({ name: 'Fixture Leaf' });
    // Why the write could only go through by the delete: while the entry is
    // live, the identity index refuses it, and on nothing but the formal name.
    await expect(createCompendiumEntry(admin, again)).rejects.toMatchObject({
      issues: [{ path: ['canonicalName'] }],
    });

    await deleteCompendiumEntry(admin, id);
    const created = await createCompendiumEntry(admin, again);

    expect(created).toMatchObject({ name: 'Fixture Leaf', canonicalName: 'Fixtura testalis' });
    const keys = await sql`
      select distinct identity_key from ingredients where id in ${sql([id, created.id])}`;
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

  // A spell is a recipe: what went into the jar stays in it
  // (claude-docs/db/spell-visibility.md, "What a spell holds").
  it('stays in a spell that holds it, for every member who may read the spell', async () => {
    const id = await seed();
    await insertSpell(sql, makeSpell({ steps: [{ ingredientId: id }] }), B.id);

    await deleteCompendiumEntry(admin, id);

    // Why only the spell could still answer it: the entry's own read has let it go.
    await expect(getIngredient(null, id)).rejects.toThrow(NotFound);
    const viewer = await assertMembership(asUser(C), WORKSPACE_W_ID, { spell: ['read'] });
    await expect(findIngredientsInSpellsIncludingSoftDeleted(viewer, [id])).resolves.toEqual([
      expect.objectContaining({ id, deletedBy: E.id }),
    ]);
  });

  // A layer is the spell's, and leaves it only when a member takes it out.
  it('leaves every layer holding it as it was', async () => {
    const id = await seed();
    const spellId = await insertSpell(sql, makeSpell({ steps: [{ ingredientId: id }] }), B.id);
    const layerOf = async () => {
      const [layer] = await sql`select * from spell_steps where spell_id = ${spellId}`;
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
          message: expect.stringContaining('Fixture Leaf'),
        },
      ],
    });
  });
});

// The shown flag rides in the entry's own create and update, so a modal saves both in one write.
describe('the shown flag on the compendium entry writes', () => {
  const shownOf = async (id: string) => {
    const [row] = await sql<{ shown: boolean }[]>`select shown from ingredients where id = ${id}`;
    return row.shown;
  };
  const admin = () => asUser(E);

  it('a create stores the shown it is given, and is shown when it gives none', async () => {
    const hidden = await createCompendiumEntry(admin(), { ...entry(), shown: false });
    expect(await shownOf(hidden.id)).toBe(false);

    const left = await createCompendiumEntry(admin(), {
      ...entry({ name: 'Mockwort', canonicalName: 'Mocka testalis' }),
    });
    expect(await shownOf(left.id)).toBe(true);
  });

  it('an update stores the shown it is given, and leaves the flag when it gives none', async () => {
    const created = await createCompendiumEntry(admin(), entry());
    // Why the assertions below mean something: the entry starts shown.
    expect(await shownOf(created.id)).toBe(true);

    await updateCompendiumEntry(admin(), created.id, { ...entry(), shown: false });
    expect(await shownOf(created.id)).toBe(false);

    await updateCompendiumEntry(admin(), created.id, { ...entry(), description: 'Changed' });
    expect(await shownOf(created.id)).toBe(false);

    await updateCompendiumEntry(admin(), created.id, { ...entry(), shown: true });
    expect(await shownOf(created.id)).toBe(true);
  });
});
