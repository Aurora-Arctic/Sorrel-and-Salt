import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { Forbidden, NotFound } from '@/lib/errors';
import {
  compendiumFacets,
  countCompendium,
  getIngredient,
  listCompendium,
  listCompendiumSlugs,
  listWorkspaceIngredients,
  readCompendiumEntry,
  resolveCompendiumSlug,
  setCompendiumEntryShown,
  suggestIngredients,
} from '@/modules/ingredients';
import { resolvePage } from '@/lib/pagination';
import { A, B, E, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertCupboardEntry } from '../../../support/db/insert-cupboard-entry';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { makeIngredient } from '../../../support/fixtures';

// A hidden compendium entry is left out of every public read in SQL, and still seen by a curator who asks, by an admin screen and by a coven whose cupboard names it.
// The table is emptied per test, so every row read back is one this file wrote.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  await sql`truncate retired_ingredient_slugs`;
});

const PAGE = { limit: 50, inverted: false } as const;

/** Two compendium entries by invented names; the second is hidden. */
async function seeded() {
  const shown = await insertIngredient(
    sql,
    makeIngredient({
      workspaceId: null,
      name: 'Shownwort',
      nomenclature: 'none',
      canonicalName: null,
    }),
    A.id,
  );
  const hidden = await insertIngredient(
    sql,
    makeIngredient({
      workspaceId: null,
      name: 'Hiddenwort',
      nomenclature: 'none',
      canonicalName: null,
    }),
    A.id,
  );
  await setCompendiumEntryShown(asUser(F), hidden, false);
  const [{ slug }] = await sql<
    { slug: string }[]
  >`select slug from ingredients where id = ${hidden}`;
  return { shown, hidden, slug };
}

const idsOf = (page: Awaited<ReturnType<typeof listCompendium>>) => page.map(({ node }) => node.id);

describe('the public compendium reads', () => {
  it('leave a hidden entry out of the list, its count and its facet counts', async () => {
    const { shown, hidden } = await seeded();
    // Precondition: the row exists, is live and is hidden.
    const [row] = await sql`select shown, deleted_at from ingredients where id = ${hidden}`;
    expect(row).toMatchObject({ shown: false, deleted_at: null });

    expect(idsOf(await listCompendium({}, PAGE))).toEqual([shown]);
    expect((await countCompendium({}, undefined)).totalCount).toBe(1);
    expect((await compendiumFacets({})).withoutReferences).toBe(1);
  });

  it('leave it out of a search by its own name', async () => {
    await seeded();
    expect(idsOf(await listCompendium({ query: 'Hiddenwort' }, PAGE))).toEqual([]);
  });

  it('give a hidden slug NotFound, an old address of it too', async () => {
    const { hidden, slug } = await seeded();
    await sql`insert into retired_ingredient_slugs (ingredient_id, slug, created_by, updated_by)
      values (${hidden}, 'old-hiddenwort', ${A.id}, ${A.id})`;
    await expect(readCompendiumEntry(slug)).rejects.toBeInstanceOf(NotFound);
    await expect(resolveCompendiumSlug(slug)).rejects.toBeInstanceOf(NotFound);
    await expect(readCompendiumEntry('old-hiddenwort')).rejects.toBeInstanceOf(NotFound);
    // Why it could have answered: a curator's read finds the entry at that very slug.
    await expect(resolveCompendiumSlug(slug, asUser(F))).resolves.toMatchObject({ kind: 'entry' });
  });

  it('leave it out of the sitemap, llms.txt and well-known address list', async () => {
    const { slug } = await seeded();
    const slugs = (await listCompendiumSlugs()).map((entry) => entry.slug);
    expect(slugs).toHaveLength(1);
    expect(slugs).not.toContain(slug);
  });

  it('give a signed-out visitor NotFound for the hidden id', async () => {
    const { hidden, shown } = await seeded();
    await expect(getIngredient(null, hidden)).rejects.toBeInstanceOf(NotFound);
    await expect(getIngredient(asUser(B), hidden)).rejects.toBeInstanceOf(NotFound);
    // Why it could have answered: the shown entry reads by id for the same visitor.
    await expect(getIngredient(null, shown)).resolves.toMatchObject({ id: shown });
  });

  it('leave it out of the substitute picker', async () => {
    await seeded();
    const rows = await suggestIngredients(asUser(A), WORKSPACE_W_ID, 'wort', PAGE);
    expect(rows.map(({ node }) => node.name)).toEqual(['Shownwort']);
  });
});

describe('the listing filter', () => {
  it.each([
    ['a curator', F],
    ['an admin', E],
  ])('lets %s read the hidden entries, or all of them', async (_who, user) => {
    const { shown, hidden } = await seeded();
    expect(idsOf(await listCompendium({ listing: 'hidden' }, PAGE, asUser(user)))).toEqual([
      hidden,
    ]);
    expect(idsOf(await listCompendium({ listing: 'all' }, PAGE, asUser(user))).sort()).toEqual(
      [shown, hidden].sort(),
    );
    expect((await countCompendium({ listing: 'all' }, undefined, asUser(user))).totalCount).toBe(2);
    expect((await compendiumFacets({ listing: 'all' }, asUser(user))).withoutReferences).toBe(2);
    await expect(getIngredient(asUser(user), hidden)).resolves.toMatchObject({ id: hidden });
  });

  it.each([
    ['a signed-out visitor', null],
    ['an owner of a coven (A)', asUser(A)],
    ['a member of a coven (B)', asUser(B)],
  ])('refuses %s', async (_who, viewer) => {
    await seeded();
    await expect(listCompendium({ listing: 'all' }, PAGE, viewer)).rejects.toBeInstanceOf(
      Forbidden,
    );
    await expect(listCompendium({ listing: 'hidden' }, PAGE, viewer)).rejects.toBeInstanceOf(
      Forbidden,
    );
    await expect(countCompendium({ listing: 'all' }, undefined, viewer)).rejects.toBeInstanceOf(
      Forbidden,
    );
    await expect(compendiumFacets({ listing: 'all' }, viewer)).rejects.toBeInstanceOf(Forbidden);
    // Why it could have answered: the same read with the default setting succeeds for them.
    await expect(listCompendium({}, PAGE, viewer)).resolves.toHaveLength(1);
  });
});

describe('a coven that holds a hidden entry', () => {
  it('still lists it, reads it by id and finds it in the picker', async () => {
    const { hidden } = await seeded();
    // Why it must stay: the cupboard names it, and the compendium no longer lists it.
    await insertCupboardEntry(sql, { workspaceId: WORKSPACE_W_ID, ingredientId: hidden }, A.id);
    expect(idsOf(await listCompendium({}, PAGE))).not.toContain(hidden);

    const page = await resolvePage({ first: 50 }, (request) =>
      listWorkspaceIngredients(asUser(B), WORKSPACE_W_ID, {}, request),
    );
    expect(page.edges.map(({ node }) => node.id)).toContain(hidden);
    await expect(getIngredient(asUser(B), hidden, WORKSPACE_W_ID)).resolves.toMatchObject({
      id: hidden,
    });
    const rows = await suggestIngredients(asUser(B), WORKSPACE_W_ID, 'Hiddenwort', PAGE);
    expect(rows.map(({ node }) => node.id)).toContain(hidden);
  });
});
