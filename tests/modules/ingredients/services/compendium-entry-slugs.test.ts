import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { NotFound, ValidationError } from '@/lib/errors';
import { ingredientSlug } from '@/lib/slugify';
import {
  createCompendiumEntry,
  resolveCompendiumSlug,
  updateCompendiumEntry,
} from '@/modules/ingredients';
import { A, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { liveFormsOf } from '../../../support/db/read-variants';
import {
  type IngredientFixture,
  type Overrides,
  makeIngredient,
  makeVariant,
} from '../../../support/fixtures';
import { useCompendiumEntryInput } from '../../../support/db/compendium-entry-input';

// The compendium service, its identity half: the compendium's unique indexes met as field errors, the slug an entry's label and formal name give it, and the redirect a moved slug leaves (claude-docs/db/ingredient-slugs.md).
// Split from compendium-entries.test.ts, which holds the writes. The table is emptied per test, so every row a result could come from is one this file wrote.

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

const admin = asUser(E);

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

  // One formal name is one entry, so an oil beside its form is a form
  // of it, not a second entry. Under the same label, the address index
  // breaks first, and the refusal is still the formal name's.
  it('refuses a second entry under a formal name the compendium holds, whatever its form, on `canonicalName`, naming the entry', async () => {
    await seed();
    // Why it could have been admitted: Oil is a curated pick, so no vocabulary
    // rule refuses it, and a differing form is not another identity.
    const oil = entry({ variants: [makeVariant({ form: 'Oil' })] });
    expect(oil.variants?.[0].formId).toEqual(expect.any(String));

    const issues = await issuesOf(createCompendiumEntry(admin, oil));

    expect(issues).toEqual([
      {
        path: ['canonicalName'],
        message: expect.stringContaining('Testwort'),
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
        message: expect.stringContaining('Testwort'),
      },
    ]);
  });

  it("refuses a rewrite onto another entry's identity, leaving the row as it was", async () => {
    await seed({ name: 'Testwort' });
    // Another formal name: one formal name is one entry per tier.
    const id = await seed({ name: 'Testwort', canonicalName: 'Fixtura alteralis' });
    const before = await rowOf(id);

    const issues = await issuesOf(updateCompendiumEntry(admin, id, entry({ name: 'Testleaf' })));

    expect(issues).toEqual([{ path: ['canonicalName'], message: expect.any(String) }]);
    expect(await rowOf(id)).toEqual(before);
  });

  it('names no entry when the holder is gone by the time it is read, rather than surfacing the raw error', async () => {
    await seed();
    repository.findCompendiumEntryByIdentity.mockResolvedValueOnce(undefined);

    expect(await issuesOf(createCompendiumEntry(admin, entry({ name: 'Fixture Leaf' })))).toEqual([
      { path: ['canonicalName'], message: expect.not.stringContaining('Testwort') },
    ]);
  });

  it('refuses a name whose address another entry already has, on `name`', async () => {
    await seed({ name: 'Testwort', nomenclature: 'unknown', canonicalName: 'Fixtura root' });

    // Why only the slug index is left to catch it: label and identity both differ.
    expect(ingredientSlug('Testwort Fixtura', 'Root')).toBe(
      ingredientSlug('Testwort', 'Fixtura root'),
    );

    expect(
      await issuesOf(
        createCompendiumEntry(
          admin,
          entry({ name: 'Testwort Fixtura', nomenclature: 'unknown', canonicalName: 'Root' }),
        ),
      ),
    ).toEqual([{ path: ['name'], message: expect.any(String) }]);
  });

  // The identity holder looked up on an address collision is the entry itself
  // when the update keeps its formal name, and is no collision of its own.
  it("refuses a relabel onto another entry's address on `name`, though its own formal name is held, by itself", async () => {
    await seed({ name: 'Testwort', nomenclature: 'unknown', canonicalName: 'Fixtura root' });
    const id = await seed({ name: 'Testleaf', nomenclature: 'unknown', canonicalName: 'Root' });

    const issues = await issuesOf(
      updateCompendiumEntry(
        admin,
        id,
        entry({ name: 'Testwort Fixtura', nomenclature: 'unknown', canonicalName: 'Root' }),
      ),
    );

    expect(issues).toEqual([{ path: ['name'], message: expect.any(String) }]);
    expect((await rowOf(id)).name).toBe('Testleaf');
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

// The slug rule (claude-docs/db/ingredient-slugs.md, "Ingredient slugs"): the address follows the label and the formal name, never the form; the one it leaves redirects to the entry for 180 days.
// A write that would take another entry's redirected address ends that redirect only once the admin confirms it. The clock is pinned, so every window below is exact.
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
    ['label', { name: 'Testwort, relabelled' }, 'testwort-relabelled-fixtura-testalis'],
    ['formal name', { canonicalName: 'Fixtura altera' }, 'testwort-fixtura-altera'],
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
          slug: 'testwort-fixtura-testalis',
          retired_at: NOW,
          expires_at: EXPIRES,
          created_by: E.id,
        },
      ]);
    },
  );

  it('stays put, retiring nothing, when neither changes, a form change included', async () => {
    const id = await seed();

    const updated = await updateCompendiumEntry(
      admin,
      id,
      entry({ description: 'Redescribed', variants: [makeVariant({ form: 'Root' })] }),
    );

    expect(updated.slug).toBe('testwort-fixtura-testalis');
    // Why the form did change: the entry's one form is Root now.
    expect(await liveFormsOf(sql, id)).toEqual(['Root']);
    expect(await retirements()).toEqual([]);
  });

  // No SQL rewrites a slug, so a row saved before keeps its form in
  // the address until its own next save, which moves it and retires the old.
  it('moves a form-bearing slug on the next save, the old one redirecting to the entry', async () => {
    const id = await seed();
    await sql`update ingredients set slug = 'testwort-herb-fixtura-testalis' where id = ${id}`;
    // Why it is still there: nothing but a save moves it.
    await expect(resolveCompendiumSlug('testwort-herb-fixtura-testalis')).resolves.toMatchObject({
      kind: 'entry',
      entry: { id },
    });

    const updated = await updateCompendiumEntry(admin, id, entry({ description: 'Redescribed' }));

    expect(updated.slug).toBe('testwort-fixtura-testalis');
    await expect(resolveCompendiumSlug('testwort-herb-fixtura-testalis')).resolves.toEqual({
      kind: 'moved',
      slug: 'testwort-fixtura-testalis',
    });
  });

  it('takes its own old slug back at once, without a confirmation', async () => {
    const id = await seed();
    await updateCompendiumEntry(admin, id, entry({ name: 'Testwort, relabelled' }));

    const back = await updateCompendiumEntry(admin, id, entry());

    expect(back.slug).toBe('testwort-fixtura-testalis');
  });

  describe('an address another entry moved off, inside its window', () => {
    let movedId: string;

    // Graveyard-dirt-shaped: no formal name, so the relabel frees the identity
    // and a new entry may spell the old address.
    beforeEach(async () => {
      movedId = await seed({ name: 'Testdirt', nomenclature: 'none' });
      await updateCompendiumEntry(
        admin,
        movedId,
        entry({ name: 'Testsoil', nomenclature: 'none' }),
      );
    });

    const taker = () => entry({ name: 'Testdirt', nomenclature: 'none' });

    it('refuses a create that would end its redirect, on `endRedirect`, writing nothing', async () => {
      const issues = await issuesOf(createCompendiumEntry(admin, taker()));

      expect(issues).toEqual([{ path: ['endRedirect'], message: expect.any(String) }]);
      expect(await countIngredients()).toBe(1);
    });

    it('refuses a rename into it the same way, leaving the row as it was', async () => {
      const id = await seed({ name: 'Testclay', nomenclature: 'none' });
      const before = await rowOf(id);

      const [issue] = await issuesOf(updateCompendiumEntry(admin, id, taker()));

      expect(issue.path).toEqual(['endRedirect']);
      expect(await rowOf(id)).toEqual(before);
    });

    it('lets a confirmed write take it, keeping the retirement that says where the old entry went', async () => {
      const created = await createCompendiumEntry(admin, { ...taker(), endRedirect: true });

      expect(created.slug).toBe('testdirt');
      expect((await retirements()).map((row) => row.ingredient_id)).toEqual([movedId]);
    });

    it('answers the new entry there, naming the one that moved, until the window closes', async () => {
      const created = await createCompendiumEntry(admin, { ...taker(), endRedirect: true });

      await expect(resolveCompendiumSlug('testdirt')).resolves.toEqual({
        kind: 'entry',
        entry: expect.objectContaining({ id: created.id }),
        movedAway: expect.objectContaining({ id: movedId, slug: 'testsoil' }),
      });

      vi.setSystemTime(EXPIRES);
      await expect(resolveCompendiumSlug('testdirt')).resolves.toMatchObject({
        kind: 'entry',
        movedAway: null,
      });
    });

    it('asks nothing once the window has closed', async () => {
      vi.setSystemTime(EXPIRES);

      await expect(createCompendiumEntry(admin, taker())).resolves.toMatchObject({
        slug: 'testdirt',
      });
    });
  });

  it("refuses a rewrite onto another entry's current address, on `name`, naming it", async () => {
    await seed({ name: 'Testwort', nomenclature: 'unknown', canonicalName: 'Fixtura root' });
    const id = await seed({ name: 'Testleaf', nomenclature: 'none' });

    expect(
      await issuesOf(
        updateCompendiumEntry(
          admin,
          id,
          entry({ name: 'Testwort Fixtura', nomenclature: 'unknown', canonicalName: 'Root' }),
        ),
      ),
    ).toEqual([{ path: ['name'], message: expect.stringContaining('Testwort') }]);
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

// The redirect's window and what a retirement answers are tests/db/repository/slugs.test.ts's (findCompendiumSlugRedirect), and the service's answer for a moved slug is the 'the address it moved off' row of the READS table in compendium-entries.test.ts.
// What stays here is the entry, and a coven's slug kept private.
describe('resolveCompendiumSlug', () => {
  it('answers the entry at its slug, with no session and no moved-away entry', async () => {
    const id = await seed();

    await expect(resolveCompendiumSlug('testwort-fixtura-testalis')).resolves.toEqual({
      kind: 'entry',
      entry: expect.objectContaining({ id }),
      movedAway: null,
    });
  });

  it("answers NotFound for a coven's slug — its existence is private — and for one that names nothing", async () => {
    const localId = await seed({ workspaceId: WORKSPACE_W_ID });
    // Why the coven's could have answered: the row is there, at that slug.
    expect((await rowOf(localId)).slug).toBe('testwort-fixtura-testalis');

    await expect(resolveCompendiumSlug('testwort-fixtura-testalis')).rejects.toThrow(NotFound);
    await expect(resolveCompendiumSlug('nothing-here')).rejects.toThrow(NotFound);
  });
});
