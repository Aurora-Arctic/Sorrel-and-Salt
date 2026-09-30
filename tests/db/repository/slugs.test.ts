import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { findCompendiumEntryBySlug, findCompendiumSlugRedirect, withAudit } from '@/db/repository';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { assertSiteAdmin } from '@/modules/identity';
import { A, E, asUser } from '../../support/as-user';
import { insertIngredient } from '../../support/db/insert-ingredient';
import { makeIngredient } from '../../support/fixtures';

// The compendium's addresses (claude-docs/db.md, "Ingredient slugs"): the
// entry at a slug, and a slug an entry moved off, which redirects to it until
// the retirement's `expires_at` — midnight UTC of the retirement's date, plus
// 180 days. Every instant below is UTC; the columns are `timestamp` holding UTC.

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string);
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

const add = (name: string, overrides: Parameters<typeof makeIngredient>[0] = {}) =>
  insertIngredient(
    sql,
    makeIngredient({ name, nomenclature: 'none', form: null, ...overrides }),
    A.id,
  );

/** A retirement written by the raw client, as the entry's own scope holds it. */
async function retire(
  ingredientId: string,
  slug: string,
  retiredAt: Date,
  workspaceId: string | null = null,
) {
  await sql`
    insert into retired_ingredient_slugs ${sql({
      ingredient_id: ingredientId,
      workspace_id: workspaceId,
      slug,
      retired_at: retiredAt,
      created_by: A.id,
      updated_by: A.id,
    })}`;
}

const RETIRED = new Date('2026-03-01T23:59:59.999Z');
// Midnight of 1 March, plus 180 days.
const EXPIRES = new Date('2026-08-28T00:00:00.000Z');
const INSIDE = new Date(EXPIRES.getTime() - 1);

describe('findCompendiumEntryBySlug', () => {
  it('answers the live compendium entry holding the slug', async () => {
    const id = await add('Testwort');

    await expect(findCompendiumEntryBySlug('testwort')).resolves.toMatchObject({ id });
  });

  it("answers nothing for a coven's slug, or a soft-deleted entry's", async () => {
    const localId = await add('Testleaf', { workspaceId: WORKSPACE_W_ID });
    const deletedId = await add('Testroot');
    await sql`update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${deletedId}`;
    // Why either could have answered: each row holds its slug.
    const slugs = await sql`select slug from ingredients where id in (${localId}, ${deletedId})`;
    expect(slugs.map((row) => row.slug).sort()).toEqual(['testleaf', 'testroot']);

    await expect(findCompendiumEntryBySlug('testleaf')).resolves.toBeUndefined();
    await expect(findCompendiumEntryBySlug('testroot')).resolves.toBeUndefined();
  });
});

describe('findCompendiumSlugRedirect', () => {
  let movedId: string;

  beforeEach(async () => {
    movedId = await add('Testwort, relabelled');
    await retire(movedId, 'testwort', RETIRED);
  });

  it('expires at midnight UTC of the retirement date plus 180 days, whatever the hour', async () => {
    const [row] = await sql`select expires_at from retired_ingredient_slugs`;
    expect((row.expires_at as Date).toISOString()).toBe(EXPIRES.toISOString());
  });

  it('answers the entry, at its current slug, until expires_at and not from it', async () => {
    await expect(findCompendiumSlugRedirect('testwort', INSIDE)).resolves.toMatchObject({
      entry: { id: movedId, slug: 'testwort-relabelled' },
      expiresAt: EXPIRES,
    });
    await expect(findCompendiumSlugRedirect('testwort', EXPIRES)).resolves.toBeUndefined();
  });

  // Either side of midnight: a retirement a millisecond later is a day later.
  it('keeps a slug retired just after midnight a day longer', async () => {
    const laterId = await add('Testleaf, relabelled');
    await retire(laterId, 'testleaf', new Date('2026-03-02T00:00:00.000Z'));

    await expect(findCompendiumSlugRedirect('testleaf', EXPIRES)).resolves.toMatchObject({
      entry: { id: laterId },
      expiresAt: new Date('2026-08-29T00:00:00.000Z'),
    });
  });

  it('answers nothing once the entry is soft-deleted', async () => {
    await sql`update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${movedId}`;

    await expect(findCompendiumSlugRedirect('testwort', INSIDE)).resolves.toBeUndefined();
  });

  it('answers nothing while the entry holds the slug again', async () => {
    await sql`update ingredients set slug = 'testwort' where id = ${movedId}`;

    await expect(findCompendiumSlugRedirect('testwort', INSIDE)).resolves.toBeUndefined();
  });

  // Another entry at the slug is what the address answers, so nothing redirects from it.
  it('answers nothing while another entry holds the slug, unless that entry is the one left out', async () => {
    const holderId = await add('Testwort');

    await expect(findCompendiumSlugRedirect('testwort', INSIDE)).resolves.toBeUndefined();
    await expect(findCompendiumSlugRedirect('testwort', INSIDE, holderId)).resolves.toMatchObject({
      entry: { id: movedId },
    });
  });

  it("answers nothing for a coven's retirement, whose tier is not the compendium's", async () => {
    const localId = await add('Testleaf, relabelled', { workspaceId: WORKSPACE_W_ID });
    await retire(localId, 'testleaf', RETIRED, WORKSPACE_W_ID);

    await expect(findCompendiumSlugRedirect('testleaf', INSIDE)).resolves.toBeUndefined();
  });

  it('leaves out the entry it is told to, as a write asks about everyone but itself', async () => {
    await expect(findCompendiumSlugRedirect('testwort', INSIDE, movedId)).resolves.toBeUndefined();
  });

  it('answers the latest of two entries that moved off the same slug', async () => {
    const laterId = await add('Testwort, again');
    await retire(laterId, 'testwort', new Date('2026-04-01T12:00:00.000Z'));

    await expect(findCompendiumSlugRedirect('testwort', INSIDE)).resolves.toMatchObject({
      entry: { id: laterId },
    });
  });
});

describe('write.deleteLapsedSlugRetirements', () => {
  it('hard-deletes the compendium retirements lapsed at the instant given, and no other', async () => {
    const entryId = await add('Testwort, relabelled');
    const localId = await add('Testleaf, relabelled', { workspaceId: WORKSPACE_W_ID });
    await retire(entryId, 'testwort', RETIRED);
    await retire(entryId, 'testwort-later', new Date('2026-03-02T00:00:00.000Z'));
    await retire(localId, 'testleaf', RETIRED, WORKSPACE_W_ID);
    const admin = assertSiteAdmin(asUser(E));

    const deleted = await withAudit(asUser(E), (write) =>
      write.deleteLapsedSlugRetirements(admin, EXPIRES),
    );

    expect(deleted.map((row) => row.slug)).toEqual(['testwort']);
    const left = await sql`select slug from retired_ingredient_slugs order by slug`;
    expect(left.map((row) => row.slug)).toEqual(['testleaf', 'testwort-later']);
  });
});
