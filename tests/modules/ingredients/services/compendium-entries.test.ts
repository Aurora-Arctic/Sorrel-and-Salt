import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { Forbidden, NotFound, ValidationError } from '@/lib/errors';
import { ingredientSlug } from '@/lib/slugify';
import {
  createCompendiumEntry,
  deleteCompendiumEntry,
  getWorkspaceIngredient,
  resolveCompendiumSlug,
  updateCompendiumEntry,
} from '@/modules/ingredients';
import type { CompendiumIngredientInput } from '@/modules/ingredients/validation/ingredient';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { type IngredientFixture, type Overrides, makeIngredient } from '../../../support/fixtures';

// Story 17's service: the compendium's writes, which the site admin makes and
// nobody else does, whatever their standing in a coven (claude-docs/db.md,
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

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

/** The fixture as the service's input: everything but the tier and the category names. */
function inputOf(fixture: IngredientFixture): CompendiumIngredientInput {
  const { workspaceId: _tier, categories: _categories, ...input } = fixture;
  return input;
}

const entry = (overrides: Overrides<IngredientFixture> = {}) => inputOf(makeIngredient(overrides));

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
      form: 'herb',
      createdBy: E.id,
      updatedBy: E.id,
      deletedAt: null,
    });
    expect(created.slug).toBe(ingredientSlug('Testwort', 'herb', 'Fixtura testalis'));
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
          { path: ['nomenclature'], message: 'Choose a naming system — or "none" or "unknown"' },
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

// MB.82's rule (claude-docs/db.md, "Ingredient slugs"): the address follows the
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

    const taker = entry({ name: 'Testdirt', nomenclature: 'none', form: 'earth' });

    it('refuses a create that would end its redirect, on `endRedirect`, writing nothing', async () => {
      const issues = await issuesOf(createCompendiumEntry(admin, taker));

      expect(issues).toEqual([
        {
          path: ['endRedirect'],
          message:
            '"testdirt-earth" redirects to "Testsoil" (earth) until 28 August 2026, 00:00 UTC — confirm to end that redirect',
        },
      ]);
      expect(await countIngredients()).toBe(1);
    });

    it('refuses a rename into it the same way, leaving the row as it was', async () => {
      const id = await seed({ name: 'Testclay', nomenclature: 'none', form: 'earth' });
      const before = await rowOf(id);

      const [issue] = await issuesOf(updateCompendiumEntry(admin, id, taker));

      expect(issue.path).toEqual(['endRedirect']);
      expect(await rowOf(id)).toEqual(before);
    });

    it('lets a confirmed write take it, keeping the retirement that says where the old entry went', async () => {
      const created = await createCompendiumEntry(admin, { ...taker, endRedirect: true });

      expect(created.slug).toBe('testdirt-earth');
      expect((await retirements()).map((row) => row.ingredient_id)).toEqual([movedId]);
    });

    it('answers the new entry there, naming the one that moved, until the window closes', async () => {
      const created = await createCompendiumEntry(admin, { ...taker, endRedirect: true });

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

      await expect(createCompendiumEntry(admin, taker)).resolves.toMatchObject({
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

describe('resolveCompendiumSlug', () => {
  const NOW = new Date('2026-03-01T12:00:00.000Z');
  const EXPIRES = new Date('2026-08-28T00:00:00.000Z');

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('answers the entry at its slug, with no session and no moved-away entry', async () => {
    const id = await seed();

    await expect(resolveCompendiumSlug('testwort-herb-fixtura-testalis')).resolves.toEqual({
      kind: 'entry',
      entry: expect.objectContaining({ id }),
      movedAway: null,
    });
  });

  it('answers a slug an entry moved off with its current slug, until expires_at and not from it', async () => {
    const id = await seed();
    await updateCompendiumEntry(admin, id, entry({ name: 'Testwort, relabelled' }));

    vi.setSystemTime(new Date(EXPIRES.getTime() - 1));
    await expect(resolveCompendiumSlug('testwort-herb-fixtura-testalis')).resolves.toEqual({
      kind: 'moved',
      slug: 'testwort-relabelled-herb-fixtura-testalis',
    });

    vi.setSystemTime(EXPIRES);
    await expect(resolveCompendiumSlug('testwort-herb-fixtura-testalis')).rejects.toThrow(NotFound);
  });

  it("answers NotFound for a coven's slug — its existence is private — and for one that names nothing", async () => {
    const localId = await seed({ workspaceId: WORKSPACE_W_ID });
    // Why the coven's could have answered: the row is there, at that slug.
    expect((await rowOf(localId)).slug).toBe('testwort-herb-fixtura-testalis');

    await expect(resolveCompendiumSlug('testwort-herb-fixtura-testalis')).rejects.toThrow(NotFound);
    await expect(resolveCompendiumSlug('nothing-here')).rejects.toThrow(NotFound);
  });
});
